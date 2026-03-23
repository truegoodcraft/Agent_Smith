"""Fixed-endpoint backend telemetry client for operator commands."""
from __future__ import annotations

import asyncio
import json
from typing import Any, cast
from urllib.parse import urlparse

import aiohttp

from config.settings import settings

NormalizedBackendResult = dict[str, Any]

_MAX_RAW_TEXT_CHARS = 2000


class BackendClient:
    """Read-only client that calls approved telemetry endpoints only."""

    def __init__(self) -> None:
        self._timeout = aiohttp.ClientTimeout(total=settings.BACKEND_TIMEOUT_SECONDS)
        self._allowed_hosts = {host.lower() for host in settings.BACKEND_ALLOWED_HOSTS}
        self._auth_token = settings.LIGHTHOUSE_ADMIN_TOKEN
        self._routes = {
            "report": settings.LIGHTHOUSE_REPORT_URL,
            "traffic": settings.LIGHTHOUSE_TRAFFIC_URL,
            "errors": settings.LIGHTHOUSE_ERRORS_URL,
            "health": settings.LIGHTHOUSE_HEALTH_URL,
        }
        for label, url in self._routes.items():
            self._validate_url(label, url)

    def _validate_url(self, label: str, url: str) -> None:
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        if parsed.scheme.lower() != "https":
            raise EnvironmentError(f"{label} URL must use HTTPS: {url}")
        if not host:
            raise EnvironmentError(f"{label} URL is missing a valid host: {url}")
        if host not in self._allowed_hosts:
            raise EnvironmentError(
                f"{label} host '{host}' is not in BACKEND_ALLOWED_HOSTS"
            )

    async def _fetch(self, label: str) -> NormalizedBackendResult:
        url = self._routes[label]
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self._auth_token}",
            "X-Admin-Token": self._auth_token,
        }

        status_code: int | None = None
        content_type: str | None = None

        try:
            async with aiohttp.ClientSession(timeout=self._timeout) as session:
                async with session.get(url, headers=headers) as response:
                    status_code = response.status
                    content_type = response.headers.get("Content-Type")
                    raw_bytes = await response.read()

            if len(raw_bytes) > settings.BACKEND_MAX_RESPONSE_BYTES:
                return {
                    "ok": False,
                    "status_code": status_code,
                    "url": url,
                    "error": (
                        "Payload exceeds BACKEND_MAX_RESPONSE_BYTES "
                        f"({settings.BACKEND_MAX_RESPONSE_BYTES})."
                    ),
                    "json": None,
                    "raw_text": None,
                    "content_type": content_type,
                }

            raw_text = raw_bytes.decode("utf-8", errors="replace")
            parsed: Any = json.loads(raw_text)
            if isinstance(parsed, dict):
                typed_parsed = cast(dict[Any, Any], parsed)
                json_payload: dict[str, Any] = {
                    str(key): value for key, value in typed_parsed.items()
                }
            else:
                json_payload = {"data": parsed}

            return {
                "ok": True,
                "status_code": status_code,
                "url": url,
                "error": None,
                "json": json_payload,
                "raw_text": raw_text[:_MAX_RAW_TEXT_CHARS],
                "content_type": content_type,
            }
        except asyncio.TimeoutError:
            return {
                "ok": False,
                "status_code": status_code,
                "url": url,
                "error": "Backend request timed out.",
                "json": None,
                "raw_text": None,
                "content_type": content_type,
            }
        except json.JSONDecodeError as exc:
            return {
                "ok": False,
                "status_code": status_code,
                "url": url,
                "error": f"Response is not valid JSON: {exc}",
                "json": None,
                "raw_text": None,
                "content_type": content_type,
            }
        except aiohttp.ClientError as exc:
            return {
                "ok": False,
                "status_code": status_code,
                "url": url,
                "error": f"Backend request failed: {exc}",
                "json": None,
                "raw_text": None,
                "content_type": content_type,
            }

    async def get_report(self) -> NormalizedBackendResult:
        return await self._fetch("report")

    async def get_traffic(self) -> NormalizedBackendResult:
        return await self._fetch("traffic")

    async def get_errors(self) -> NormalizedBackendResult:
        return await self._fetch("errors")

    async def get_health(self) -> NormalizedBackendResult:
        return await self._fetch("health")
