from __future__ import annotations

from typing import List

from config.settings import settings
from ollama.client import OllamaClient, OllamaError


class StructuredSummarizer:
    """Generate strict structured summaries for compacted message slices."""

    def __init__(self, ollama: OllamaClient) -> None:
        self.ollama = ollama

    async def summarize_slice(self, items: List[dict]) -> str:
        serialized = []
        for idx, item in enumerate(items, start=1):
            role = item.get("role", "unknown")
            content = str(item.get("content", "")).strip()
            serialized.append(f"{idx}. [{role}] {content}")
        transcript = "\n".join(serialized) if serialized else "(empty)"

        system_prompt = (
            "You summarize chat logs into strict structured memory. "
            "Return exactly these sections in this exact order: "
            "FACTS:, THREADS:, DECISIONS:, IDEAS:, OPEN_LOOPS:. "
            "Each section must contain only bullet points prefixed with '- '. "
            "No prose. No commentary. No markdown headers beyond section labels."
        )
        user_prompt = (
            "Summarize this dropped transcript slice.\n\n"
            f"{transcript}\n\n"
            "Output format must be:\n"
            "FACTS:\n- ...\n\n"
            "THREADS:\n- ...\n\n"
            "DECISIONS:\n- ...\n\n"
            "IDEAS:\n- ...\n\n"
            "OPEN_LOOPS:\n- ..."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        try:
            result = await self.ollama.chat(messages=messages, model=settings.MEMORY_SUMMARY_MODEL)
            return result.strip()
        except OllamaError:
            raise
