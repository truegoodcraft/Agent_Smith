"""
bot/client.py
=============
Assembles the Discord bot client.

Responsibilities:
- Create the discord.py Bot instance with the configured command prefix and intents.
- Register all Cogs (ChatCog for on_message, SlashCog for slash commands).
- Sync the slash-command tree on startup.
- Log connection events and set the bot's status.
"""
from __future__ import annotations

import discord
from discord.ext import commands

from config.settings import settings
from ollama.client import OllamaClient
from utils.logger import get_logger
from bot.events import ChatCog
from bot.commands import SlashCog

log = get_logger(__name__)


def create_bot(ollama: OllamaClient) -> commands.Bot:
    """Create and configure the Discord bot.

    Returns a fully-wired :class:`commands.Bot` ready to be started with
    ``bot.run(token)``.
    """
    # Enable the message-content intent so we can read non-slash messages.
    # (You must also enable this in the Discord Developer Portal for your app.)
    intents = discord.Intents.default()
    intents.message_content = True

    bot = commands.Bot(
        command_prefix=settings.COMMAND_PREFIX,
        intents=intents,
        # Disable the default help command so our /ask help-text is the guide
        help_command=None,
    )

    # ── Attach Cogs ───────────────────────────────────────────────────────────

    # Order matters: ChatCog must be added first so SlashCog can reference it
    chat_cog = ChatCog(bot, ollama)
    slash_cog = SlashCog(bot, ollama, chat_cog)

    # ── Events ────────────────────────────────────────────────────────────────

    @bot.event
    async def on_ready() -> None:
        log.info("Logged in as %s (ID: %d)", bot.user, bot.user.id)  # type: ignore[union-attr]

        # Set a helpful status
        await bot.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.listening,
                name="your questions (/ask)",
            )
        )

        # Register Cogs after on_ready so the event loop is running
        await bot.add_cog(chat_cog)
        await bot.add_cog(slash_cog)

        # Sync slash commands globally (can take up to 1 hour to propagate).
        # For faster testing, use tree.sync(guild=...) with a specific guild.
        try:
            synced = await bot.tree.sync()
            log.info("Synced %d slash command(s).", len(synced))
        except Exception as exc:
            log.error("Failed to sync slash commands: %s", exc)

    @bot.event
    async def on_command_error(ctx: commands.Context, error: Exception) -> None:
        """Global error handler for prefix commands."""
        if isinstance(error, commands.CommandNotFound):
            return  # silently ignore unknown prefix commands
        log.error("Command error in %s: %s", ctx.command, error)

    return bot
