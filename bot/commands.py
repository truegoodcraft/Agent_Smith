"""
bot/commands.py
===============
Slash commands for the bot.

/ask <prompt>   — Send a one-shot prompt to Ollama (does not update channel context)
/reset          — Clear the conversation history for the current channel
/model [name]   — View or change the active Ollama model for this channel
/models         — List all models available on the Ollama server
/memory status  — Show per-channel memory diagnostics

All commands respect the same channel/user permission rules as regular messages.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands

from config.settings import settings
from ollama.client import OllamaClient, OllamaError
from utils.formatting import split_message
from utils.logger import get_logger
from bot.permissions import is_channel_allowed, is_user_allowed

log = get_logger(__name__)

if TYPE_CHECKING:
    from bot.events import ChatCog


class SlashCog(commands.Cog):
    memory_group = app_commands.Group(name="memory", description="Memory diagnostics")

    """Slash command group for Agent Smith."""

    def __init__(self, bot: commands.Bot, ollama: OllamaClient, chat_cog: "ChatCog") -> None:  # type: ignore[name-defined]  # noqa: F821
        self.bot = bot
        self.ollama = ollama
        self.chat_cog: ChatCog = chat_cog  # reference so we can read/reset history
        # Per-channel model overrides: channel_id → model_name
        self._channel_models: dict[int, str] = {}

    def _get_model(self, channel_id: int) -> str:
        """Return the active model for a channel (or the global default)."""
        return self._channel_models.get(channel_id, settings.OLLAMA_MODEL)

    def _check_permissions(self, interaction: discord.Interaction) -> bool:
        """Return False and respond with an error if the user/channel is blocked."""
        if not is_channel_allowed(interaction.channel):  # type: ignore[arg-type]
            return False
        if not is_user_allowed(interaction.user):  # type: ignore[arg-type]
            return False
        return True

    # ── /ask ─────────────────────────────────────────────────────────────────

    @app_commands.command(name="ask", description="Ask Ollama a one-shot question")
    @app_commands.describe(prompt="Your question or prompt for the model")
    async def ask(self, interaction: discord.Interaction, prompt: str) -> None:
        """Send a single prompt to Ollama without affecting channel history."""
        if not self._check_permissions(interaction):
            await interaction.response.send_message(
                "❌ You don't have permission to use this command here.", ephemeral=True
            )
            return

        # Defer so Discord doesn't time out while we wait for the model
        await interaction.response.defer(thinking=True)

        channel_id = interaction.channel_id or 0
        deterministic_reply = self.chat_cog.deterministic_reply_for_prompt(channel_id, prompt)
        if deterministic_reply is not None:
            await interaction.followup.send(deterministic_reply)
            return

        model = self._get_model(channel_id)
        messages = self.chat_cog.build_ollama_messages(
            channel_id=channel_id,
            user_prompt=prompt,
            include_history=False,
        )

        try:
            response = await self.ollama.chat(messages, model=model)
        except OllamaError as exc:
            log.error("/ask error: %s", exc)
            await interaction.followup.send(f"❌ **Ollama error:** {exc}")
            return

        chunks = split_message(response or "*(no response)*")
        await interaction.followup.send(chunks[0])
        for chunk in chunks[1:]:
            await interaction.channel.send(chunk)  # type: ignore[union-attr]

    # ── /reset ────────────────────────────────────────────────────────────────

    @app_commands.command(
        name="reset", description="Clear the conversation history for this channel"
    )
    async def reset(self, interaction: discord.Interaction) -> None:
        """Wipe the channel's chat context so the next message starts fresh."""
        if not self._check_permissions(interaction):
            await interaction.response.send_message(
                "❌ You don't have permission to use this command here.", ephemeral=True
            )
            return

        channel_id = interaction.channel_id or 0
        self.chat_cog.reset_history(channel_id)
        reset_text = self.chat_cog.get_reset_marker_text(channel_id) or "unknown time"
        await interaction.response.send_message(
            f"🧹 Conversation history cleared for this channel at {reset_text}.",
            ephemeral=True,
        )

    # ── /model ────────────────────────────────────────────────────────────────

    @app_commands.command(
        name="model",
        description="View or change the Ollama model used in this channel",
    )
    @app_commands.describe(name="Model name to switch to (leave empty to view current)")
    async def model(
        self, interaction: discord.Interaction, name: Optional[str] = None
    ) -> None:
        """View the current model or switch to a different one for this channel."""
        if not self._check_permissions(interaction):
            await interaction.response.send_message(
                "❌ You don't have permission to use this command here.", ephemeral=True
            )
            return

        channel_id = interaction.channel_id or 0
        current = self._get_model(channel_id)

        if name is None:
            await interaction.response.send_message(
                f"🤖 Current model for this channel: **{current}**\n"
                f"Global default: **{settings.OLLAMA_MODEL}**",
                ephemeral=True,
            )
            return

        # Switch the model for this channel
        self._channel_models[channel_id] = name
        log.info(
            "Channel %d model changed to %s by %s.", channel_id, name, interaction.user
        )
        await interaction.response.send_message(
            f"✅ Switched to model **{name}** for this channel.", ephemeral=True
        )


    @memory_group.command(name="status", description="Show memory status for this channel")
    async def memory_status(self, interaction: discord.Interaction) -> None:
        """Return read-only memory diagnostics for the current channel."""
        if not self._check_permissions(interaction):
            await interaction.response.send_message(
                "❌ You don't have permission to use this command here.", ephemeral=True
            )
            return

        channel_id = interaction.channel_id or 0
        status = await self.chat_cog.compaction.get_status(channel_id)

        text = (
            f"**Memory Status — Channel {status['channel_id']}**\n\n"
            f"Active RAM Messages: {status['active_ram_messages']}\n"
            f"Max Context Pairs: {status['max_context_pairs']}\n"
            f"Compaction Threshold: {status['compaction_threshold']}\n"
            f"Compaction Size: {status['compaction_size']}\n"
            f"Active Window Size: {status['active_window_size']}\n\n"
            f"Archive Segments: {status['archive_segments']}\n"
            f"Live Segments: {status['live_segments']}\n"
            f"Last Compaction: {status['last_compaction']}\n\n"
            f"Summary Channel ID: {status['summary_channel_id']}"
        )
        await interaction.response.send_message(text, ephemeral=True)

    # ── /models ───────────────────────────────────────────────────────────────

    @app_commands.command(
        name="models", description="List all models available on the Ollama server"
    )
    async def models(self, interaction: discord.Interaction) -> None:
        """Fetch and display the list of models from Ollama."""
        if not self._check_permissions(interaction):
            await interaction.response.send_message(
                "❌ You don't have permission to use this command here.", ephemeral=True
            )
            return

        await interaction.response.defer(thinking=True)

        try:
            model_list = await self.ollama.list_models()
        except OllamaError as exc:
            await interaction.followup.send(f"❌ **Ollama error:** {exc}")
            return

        if not model_list:
            await interaction.followup.send("⚠️ No models found on the Ollama server.")
            return

        lines = "\n".join(f"• `{m}`" for m in model_list)
        await interaction.followup.send(f"**Available models:**\n{lines}")
