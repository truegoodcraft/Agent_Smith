"""
bot/permissions.py
==================
Checks whether a Discord message or user is allowed to interact with the bot.

Permissions are configured via environment variables (see config/settings.py):
- ALLOWED_CHANNEL_IDS — comma-separated channel IDs; empty = all channels allowed
- ALLOWED_USER_IDS    — comma-separated user IDs;    empty = all users allowed

This module is intentionally kept simple: no database, no dynamic updates.
Change the .env and restart to update permissions.
"""
import discord

from config.settings import settings
from utils.logger import get_logger

log = get_logger(__name__)


def is_channel_allowed(channel: discord.abc.GuildChannel | discord.DMChannel | discord.abc.PrivateChannel) -> bool:
    """Return True if the bot should respond in this channel.

    If ALLOWED_CHANNEL_IDS is empty, all channels are permitted.
    DMs are always permitted (they have no guild channel ID).
    """
    # DMs have no guild association — allow them by default
    if isinstance(channel, discord.DMChannel):
        return True

    if not settings.ALLOWED_CHANNEL_IDS:
        return True  # unrestricted

    allowed = str(channel.id) in settings.ALLOWED_CHANNEL_IDS
    if not allowed:
        log.debug("Channel %s (%d) is not in ALLOWED_CHANNEL_IDS — ignoring.", channel, channel.id)
    return allowed


def is_user_allowed(user: discord.User | discord.Member) -> bool:
    """Return True if this user is permitted to invoke the bot.

    If ALLOWED_USER_IDS is empty, all users are permitted.
    Bots are never permitted (prevents feedback loops).
    """
    if user.bot:
        return False

    if not settings.ALLOWED_USER_IDS:
        return True  # unrestricted

    allowed = str(user.id) in settings.ALLOWED_USER_IDS
    if not allowed:
        log.debug("User %s (%d) is not in ALLOWED_USER_IDS — ignoring.", user, user.id)
    return allowed
