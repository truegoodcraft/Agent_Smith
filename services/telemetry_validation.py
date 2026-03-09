"""Validation and sanitization for backend telemetry payloads."""
from __future__ import annotations

from typing import Any, cast

from config.settings import settings

_SENSITIVE_KEYS = {
    "authorization",
    "token",
    "access_token",
    "refresh_token",
    "api_key",
    "secret",
    "password",
    "cookie",
    "set-cookie",
}


def _redact(value: Any) -> Any:
    if isinstance(value, dict):
        typed_value = cast(dict[Any, Any], value)
        sanitized: dict[str, Any] = {}
        for key, sub_value in typed_value.items():
            key_str = str(key)
            if key_str.lower() in _SENSITIVE_KEYS:
                sanitized[key_str] = "[REDACTED]"
            else:
                sanitized[key_str] = _redact(sub_value)
        return sanitized
    if isinstance(value, list):
        typed_list = cast(list[Any], value)
        return [_redact(item) for item in typed_list]
    return value


def validate_and_sanitize(result: dict[str, Any]) -> dict[str, Any]:
    """Validate backend result and sanitize payload before LLM usage."""
    status_code = result.get("status_code")
    content_type = (result.get("content_type") or "").lower()
    payload = result.get("json")
    raw_text = result.get("raw_text")

    parse_ok = payload is not None

    if result.get("error"):
        return {
            "ok": False,
            "error": result["error"],
            "parse_ok": parse_ok,
            "status_code": status_code,
        }

    if status_code is None or status_code < 200 or status_code >= 300:
        return {
            "ok": False,
            "error": f"Unexpected HTTP status: {status_code}",
            "parse_ok": parse_ok,
            "status_code": status_code,
        }

    if "application/json" not in content_type:
        return {
            "ok": False,
            "error": f"Unexpected content type: {content_type or 'unknown'}",
            "parse_ok": parse_ok,
            "status_code": status_code,
        }

    if raw_text is not None and len(raw_text.encode("utf-8")) > settings.BACKEND_MAX_RESPONSE_BYTES:
        return {
            "ok": False,
            "error": "Payload exceeded configured max response bytes.",
            "parse_ok": parse_ok,
            "status_code": status_code,
        }

    if not isinstance(payload, dict):
        return {
            "ok": False,
            "error": "Payload is missing structured JSON object data.",
            "parse_ok": parse_ok,
            "status_code": status_code,
        }

    return {
        "ok": True,
        "error": None,
        "parse_ok": True,
        "status_code": status_code,
        "sanitized_json": _redact(payload),
    }
