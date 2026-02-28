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
import re
from datetime import datetime, timezone
from collections import defaultdict
from typing import Dict, List, Optional

import discord
from discord.ext import commands

from config.settings import settings
from memory.transcript import TranscriptStore
from ollama.client import OllamaClient, OllamaError
from utils.formatting import split_message
from utils.logger import get_logger
from bot.permissions import is_channel_allowed, is_user_allowed

log = get_logger(__name__)

# How many characters to accumulate before editing the Discord message
_STREAM_EDIT_THRESHOLD = 50


class ChatCog(commands.Cog):
    """Handles all incoming messages and routes them to Ollama."""

    def __init__(self, bot: commands.Bot, ollama: OllamaClient) -> None:
        self.bot = bot
        self.ollama = ollama
        self.transcript_store = TranscriptStore()
        # channel_id → list of {"role": ..., "content": ...}
        self._history: Dict[int, List[dict]] = defaultdict(list)
        # channel_id → reset timestamp in UTC
        self._reset_markers: Dict[int, datetime] = {}

    def get_history(self, channel_id: int) -> List[dict]:
        """Return the conversation history for a channel."""
        return self._history[channel_id]

    def reset_history(self, channel_id: int) -> None:
        """Clear the conversation history for a channel."""
        self._history[channel_id] = []
        reset_at = datetime.now(timezone.utc)
        self._reset_markers[channel_id] = reset_at
        log.info("Cleared history for channel %d at %s.", channel_id, reset_at.isoformat())

    def get_reset_marker(self, channel_id: int) -> Optional[datetime]:
        """Return the latest reset timestamp for a channel, if any."""
        return self._reset_markers.get(channel_id)

    @staticmethod
    def _format_timestamp(dt: datetime) -> str:
        """Format a UTC timestamp in a stable human-readable form."""
        return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    def _build_system_instruction(self, channel_id: int) -> str:
        """Build grounding instructions injected into every Ollama call."""
        stored_count = len(self._history[channel_id])
        max_pairs = settings.MAX_CONTEXT_PAIRS
        max_messages = max_pairs * 2
        reset_marker = self.get_reset_marker(channel_id)
        reset_line = (
            f"Latest reset marker: {self._format_timestamp(reset_marker)}."
            if reset_marker
            else "Latest reset marker: none."
        )

        return (
            "You are Agent Smith in Discord. "
            f"Per-channel context window is exactly {max_pairs} user/assistant pairs "
            f"({max_messages} messages max). "
            f"Current stored message count for this channel is {stored_count}. "
            "Ground all memory claims strictly to the provided stored channel buffer only. "
            "Do not claim to know or infer messages outside this stored buffer. "
            "Never use generic boilerplate like 'I'm a large language model' or "
            "'I don't retain memory'. "
            "If asked about a previous message that is not present in the stored buffer, "
            "respond with: 'Not in my stored channel buffer' and you may include the "
            "buffer length. "
            "If asked about history before reset, respond deterministically with: "
            "'History cleared at <time>; nothing retained.' using the channel reset marker. "
            f"{reset_line}"
        )

    def build_ollama_messages(
        self,
        channel_id: int,
        user_prompt: str,
        include_history: bool,
    ) -> List[dict]:
        """Create Ollama messages with mandatory system grounding instruction."""
        system_msg = {"role": "system", "content": self._build_system_instruction(channel_id)}
        if include_history:
            return [system_msg, *self._history[channel_id]]
        return [system_msg, {"role": "user", "content": user_prompt}]

    @staticmethod
    def _normalize_text(value: str) -> str:
        """Normalize text for deterministic buffer searches."""
        return " ".join(value.strip().lower().split())

    def _resolve_previous_message_query(
        self,
        channel_id: int,
        content: str,
    ) -> Optional[str]:
        """Handle deterministic buffer-grounded memory questions before LLM calls."""
        lower_content = content.lower()

        if re.search(r"\bbefore\s+reset\b", lower_content):
            reset_marker = self.get_reset_marker(channel_id)
            if reset_marker:
                return f"History cleared at {self._format_timestamp(reset_marker)}; nothing retained."
            return "Not in my stored channel buffer (no reset marker stored for this channel)."

        match = re.search(
            r"\bwhat\s+was\s+(?:the\s+)?message\s+before\s+(.+?)(?:\?|$)",
            content,
            flags=re.IGNORECASE,
        )
        if not match:
            return None

        target_raw = match.group(1).strip().strip('"\'` ')
        target = self._normalize_text(target_raw)
        if not target:
            return None

        stored = self._history[channel_id]
        if not stored:
            return "Not in my stored channel buffer (stored messages: 0)."

        quoted_target_match = re.search(r'"([^"]+)"', match.group(1))
        quoted_target = (
            self._normalize_text(quoted_target_match.group(1))
            if quoted_target_match
            else None
        )

        def _is_match(message_content: str) -> bool:
            normalized_message = self._normalize_text(message_content)
            if quoted_target:
                return normalized_message == quoted_target
            if len(target) < 3:
                return normalized_message == target
            return target in normalized_message

        target_indices = [
            idx
            for idx, item in enumerate(stored)
            if _is_match(item.get("content", ""))
        ]

        if not target_indices:
            return (
                "Not in my stored channel buffer "
                f"(stored messages: {len(stored)}; max: {settings.MAX_CONTEXT_PAIRS * 2})."
            )

        match_index = target_indices[-1]
        if match_index <= 0:
            return (
                "Not in my stored channel buffer "
                f"(stored messages: {len(stored)}; max: {settings.MAX_CONTEXT_PAIRS * 2})."
            )

        prev = stored[match_index - 1]
        prev_role = prev.get("role", "message")
        prev_content = prev.get("content", "").strip() or "(empty)"
        return f"In my stored channel buffer, the message before \"{target_raw}\" is ({prev_role}): {prev_content}"

    def deterministic_reply_for_prompt(
        self,
        channel_id: int,
        content: str,
    ) -> Optional[str]:
        """Public wrapper for deterministic buffer-grounded responses."""
        return self._resolve_previous_message_query(channel_id, content)

    def get_reset_marker_text(self, channel_id: int) -> Optional[str]:
        """Return formatted reset-marker timestamp text for this channel."""
        marker = self.get_reset_marker(channel_id)
        if marker is None:
            return None
        return self._format_timestamp(marker)

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

        channel_id = message.channel.id

        log.info(
            "Message from %s in channel %s: %s",
            message.author,
            message.channel,
            content[:80],
        )

        deterministic_reply = self._resolve_previous_message_query(channel_id, content)
        if deterministic_reply is not None:
            await message.reply(deterministic_reply, mention_author=False)
            return

        # Build context
        self._history[channel_id].append({"role": "user", "content": content})
        self._trim_history(channel_id)
        asyncio.create_task(self.transcript_store.append(channel_id, "user", content))

        # Send a placeholder while we wait for the model
        async with message.channel.typing():
            reply_msg = await message.reply("💭 *Thinking…*", mention_author=False)

        # Stream the response
        accumulated = ""
        last_edit_len = 0

        try:
            ollama_messages = self.build_ollama_messages(
                channel_id=channel_id,
                user_prompt=content,
                include_history=True,
            )
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
        asyncio.create_task(
            self.transcript_store.append(channel_id, "assistant", accumulated)
        )
