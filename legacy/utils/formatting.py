"""
utils/formatting.py
===================
Helpers for Discord message formatting.

Discord's hard limit for a single message is 2000 characters.
These utilities make it easy to split long model responses and trim
code blocks gracefully.
"""
from typing import List

# Discord's maximum message length
DISCORD_MAX_LENGTH = 2000


def split_message(text: str, max_length: int = DISCORD_MAX_LENGTH) -> List[str]:
    """Split *text* into a list of chunks each ≤ *max_length* characters.

    Tries to split on newlines first so code blocks stay readable.
    Falls back to hard-splitting at *max_length* if a single line is too long.
    """
    if not text:
        return ["*(empty response)*"]

    if len(text) <= max_length:
        return [text]

    chunks: List[str] = []
    current = ""

    for line in text.splitlines(keepends=True):
        # If adding this line would exceed the limit, flush the current chunk
        if len(current) + len(line) > max_length:
            if current:
                chunks.append(current)
                current = ""
            # If a single line is itself too long, hard-split it
            while len(line) > max_length:
                chunks.append(line[:max_length])
                line = line[max_length:]
        current += line

    if current:
        chunks.append(current)

    return chunks or ["*(empty response)*"]


def truncate(text: str, max_length: int = DISCORD_MAX_LENGTH, suffix: str = "…") -> str:
    """Return *text* truncated to *max_length* characters, appending *suffix* if cut."""
    if len(text) <= max_length:
        return text
    return text[: max_length - len(suffix)] + suffix
