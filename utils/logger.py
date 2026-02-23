"""
utils/logger.py
===============
Sets up a consistent, human-readable logger for the whole application.
Uses Python's standard `logging` module — no extra dependencies.
"""
import logging
import sys


def get_logger(name: str) -> logging.Logger:
    """Return a named logger configured with a stream handler.

    Calling this multiple times with the same name returns the same logger
    (standard Python logging behaviour), so it is safe to call at module level.
    """
    logger = logging.getLogger(name)

    # Only add a handler if none exists yet (avoids duplicate log lines)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    # Level is controlled via the LOG_LEVEL env var (set in settings.py)
    # We import lazily to avoid circular imports at module load time.
    try:
        from config.settings import settings  # noqa: PLC0415
        logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
    except Exception:  # pragma: no cover — if settings fail, default to INFO
        logger.setLevel(logging.INFO)

    return logger
