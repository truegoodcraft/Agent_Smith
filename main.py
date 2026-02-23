"""
main.py
=======
Entry point for Agent Smith — Ollama Discord Bot Bridge.

Usage:
    python main.py

The bot reads all configuration from the .env file (or environment variables).
Copy .env.example to .env, fill in your Discord token and Ollama settings,
then run this file.
"""
import asyncio
import signal
import sys

from config.settings import settings
from ollama.client import OllamaClient
from bot.client import create_bot
from utils.logger import get_logger

log = get_logger(__name__)


async def main() -> None:
    """Start the Ollama client, then start the Discord bot."""
    log.info("Starting Agent Smith — Ollama Discord Bot Bridge")
    log.info("Ollama host  : %s", settings.OLLAMA_HOST)
    log.info("Default model: %s", settings.OLLAMA_MODEL)

    ollama = OllamaClient(
        host=settings.OLLAMA_HOST,
        model=settings.OLLAMA_MODEL,
        timeout=settings.OLLAMA_TIMEOUT,
    )

    # Warn if Ollama isn't reachable yet (the bot still starts; retries happen
    # per-message so a late-starting Ollama server isn't a fatal error).
    if not await ollama.is_available():
        log.warning(
            "⚠️  Ollama at %s is not responding. "
            "The bot will start anyway but responses will fail until "
            "Ollama is available.",
            settings.OLLAMA_HOST,
        )

    bot = create_bot(ollama)

    # Graceful shutdown on SIGINT / SIGTERM
    loop = asyncio.get_event_loop()

    def _shutdown(sig: signal.Signals) -> None:
        log.info("Received signal %s — shutting down…", sig.name)
        loop.create_task(_cleanup(bot, ollama))

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _shutdown, sig)
        except NotImplementedError:
            # Windows does not support add_signal_handler
            pass

    try:
        await bot.start(settings.DISCORD_TOKEN)
    except KeyboardInterrupt:
        pass
    finally:
        await _cleanup(bot, ollama)


async def _cleanup(bot, ollama: OllamaClient) -> None:
    """Close both the Discord bot and the Ollama HTTP session."""
    if not bot.is_closed():
        log.info("Closing Discord connection…")
        await bot.close()
    await ollama.close()
    log.info("Shutdown complete.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except EnvironmentError as exc:
        # Missing required env vars (e.g. DISCORD_TOKEN)
        log.error("Configuration error: %s", exc)
        sys.exit(1)
