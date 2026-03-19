from __future__ import annotations

from pathlib import Path


def test_report_route_never_uses_model_policy_marker() -> None:
    commands_path = Path("bot/commands.py")
    source = commands_path.read_text(encoding="utf-8")

    assert "def _should_use_model_for_route(route_label: str) -> bool:" in source
    assert "return route_label != \"report\"" in source
