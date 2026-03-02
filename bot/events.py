"""
bot/events.py
=============
Discord event handlers — stateless request/response bridge.

Each non-command message triggers exactly one LLM call.
No history is stored or injected between messages.

Streaming to Discord:
- We start with a "thinking…" placeholder, then stream Ollama tokens and
  progressively edit the message every time we accumulate enough new text.
  This gives a live typing effect without hammering the Discord API.
"""
from __future__ import annotations

import asyncio

import discord
from discord.ext import commands

from config.settings import settings
from ollama.client import OllamaClient, OllamaError
from utils.formatting import split_message
from utils.logger import get_logger
from bot.permissions import is_channel_allowed, is_user_allowed

log = get_logger(__name__)

# How many characters to accumulate before editing the Discord message
_STREAM_EDIT_THRESHOLD = 50

_SYSTEM_PROMPT = "You are Agent Smith. Provide direct, concise answers."


class ChatCog(commands.Cog):
    """Handles all incoming messages and routes them to Ollama."""

    def __init__(self, bot: commands.Bot, ollama: OllamaClient) -> None:
        self.bot = bot
        self.ollama = ollama

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

        log.info(
            "Message from %s in channel %s: %s",
            message.author,
            message.channel,
            content[:80],
        )

        # Send a placeholder while we wait for the model
        async with message.channel.typing():
            reply_msg = await message.reply("💭 *Thinking…*", mention_author=False)

        # Single stateless LLM call — no history injected
        ollama_messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ]

        # Stream the response
        accumulated = ""
        last_edit_len = 0

        try:
            async for token in self.ollama.chat_stream(ollama_messages):
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
