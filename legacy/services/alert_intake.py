"""Placeholder foundation for future structured backend alert intake.

No network listener is implemented in phase 1.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class BackendAlert:
    """Future alert envelope shape for backend-originated telemetry notifications."""

    source: str
    severity: str
    category: str
    message: str
    timestamp: str
    details: dict[str, Any]
