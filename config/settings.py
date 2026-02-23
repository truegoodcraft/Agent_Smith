"""
config/settings.py
==================
Loads all configuration from environment variables (via a .env file or
the shell environment).  Nothing is hard-coded here — every secret and
tunable parameter lives in .env so the repo is safe to publish.
"""
import os
from pathlib import Path
from typing import Optional, Set

from dotenv import load_dotenv

# Load .env from the project root (two levels up from this file)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)


def _get(key: str, default: Optional[str] = None, required: bool = False) -> Optional[str]:
    """Read an env var, optionally requiring it to be set."""
    value = os.getenv(key, default)
    if required and not value:
        raise EnvironmentError(
            f"Required environment variable '{key}' is not set. "
            "Copy .env.example to .env and fill in the values."
        )
    return value


def _get_set(key: str, default: str = "") -> Set[str]:
    """Read a comma-separated env var into a Python set (empty = unrestricted)."""
    raw = os.getenv(key, default).strip()
    if not raw:
        return set()
    return {item.strip() for item in raw.split(",") if item.strip()}


class Settings:
    """Central settings object — import `settings` from this module."""

    # ── Discord ──────────────────────────────────────────────────────────────
    DISCORD_TOKEN: str = _get("DISCORD_TOKEN", required=True)  # type: ignore[assignment]
    # Command prefix used for legacy text commands (slash commands are primary)
    COMMAND_PREFIX: str = _get("COMMAND_PREFIX", "!")

    # ── Ollama ───────────────────────────────────────────────────────────────
    OLLAMA_HOST: str = _get("OLLAMA_HOST", "http://localhost:11434")  # type: ignore[assignment]
    OLLAMA_MODEL: str = _get("OLLAMA_MODEL", "llama3")  # type: ignore[assignment]
    # Maximum seconds to wait for Ollama to respond
    OLLAMA_TIMEOUT: int = int(_get("OLLAMA_TIMEOUT", "120"))  # type: ignore[arg-type]

    # ── Permissions / Safety ─────────────────────────────────────────────────
    # Comma-separated Discord channel IDs the bot is allowed to respond in.
    # Empty = all channels are allowed.
    ALLOWED_CHANNEL_IDS: Set[str] = _get_set("ALLOWED_CHANNEL_IDS")
    # Comma-separated Discord user IDs that may invoke the bot.
    # Empty = all users are allowed.
    ALLOWED_USER_IDS: Set[str] = _get_set("ALLOWED_USER_IDS")

    # ── Rate limiting ────────────────────────────────────────────────────────
    # Max requests per user in RATE_LIMIT_WINDOW seconds
    RATE_LIMIT_REQUESTS: int = int(_get("RATE_LIMIT_REQUESTS", "5"))  # type: ignore[arg-type]
    RATE_LIMIT_WINDOW: int = int(_get("RATE_LIMIT_WINDOW", "60"))  # type: ignore[arg-type]

    # ── Context / Memory ─────────────────────────────────────────────────────
    # How many previous message pairs to keep in context per channel
    MAX_CONTEXT_PAIRS: int = int(_get("MAX_CONTEXT_PAIRS", "10"))  # type: ignore[arg-type]

    # ── Logging ──────────────────────────────────────────────────────────────
    LOG_LEVEL: str = _get("LOG_LEVEL", "INFO")  # type: ignore[assignment]


# Singleton — import this everywhere
settings = Settings()
