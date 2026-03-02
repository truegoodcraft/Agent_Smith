from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import discord
from discord.ext import commands

from config.settings import settings
from memory.summarizer import StructuredSummarizer
from ollama.client import OllamaError
from utils.logger import get_logger

log = get_logger(__name__)


class MemoryCompactor:
    """Asynchronously compacts per-channel RAM history into structured segments."""

    def __init__(
        self,
        bot: commands.Bot,
        history_store: Dict[int, List[dict]],
        summarizer: StructuredSummarizer,
    ) -> None:
        self.bot = bot
        self.history_store = history_store
        self.summarizer = summarizer
        self._locks: Dict[int, asyncio.Lock] = defaultdict(asyncio.Lock)
        self._summary_message_ids: Dict[int, int] = {}
        self._base = Path("memory")
        (self._base / "summaries").mkdir(parents=True, exist_ok=True)
        (self._base / "dropped").mkdir(parents=True, exist_ok=True)

    async def compact(self, channel_id: int) -> None:
        lock = self._locks[channel_id]
        if lock.locked():
            return

        async with lock:
            history = self.history_store[channel_id]
            if len(history) < settings.MEMORY_COMPACT_THRESHOLD:
                return

            cut = min(settings.MEMORY_COMPACT_SIZE, len(history))
            dropped = history[:cut]
            timestamp = datetime.now(timezone.utc)

            dropped_path = self._base / "dropped" / f"channel_{channel_id}_{int(timestamp.timestamp())}.log"
            await self._write_text(dropped_path, self._serialize_raw_slice(dropped, timestamp))

            try:
                structured_summary = await self.summarizer.summarize_slice(dropped)
            except OllamaError as exc:
                log.error("Compaction summarization failed for channel %s: %s", channel_id, exc)
                return

            archive_path = self._base / "summaries" / f"channel_{channel_id}_archive.md"
            live_path = self._base / "summaries" / f"channel_{channel_id}_live.md"

            await self._append_archive_segment(archive_path, structured_summary, timestamp)
            await self._rebuild_live_view(archive_path, live_path)
            await self._update_summary_channel(channel_id, live_path)

            del history[:cut]
            if len(history) > settings.MEMORY_ACTIVE_WINDOW:
                del history[:-settings.MEMORY_ACTIVE_WINDOW]

    def _serialize_raw_slice(self, dropped: List[dict], timestamp: datetime) -> str:
        lines = [f"timestamp_utc: {timestamp.isoformat()}"]
        for item in dropped:
            role = item.get("role", "unknown")
            content = str(item.get("content", "")).replace("\n", "\\n")
            lines.append(f"[{role}] {content}")
        return "\n".join(lines) + "\n"

    async def _append_archive_segment(self, archive_path: Path, summary: str, timestamp: datetime) -> None:
        existing = await self._read_text(archive_path) if await self._exists(archive_path) else ""
        next_idx = existing.count("## Segment ") + 1
        block = f"## Segment {next_idx} — {timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n{summary.strip()}\n\n"
        await self._write_text(archive_path, existing + block)

    async def _rebuild_live_view(self, archive_path: Path, live_path: Path) -> None:
        content = await self._read_text(archive_path) if await self._exists(archive_path) else ""
        parts = content.split("## Segment ")
        segments = [f"## Segment {part}" for part in parts[1:]] if len(parts) > 1 else []
        keep = settings.MEMORY_SUMMARY_MAX_SEGMENTS
        retained = segments[-keep:] if keep > 0 else []
        await self._write_text(live_path, "".join(retained))

    async def _update_summary_channel(self, channel_id: int, live_path: Path) -> None:
        channel = self.bot.get_channel(settings.MEMORY_SUMMARY_CHANNEL_ID)
        if channel is None:
            channel = await self.bot.fetch_channel(settings.MEMORY_SUMMARY_CHANNEL_ID)
        if not isinstance(channel, discord.TextChannel):
            return

        summary_content = await self._read_text(live_path) if await self._exists(live_path) else ""
        header = f"## Memory Summary — Channel {channel_id}\n\n"
        payload = (header + summary_content).strip()
        if len(payload) > 2000:
            payload = payload[:1997] + "..."

        message = await self._get_existing_summary_message(channel, channel_id)
        if message is None:
            message = await channel.send(payload)
            try:
                await message.pin(reason=f"Memory summary for channel {channel_id}")
            except discord.HTTPException:
                pass
            self._summary_message_ids[channel_id] = message.id
            return

        await message.edit(content=payload)

    async def _get_existing_summary_message(
        self,
        channel: discord.TextChannel,
        channel_id: int,
    ) -> Optional[discord.Message]:
        known = self._summary_message_ids.get(channel_id)
        if known:
            try:
                return await channel.fetch_message(known)
            except discord.HTTPException:
                self._summary_message_ids.pop(channel_id, None)

        marker = f"## Memory Summary — Channel {channel_id}"
        try:
            pinned = await channel.pins()
        except discord.HTTPException:
            pinned = []

        for msg in pinned:
            if msg.author == self.bot.user and msg.content.startswith(marker):
                self._summary_message_ids[channel_id] = msg.id
                return msg
        return None


    async def get_status(self, channel_id: int) -> dict:
        """Return read-only memory status for a channel."""
        history = self.history_store[channel_id]
        active_ram_messages = len(history)

        archive_path = self._base / "summaries" / f"channel_{channel_id}_archive.md"
        live_path = self._base / "summaries" / f"channel_{channel_id}_live.md"

        archive_content = await self._read_text(archive_path) if await self._exists(archive_path) else ""
        live_content = await self._read_text(live_path) if await self._exists(live_path) else ""

        archive_segments = archive_content.count("## Segment ")
        live_segments = live_content.count("## Segment ")

        last_compaction = "never"
        if archive_segments > 0:
            segments = [part for part in archive_content.split("## Segment ") if part.strip()]
            if segments:
                header = segments[-1].splitlines()[0].strip()
                if " — " in header:
                    last_compaction = header.split(" — ", 1)[1].strip()

        return {
            "channel_id": channel_id,
            "active_ram_messages": active_ram_messages,
            "max_context_pairs": settings.MAX_CONTEXT_PAIRS,
            "compaction_threshold": settings.MEMORY_COMPACT_THRESHOLD,
            "compaction_size": settings.MEMORY_COMPACT_SIZE,
            "active_window_size": settings.MEMORY_ACTIVE_WINDOW,
            "archive_segments": archive_segments,
            "live_segments": live_segments,
            "last_compaction": last_compaction,
            "summary_channel_id": settings.MEMORY_SUMMARY_CHANNEL_ID,
        }

    async def _write_text(self, path: Path, content: str) -> None:
        await asyncio.to_thread(path.write_text, content, encoding="utf-8")

    async def _read_text(self, path: Path) -> str:
        return await asyncio.to_thread(path.read_text, encoding="utf-8")

    async def _exists(self, path: Path) -> bool:
        return await asyncio.to_thread(path.exists)
