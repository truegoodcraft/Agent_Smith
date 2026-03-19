from __future__ import annotations

from typing import Any

from services.telemetry_preprocess import (
    build_report_signals,
    build_report_summary,
    interpret_report_fallback,
    select_report_window,
)


def test_report_logic_7d_selected_over_today_for_downloads() -> None:
    payload: dict[str, Any] = {
        "last_7_days": {"update_checks": 8, "downloads": 3, "errors": 0},
        "update_checks": {"today": 8},
        "downloads": {"today": 0, "present": False},
        "errors": {"today": 0},
    }

    selected = select_report_window(payload)
    assert selected == {
        "label": "last_7_days",
        "update_checks": 8,
        "downloads": 3,
        "errors": 0,
    }

    summary = build_report_summary(payload)
    signals = build_report_signals(payload)
    interpretation = interpret_report_fallback(payload)

    assert "Downloads: 3 (7d)" in summary
    assert "No download activity recorded" not in signals
    assert "downloads present" in interpretation.lower()


def test_report_logic_all_zero_low_signal() -> None:
    payload: dict[str, Any] = {
        "update_checks": {"today": 0},
        "downloads": {"today": 0, "present": False},
        "errors": {"today": 0},
    }

    summary = build_report_summary(payload)
    signals = build_report_signals(payload)
    interpretation = interpret_report_fallback(payload)

    assert "Telemetry is low-signal in this window." in summary
    assert "No download activity recorded" in signals
    assert "Baseline: significantly low signal across period" in signals
    assert interpretation == "Telemetry is thin; all counters are zero in this window."


def test_report_logic_checks_only() -> None:
    payload: dict[str, Any] = {
        "update_checks": {"today": 6},
        "downloads": {"today": 0, "present": False},
        "errors": {"today": 0},
    }

    summary = build_report_summary(payload)
    interpretation = interpret_report_fallback(payload)

    assert "Update checks: 6" in summary
    assert "Downloads: 0" in summary
    assert interpretation == "Update check activity present but no downloads recorded."


def test_report_logic_errors_present() -> None:
    payload: dict[str, Any] = {
        "update_checks": {"today": 5},
        "downloads": {"today": 1, "present": True},
        "errors": {"today": 4},
    }

    signals = build_report_signals(payload)
    interpretation = interpret_report_fallback(payload)

    assert "Recent error activity present (4 errors)" in signals
    assert interpretation == "Recent error activity present; investigation recommended."


def test_report_logic_downloads_exceed_update_checks_signal() -> None:
    payload: dict[str, Any] = {
        "update_checks": {"today": 4},
        "downloads": {"today": 10, "present": True},
        "errors": {"today": 0},
    }

    signals = build_report_signals(payload)

    assert "Downloads exceed update checks in selected window" in signals
    assert "No download activity recorded" not in signals
