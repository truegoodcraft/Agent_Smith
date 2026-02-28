from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import DefaultDict


class TranscriptStore:
    """Channel-scoped append-only transcript logging to disk."""

    def __init__(self, base_dir: Path | None = None) -> None:
        self._base_dir = base_dir or Path(__file__).resolve().parent
        self._locks: DefaultDict[int, asyncio.Lock] = defaultdict(asyncio.Lock)

    async def append(self, channel_id: int, role: str, content: str) -> None:
        """Append a single transcript line for a channel without blocking the chat path."""
        sanitized_content = " ".join(content.replace("\r", " ").replace("\n", " ").split())
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        line = f"{timestamp} | {role} | {sanitized_content}\n"
        file_path = self._base_dir / f"channel_{channel_id}.log"

        async with self._locks[channel_id]:
            await asyncio.to_thread(self._append_line, file_path, line)

    def _append_line(self, file_path: Path, line: str) -> None:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with file_path.open("a", encoding="utf-8") as handle:
            handle.write(line)