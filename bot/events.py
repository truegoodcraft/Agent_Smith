"""
bot/events.py
=============
Discord event handlers — primarily `on_message` for conversational chat.

How multi-turn context works:
- Each channel (or DM) has its own conversation history stored in a dict
  keyed by channel ID.
- History is capped at MAX_CONTEXT_PAIRS (user+assistant pairs) so we don't
  send infinite tokens to Ollama.
- Context is in-memory only; a bot restart clears it.  Use /reset to clear
  it manually at any time.

Streaming to Discord:
- We start with a "thinking…" placeholder, then stream Ollama tokens and
  progressively edit the message every time we accumulate enough new text.
  This gives a live typing effect without hammering the Discord API.
"""
from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Dict, List

import discord
from discord.ext import commands

from config.settings import settings
from ollama.client import OllamaClient, OllamaError
from utils.formatting import split_message
from utils.logger import get_logger
from utils.rate_limiter import RateLimiter
from bot.permissions import is_channel_allowed, is_user_allowed

log = get_logger(__name__)

# How many characters to accumulate before editing the Discord message
_STREAM_EDIT_THRESHOLD = 50


class ChatCog(commands.Cog):
    """Handles all incoming messages and routes them to Ollama."""

    def __init__(self, bot: commands.Bot, ollama: OllamaClient) -> None:
        self.bot = bot
        self.ollama = ollama
        self.rate_limiter = RateLimiter(
            max_requests=settings.RATE_LIMIT_REQUESTS,
            window_seconds=settings.RATE_LIMIT_WINDOW,
        )
        # channel_id → list of {"role": ..., "content": ...}
        self._history: Dict[int, List[dict]] = defaultdict(list)

    def get_history(self, channel_id: int) -> List[dict]:
        """Return the conversation history for a channel."""
        return self._history[channel_id]

    def reset_history(self, channel_id: int) -> None:
        """Clear the conversation history for a channel."""
        self._history[channel_id] = []
        log.info("Cleared history for channel %d.", channel_id)

    def _trim_history(self, channel_id: int) -> None:
        """Keep only the most recent MAX_CONTEXT_PAIRS user+assistant pairs."""
        history = self._history[channel_id]
        max_messages = settings.MAX_CONTEXT_PAIRS * 2
        if len(history) > max_messages:
            self._history[channel_id] = history[-max_messages:]

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message) -> None:
        """Route every non-command message to the Ollama model."""
        # Ignore the bot's own messages
        if message.author == self.bot.user:
            return

        # Permissions
        if not is_channel_allowed(message.channel):  # type: ignore[arg-type]
            return
        if not is_user_allowed(message.author):  # type: ignore[arg-type]
            return

        # Skip messages that start with the command prefix (handled by commands)
        if message.content.startswith(settings.COMMAND_PREFIX):
            return

        # Skip empty messages
        content = message.content.strip()
        if not content:
            return

        # Rate limiting
        user_key = str(message.author.id)
        if not self.rate_limiter.is_allowed(user_key):
            wait = self.rate_limiter.retry_after(user_key)
            await message.reply(
                f"⏳ You're sending messages too fast. Please wait **{wait:.0f}s**.",
                mention_author=False,
            )
            return

        log.info(
            "Message from %s in channel %s: %s",
            message.author,
            message.channel,
            content[:80],
        )

        # Build context
        channel_id = message.channel.id
        self._history[channel_id].append({"role": "user", "content": content})
        self._trim_history(channel_id)

        # Send a placeholder while we wait for the model
        async with message.channel.typing():
            reply_msg = await message.reply("💭 *Thinking…*", mention_author=False)

        # Stream the response
        accumulated = ""
        last_edit_len = 0

        try:
            async for token in self.ollama.chat_stream(self._history[channel_id]):
                accumulated += token

                # Edit the Discord message periodically to show live output
                if len(accumulated) - last_edit_len >= _STREAM_EDIT_THRESHOLD:
                    preview = split_message(accumulated)[0]  # first chunk preview
                    try:
                        await reply_msg.edit(content=preview)
                        last_edit_len = len(accumulated)
                    except discord.HTTPException:
                        pass  # not critical if edit fails mid-stream

        except OllamaError as exc:
            log.error("Ollama error: %s", exc)
            await reply_msg.edit(
                content=f"❌ **Ollama error:** {exc}\n"
                "Make sure Ollama is running and the model is available."
            )
            # Remove the failed user message from history
            self._history[channel_id].pop()
            return

        # Finalize: split response if > 2000 chars and send all chunks
        if not accumulated:
            accumulated = "*(no response)*"

        chunks = split_message(accumulated)

        # Edit the placeholder with the first chunk
        try:
            await reply_msg.edit(content=chunks[0])
        except discord.HTTPException as exc:
            log.warning("Could not edit reply: %s", exc)

        # Send any overflow chunks as follow-up messages
        for chunk in chunks[1:]:
            await asyncio.sleep(0.3)  # small delay to avoid rate limits
            await message.channel.send(chunk)

        # Store the assistant's full response in context
        self._history[channel_id].append(
            {"role": "assistant", "content": accumulated}
        )
        self._trim_history(channel_id)
