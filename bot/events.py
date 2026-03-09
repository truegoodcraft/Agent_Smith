"""Discord event handlers for slash-command-only operator workflow."""
from __future__ import annotations

import discord
from discord.ext import commands

from bot.permissions import is_channel_allowed, is_user_allowed
from config.settings import settings


class ChatCog(commands.Cog):
    """Disable freeform chat and direct users to approved slash commands."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message) -> None:
        """Ignore freeform messages; this bot is slash-command driven."""
        if message.author == self.bot.user:
            return

        if not is_channel_allowed(message.channel):  # type: ignore[arg-type]
            return
        if not is_user_allowed(message.author):  # type: ignore[arg-type]
            return

        if message.content.startswith(settings.COMMAND_PREFIX):
            return

        if not message.content.strip():
            return

        await message.reply(
            "Use slash commands: /report, /traffic, /errors, /health",
            mention_author=False,
        )
