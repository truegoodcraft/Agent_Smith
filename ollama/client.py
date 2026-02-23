"""
ollama/client.py
================
Async wrapper around the Ollama HTTP API.

Supports:
- /api/chat  (multi-turn, with message history)
- Streaming responses (yields token chunks as they arrive)
- Configurable host, model, and timeout
- Graceful error handling when Ollama is offline or returns an error

Reference: https://github.com/ollama/ollama/blob/main/docs/api.md
"""
from __future__ import annotations

import json
from typing import AsyncIterator, List, Optional

import aiohttp

from utils.logger import get_logger

log = get_logger(__name__)

# Type alias for a single chat message (Ollama chat API format)
Message = dict  # {"role": "user"|"assistant"|"system", "content": str}


class OllamaError(Exception):
    """Raised when the Ollama API returns an error or is unreachable."""


class OllamaClient:
    """Lightweight async client for the Ollama REST API.

    Parameters
    ----------
    host:
        Base URL of the Ollama server, e.g. ``http://localhost:11434``.
    model:
        Default model name to use, e.g. ``llama3``.
    timeout:
        Request timeout in seconds.
    """

    def __init__(self, host: str, model: str, timeout: int = 120) -> None:
        self.host = host.rstrip("/")
        self.model = model
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self._session: Optional[aiohttp.ClientSession] = None

    # ── Session lifecycle ────────────────────────────────────────────────────

    async def _get_session(self) -> aiohttp.ClientSession:
        """Return (or create) the shared aiohttp session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=self.timeout)
        return self._session

    async def close(self) -> None:
        """Close the underlying HTTP session (call on shutdown)."""
        if self._session and not self._session.closed:
            await self._session.close()
            log.debug("Ollama HTTP session closed.")

    # ── Health check ─────────────────────────────────────────────────────────

    async def is_available(self) -> bool:
        """Return True if the Ollama server responds to a simple GET /."""
        try:
            session = await self._get_session()
            async with session.get(f"{self.host}/") as resp:
                return resp.status < 500
        except Exception as exc:
            log.warning("Ollama health check failed: %s", exc)
            return False

    # ── Core chat call ────────────────────────────────────────────────────────

    async def chat_stream(
        self,
        messages: List[Message],
        model: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """Stream a chat response from Ollama, yielding text chunks.

        Parameters
        ----------
        messages:
            Conversation history in Ollama format:
            ``[{"role": "user", "content": "..."}, ...]``
        model:
            Override the default model for this request.

        Yields
        ------
        str
            Incremental text chunks from the model.

        Raises
        ------
        OllamaError
            If the server is unreachable or returns a non-2xx status.
        """
        url = f"{self.host}/api/chat"
        payload = {
            "model": model or self.model,
            "messages": messages,
            "stream": True,
        }

        log.debug("POST %s — model=%s, turns=%d", url, payload["model"], len(messages))

        try:
            session = await self._get_session()
            async with session.post(url, json=payload) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    raise OllamaError(
                        f"Ollama returned HTTP {resp.status}: {body[:200]}"
                    )

                # Each line is a JSON object; we yield the token text
                async for raw_line in resp.content:
                    line = raw_line.strip()
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                    except json.JSONDecodeError:
                        log.warning("Could not decode Ollama chunk: %r", line)
                        continue

                    token = chunk.get("message", {}).get("content", "")
                    if token:
                        yield token

                    # Ollama signals end-of-stream with "done": true
                    if chunk.get("done"):
                        break

        except OllamaError:
            raise
        except aiohttp.ClientConnectorError as exc:
            raise OllamaError(
                f"Cannot connect to Ollama at {self.host}. "
                "Is the server running?"
            ) from exc
        except aiohttp.ServerTimeoutError as exc:
            raise OllamaError(
                f"Ollama timed out after {self.timeout.total}s. "
                "Try a smaller model or increase OLLAMA_TIMEOUT."
            ) from exc
        except Exception as exc:
            raise OllamaError(f"Unexpected error calling Ollama: {exc}") from exc

    async def chat(
        self,
        messages: List[Message],
        model: Optional[str] = None,
    ) -> str:
        """Non-streaming convenience wrapper — returns the full response text.

        Internally uses :meth:`chat_stream` and concatenates all chunks.
        """
        parts: List[str] = []
        async for chunk in self.chat_stream(messages, model=model):
            parts.append(chunk)
        return "".join(parts)

    # ── Model listing ─────────────────────────────────────────────────────────

    async def list_models(self) -> List[str]:
        """Return a list of model names available on the Ollama server."""
        url = f"{self.host}/api/tags"
        try:
            session = await self._get_session()
            async with session.get(url) as resp:
                if resp.status != 200:
                    raise OllamaError(f"Ollama /api/tags returned HTTP {resp.status}")
                data = await resp.json()
                return [m["name"] for m in data.get("models", [])]
        except OllamaError:
            raise
        except Exception as exc:
            raise OllamaError(f"Could not list models: {exc}") from exc
