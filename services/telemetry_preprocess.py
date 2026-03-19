"""
telemetry_preprocess.py
=======================
Deterministic preprocessing for backend telemetry payloads.

Transforms raw backend JSON into compact, operator-focused summaries before LLM.
Computes deterministic derived values in Python (deltas, thresholds, availability checks).
Never invents missing data; marks unavailable fields explicitly.
"""
from __future__ import annotations

from typing import Any, cast

_UNAVAILABLE = "[not present in payload]"


def _get_float_or_none(data: dict[str, Any], key: str) -> float | None:
    """Safely extract a float from a dict; return None if absent/invalid."""
    try:
        val = data.get(key)
        if val is None:
            return None
        return float(val)
    except (ValueError, TypeError):
        return None


def _get_int_or_none(data: dict[str, Any], key: str) -> int | None:
    """Safely extract an int from a dict; return None if absent/invalid."""
    try:
        val = data.get(key)
        if val is None:
            return None
        return int(val)
    except (ValueError, TypeError):
        return None


def _get_str_or_none(data: dict[str, Any], key: str) -> str | None:
    """Safely extract a string from a dict; return None if absent."""
    val = data.get(key)
    if val is None:
        return None
    return str(val) if val else None


def _compute_relative_change(
    current: float | None, previous: float | None
) -> str:
    """Return a string describing the relative change between two values."""
    if current is None or previous is None:
        return "unavailable"
    if previous == 0:
        if current == 0:
            return "flat (both zero)"
        return "spike from zero"
    pct_change = ((current - previous) / previous) * 100
    direction = "↑" if pct_change > 0 else "↓" if pct_change < 0 else "→"
    return f"{direction} {abs(pct_change):.1f}%"


def preprocess_report(data: dict[str, Any]) -> dict[str, Any]:
    """
    Extract key fields from a report payload.
    Compute day-over-day deltas for usage metrics.
    Return a compact operator summary.
    """
    # Standard report structure (example):
    # {
    #   "timestamp": "...",
    #   "update_checks": {...},
    #   "downloads": {...},
    #   "errors": {...},
    #   ...
    # }

    summary: dict[str, Any] = {
        "route": "report",
        "timestamp": _get_str_or_none(data, "timestamp") or _UNAVAILABLE,
    }

    # Extract update check data
    update_checks = data.get("update_checks", {})
    if isinstance(update_checks, dict):
        uc_today = _get_int_or_none(update_checks, "today")
        uc_yesterday = _get_int_or_none(update_checks, "yesterday")
        summary["update_checks"] = {
            "today": uc_today,
            "yesterday": uc_yesterday,
            "change": _compute_relative_change(
                float(uc_today) if uc_today is not None else None,
                float(uc_yesterday) if uc_yesterday is not None else None,
            ),
        }
    else:
        summary["update_checks"] = "unavailable"

    # Extract downloads data
    downloads = data.get("downloads", {})
    if isinstance(downloads, dict):
        dl_today = _get_int_or_none(downloads, "today")
        dl_yesterday = _get_int_or_none(downloads, "yesterday")
        summary["downloads"] = {
            "today": dl_today,
            "yesterday": dl_yesterday,
            "change": _compute_relative_change(
                float(dl_today) if dl_today is not None else None,
                float(dl_yesterday) if dl_yesterday is not None else None,
            ),
            "present": dl_today is not None and dl_today > 0,
        }
    else:
        summary["downloads"] = "unavailable"

    # Extract errors data
    errors = data.get("errors", {})
    if isinstance(errors, dict):
        err_today = _get_int_or_none(errors, "today")
        err_yesterday = _get_int_or_none(errors, "yesterday")
        summary["errors"] = {
            "today": err_today,
            "yesterday": err_yesterday,
            "change": _compute_relative_change(
                float(err_today) if err_today is not None else None,
                float(err_yesterday) if err_yesterday is not None else None,
            ),
            "present": err_today is not None and err_today > 0,
        }
    else:
        summary["errors"] = "unavailable"

    # Check for last_7_days and month_to_date usage signals
    last_7d = data.get("last_7_days")
    if isinstance(last_7d, dict):
        summary["last_7_days_summary"] = (
            "data present" if any(last_7d.values()) else "no activity"
        )
        # Extract actual counter values from last_7_days for summary builder
        summary["last_7_days"] = {
            "update_checks": _get_int_or_none(last_7d, "update_checks"),
            "downloads": _get_int_or_none(last_7d, "downloads"),
            "errors": _get_int_or_none(last_7d, "errors"),
        }
    else:
        summary["last_7_days_summary"] = "unavailable"
        summary["last_7_days"] = None

    month_to_date = data.get("month_to_date")
    if isinstance(month_to_date, dict):
        summary["month_to_date_summary"] = (
            "data present" if any(month_to_date.values()) else "no activity"
        )
    else:
        summary["month_to_date_summary"] = "unavailable"

    return summary


def preprocess_health(data: dict[str, Any]) -> dict[str, Any]:
    """
    Extract key fields from a health payload.
    Return status, major component status, and notable degradations.
    """
    # Standard health structure (example):
    # {
    #   "status": "healthy|unhealthy|degraded",
    #   "components": {...},
    #   "checks": [...],
    #   ...
    # }

    summary: dict[str, Any] = {
        "route": "health",
        "timestamp": _get_str_or_none(data, "timestamp") or _UNAVAILABLE,
        "status": _get_str_or_none(data, "status") or _UNAVAILABLE,
    }

    # Extract component status
    components = data.get("components", {})
    if isinstance(components, dict):
        component_status: dict[str, str] = {}
        for comp_name, comp_data in components.items():
            if isinstance(comp_data, dict):
                status = _get_str_or_none(comp_data, "status")
                component_status[str(comp_name)] = status or "unknown"
            else:
                component_status[str(comp_name)] = str(comp_data)
        summary["components"] = component_status
    else:
        summary["components"] = {}

    # Extract checks (if present)
    checks = data.get("checks", [])
    if isinstance(checks, list):
        check_summary = []
        for check in checks[:5]:  # Limit to first 5 checks
            if isinstance(check, dict):
                name = _get_str_or_none(check, "name") or "unknown"
                check_status = _get_str_or_none(check, "status") or "unknown"
                check_summary.append(f"{name}={check_status}")
        if check_summary:
            summary["checks"] = "; ".join(check_summary)

    # Determine overall health signal
    status = summary.get("status", "").lower()
    if status == "healthy":
        summary["health_signal"] = "operational"
    elif status == "unhealthy":
        summary["health_signal"] = "critical"
    else:
        summary["health_signal"] = status or "unknown"

    return summary


def preprocess_traffic(data: dict[str, Any]) -> dict[str, Any]:
    """
    Extract key fields from a traffic payload.
    Return request counts, top routes, latency metrics.
    """
    # Standard traffic structure (example):
    # {
    #   "timestamp": "...",
    #   "total_requests": {...},
    #   "routes": {...},
    #   "latency_ms": {...},
    #   ...
    # }

    summary: dict[str, Any] = {
        "route": "traffic",
        "timestamp": _get_str_or_none(data, "timestamp") or _UNAVAILABLE,
    }

    # Extract total requests
    total_reqs = data.get("total_requests", {})
    if isinstance(total_reqs, dict):
        today = _get_int_or_none(total_reqs, "today")
        yesterday = _get_int_or_none(total_reqs, "yesterday")
        summary["total_requests"] = {
            "today": today,
            "yesterday": yesterday,
            "change": _compute_relative_change(
                float(today) if today is not None else None,
                float(yesterday) if yesterday is not None else None,
            ),
        }
    else:
        summary["total_requests"] = "unavailable"

    # Extract routes (limit to top 3-5)
    routes = data.get("routes", {})
    if isinstance(routes, dict):
        route_list = []
        for route_name in list(routes.keys())[:5]:
            route_data = routes[route_name]
            if isinstance(route_data, dict):
                count = _get_int_or_none(route_data, "count")
                route_list.append(f"{route_name}={count}")
            else:
                route_list.append(f"{route_name}={route_data}")
        if route_list:
            summary["top_routes"] = "; ".join(route_list)

    # Extract latency
    latency_ms = data.get("latency_ms", {})
    if isinstance(latency_ms, dict):
        p50 = _get_float_or_none(latency_ms, "p50")
        p95 = _get_float_or_none(latency_ms, "p95")
        p99 = _get_float_or_none(latency_ms, "p99")
        summary["latency"] = {
            "p50_ms": p50,
            "p95_ms": p95,
            "p99_ms": p99,
        }

    return summary


def preprocess_errors(data: dict[str, Any]) -> dict[str, Any]:
    """
    Extract key fields from an errors payload.
    Return error counts, top error types, and severity distribution.
    """
    # Standard errors structure (example):
    # {
    #   "timestamp": "...",
    #   "total_errors": {...},
    #   "by_type": {...},
    #   "by_severity": {...},
    #   ...
    # }

    summary: dict[str, Any] = {
        "route": "errors",
        "timestamp": _get_str_or_none(data, "timestamp") or _UNAVAILABLE,
    }

    # Extract total errors
    total_errs = data.get("total_errors", {})
    if isinstance(total_errs, dict):
        today = _get_int_or_none(total_errs, "today")
        yesterday = _get_int_or_none(total_errs, "yesterday")
        summary["total_errors"] = {
            "today": today,
            "yesterday": yesterday,
            "change": _compute_relative_change(
                float(today) if today is not None else None,
                float(yesterday) if yesterday is not None else None,
            ),
            "nonzero_today": today is not None and today > 0,
        }
    else:
        summary["total_errors"] = "unavailable"

    # Extract error types (top 5)
    by_type = data.get("by_type", {})
    if isinstance(by_type, dict):
        type_list = []
        for err_type in list(by_type.keys())[:5]:
            count = by_type[err_type]
            if isinstance(count, dict):
                count = count.get("count", count.get("total", "?"))
            type_list.append(f"{err_type}={count}")
        if type_list:
            summary["top_error_types"] = "; ".join(type_list)

    # Extract severity distribution
    by_severity = data.get("by_severity", {})
    if isinstance(by_severity, dict):
        sev_list = []
        for severity in ["critical", "error", "warning", "info"]:
            count = by_severity.get(severity)
            if count is not None:
                sev_list.append(f"{severity}={count}")
        if sev_list:
            summary["by_severity"] = "; ".join(sev_list)

    return summary


def select_report_window(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Select one report window for all report-layer logic.

    Prefer last_7_days when present, otherwise fall back to today counters.
    Returns a stable structure used by summary/signals/interpretation/quality gates.
    """
    last_7d = payload.get("last_7_days")
    if isinstance(last_7d, dict) and any(v is not None for v in last_7d.values()):
        return {
            "label": "last_7_days",
            "update_checks": _get_int_or_none(last_7d, "update_checks"),
            "downloads": _get_int_or_none(last_7d, "downloads"),
            "errors": _get_int_or_none(last_7d, "errors"),
        }

    update_checks_today = None
    downloads_today = None
    errors_today = None

    update_checks = payload.get("update_checks")
    if isinstance(update_checks, dict):
        update_checks_today = _get_int_or_none(update_checks, "today")

    downloads = payload.get("downloads")
    if isinstance(downloads, dict):
        downloads_today = _get_int_or_none(downloads, "today")

    errors = payload.get("errors")
    if isinstance(errors, dict):
        errors_today = _get_int_or_none(errors, "today")

    return {
        "label": "today",
        "update_checks": update_checks_today,
        "downloads": downloads_today,
        "errors": errors_today,
    }


# ── Fallback formatters (no LLM) ──────────────────────────────────────────────


# ── Deterministic summary builders ──────────────────────────────────────────


def build_report_summary(payload: dict[str, Any]) -> list[str]:
    """
    Build deterministic summary bullets for report.
    
    Prefers last_7_days data when available, falls back to today.
    Includes low-signal detection when most counters are zero or missing.
    """
    bullets = []
    
    selected = select_report_window(payload)
    update_checks_val = selected["update_checks"]
    downloads_val = selected["downloads"]
    errors_val = selected["errors"]
    window_label = " (7d)" if selected["label"] == "last_7_days" else ""
    
    # Always include available core counters
    if update_checks_val is not None:
        bullets.append(f"Update checks: {update_checks_val}{window_label}")
    
    if downloads_val is not None:
        bullets.append(f"Downloads: {downloads_val}{window_label}")
    
    if errors_val is not None:
        bullets.append(f"Errors: {errors_val}{window_label}")
    
    # Low-signal detection: if most counters are zero or missing
    counters_present = sum(
        1 for v in [update_checks_val, downloads_val, errors_val] if v is not None
    )
    counters_nonzero = sum(
        1 for v in [update_checks_val, downloads_val, errors_val] 
        if v is not None and v > 0
    )
    
    if counters_present > 0 and counters_nonzero == 0:
        bullets.append("Telemetry is low-signal in this window.")
    elif counters_present == 0:
        bullets.append("Telemetry is low-signal in this window.")
    
    return bullets


def build_health_summary(payload: dict[str, Any]) -> list[str]:
    """Build deterministic summary bullets for health."""
    bullets = []

    status = payload.get("status", "unknown")
    signal = payload.get("health_signal", status)
    if signal != "unknown":
        bullets.append(f"Status: {signal}")

    # Count degraded components
    comps = payload.get("components", {})
    if isinstance(comps, dict):
        degraded_count = sum(
            1 for v in comps.values() if v and v not in ("healthy", "ok")
        )
        healthy_count = sum(
            1 for v in comps.values() if v in ("healthy", "ok")
        )
        if healthy_count or degraded_count:
            bullets.append(f"Components: {healthy_count} healthy, {degraded_count} degraded")

    return bullets


def build_traffic_summary(payload: dict[str, Any]) -> list[str]:
    """Build deterministic summary bullets for traffic."""
    bullets = []

    reqs = payload.get("total_requests")
    if isinstance(reqs, dict):
        today = reqs.get("today")
        if today is not None:
            bullets.append(f"Total requests: {today}")

    # Top routes
    routes = payload.get("top_routes")
    if routes:
        # Extract just the route names
        route_names = [r.split("=")[0] for r in routes.split("; ")][:3]
        if route_names:
            bullets.append(f"Top routes: {', '.join(route_names)}")

    # Latency
    latency = payload.get("latency", {})
    if isinstance(latency, dict):
        p50 = latency.get("p50_ms")
        p95 = latency.get("p95_ms")
        if p50 is not None:
            bullets.append(f"Latency p50: {p50:.0f}ms")
        if p95 is not None:
            bullets.append(f"Latency p95: {p95:.0f}ms")

    return bullets


def build_errors_summary(payload: dict[str, Any]) -> list[str]:
    """Build deterministic summary bullets for errors."""
    bullets = []

    errs = payload.get("total_errors")
    if isinstance(errs, dict):
        today = errs.get("today")
        if today is not None:
            bullets.append(f"Total errors: {today}")

    types = payload.get("top_error_types")
    if types:
        type_list = [t.split("=")[0] for t in types.split("; ")][:3]
        if type_list:
            bullets.append(f"Top types: {', '.join(type_list)}")

    return bullets


# ── Deterministic signal builders ──────────────────────────────────────────


def build_report_signals(payload: dict[str, Any]) -> list[str]:
    """Generated signals for report based on thresholds and movement."""
    signals = []

    selected = select_report_window(payload)
    update_checks_val = selected["update_checks"]
    downloads_val = selected["downloads"]
    errors_val = selected["errors"]

    # Hard rule: never emit "No download activity recorded" when downloads > 0.
    if downloads_val is not None and downloads_val == 0:
            signals.append("No download activity recorded")

    if errors_val is not None and errors_val > 0:
        signals.append(f"Recent error activity present ({errors_val} errors)")

    if (
        update_checks_val is not None
        and downloads_val is not None
        and downloads_val > update_checks_val
    ):
        signals.append("Downloads exceed update checks in selected window")

    counters_present = sum(
        1 for v in [update_checks_val, downloads_val, errors_val] if v is not None
    )
    counters_nonzero = sum(
        1
        for v in [update_checks_val, downloads_val, errors_val]
        if v is not None and v > 0
    )
    if counters_present == 0 or counters_nonzero == 0:
        signals.append("Baseline: significantly low signal across period")

    return signals


def build_health_signals(payload: dict[str, Any]) -> list[str]:
    """Generate signals for health based on actual state."""
    signals = []

    signal = payload.get("health_signal", "").lower()
    if signal == "critical":
        signals.append("Critical condition detected")
    elif signal == "degraded":
        signals.append("Degradation detected")

    # Check for specific component issues
    comps = payload.get("components", {})
    if isinstance(comps, dict):
        critical = [k for k, v in comps.items() if v and "critical" in str(v).lower()]
        if critical:
            signals.append(f"Critical components: {', '.join(critical[:2])}")

    return signals


def build_traffic_signals(payload: dict[str, Any]) -> list[str]:
    """Generate signals for traffic based on deltas and thresholds."""
    signals = []

    reqs = payload.get("total_requests")
    if isinstance(reqs, dict):
        change = reqs.get("change", "")
        if "↑" in change:
            # Spike signal
            if any(x in change for x in ["50%", "100%", "200%"]):
                signals.append(f"Traffic surge: {change}")
        elif "↓" in change:
            # Drop signal
            if any(x in change for x in ["50%", "100%"]):
                signals.append(f"Traffic decline: {change}")

    # Latency alert
    latency = payload.get("latency", {})
    if isinstance(latency, dict):
        p95 = latency.get("p95_ms")
        if p95 is not None and p95 > 1000:
            signals.append(f"High latency: p95={p95:.0f}ms")

    return signals


def build_errors_signals(payload: dict[str, Any]) -> list[str]:
    """Generate signals for errors based on status and movement."""
    signals = []

    errs = payload.get("total_errors")
    if isinstance(errs, dict):
        today = errs.get("today")
        yesterday = errs.get("yesterday")
        is_nonzero = errs.get("nonzero_today", False)
        change = errs.get("change", "")

        if is_nonzero and today:
            signals.append(f"Active errors: {today} today")

            # Movement signal
            if "↑" in change and "100%" in change:
                signals.append("Error rate doubled since yesterday")
            elif "↑" in change and "200%" in change:
                signals.append("Error rate tripled or more since yesterday")
            elif "↓" in change:
                signals.append("Error rate declining")

    return signals


# ── Deterministic interpretation fallbacks ────────────────────────────────────


def interpret_report_fallback(payload: dict[str, Any]) -> str:
    """
    Generate fallback interpretation for report (no model).
    
    Condition-aware: reflects actual data state (errors, downloads, update checks).
    Prefers combinations over generic fallback.
    """
    selected = select_report_window(payload)
    uc_today = selected["update_checks"]
    dl_today = selected["downloads"]
    err_today = selected["errors"]
    
    # Low-signal detection
    counters_present = sum(1 for v in [uc_today, dl_today, err_today] if v is not None)
    counters_nonzero = sum(1 for v in [uc_today, dl_today, err_today] if v is not None and v > 0)
    
    if counters_present > 0 and counters_nonzero == 0:
        return "Telemetry is thin; all counters are zero in this window."
    elif counters_present == 0:
        return "Telemetry is unavailable or incomplete."
    
    # Condition-aware interpretation based on actual values
    has_update_checks = uc_today is not None and uc_today > 0
    has_downloads = dl_today is not None and dl_today > 0
    has_errors = err_today is not None and err_today > 0
    
    # Prioritize error + no downloads case (most operationally important)
    if has_errors and not has_downloads and has_update_checks:
        return "Recent errors present; update checks active but no downloads recorded."
    elif has_errors:
        return "Recent error activity present; investigation recommended."
    elif not has_downloads and has_update_checks:
        return "Update check activity present but no downloads recorded."
    elif has_downloads and has_update_checks and not has_errors:
        return "Normal activity: update checks and downloads present with no errors."
    else:
        return "Limited activity in this telemetry window."


def interpret_health_fallback(payload: dict[str, Any]) -> str:
    """Generate fallback interpretation for health (no model)."""
    signal = payload.get("health_signal", "unknown").lower()
    
    if signal == "critical":
        return "System is in critical state and immediate investigation is recommended."
    elif signal == "degraded":
        return "System shows degradation; review component status and recent changes."
    elif signal == "operational":
        return "System is operating normally."
    else:
        return "Health status is unknown or unavailable."


def interpret_traffic_fallback(payload: dict[str, Any]) -> str:
    """Generate fallback interpretation for traffic (no model)."""
    reqs = payload.get("total_requests", {})
    latency = payload.get("latency", {})

    high_latency = False
    if isinstance(latency, dict):
        p95 = latency.get("p95_ms")
        if p95 is not None and p95 > 1000:
            high_latency = True

    change = ""
    if isinstance(reqs, dict):
        change = reqs.get("change", "").lower()

    if high_latency:
        return "Request latency is elevated; consider reviewing backend performance."
    elif "↑" in change and ("100%" in change or "200%" in change):
        return "Traffic volume has increased significantly."
    elif "↓" in change:
        return "Traffic volume has declined compared to previous period."
    else:
        return "Traffic activity is within normal ranges."


def interpret_errors_fallback(payload: dict[str, Any]) -> str:
    """Generate fallback interpretation for errors (no model)."""
    errs = payload.get("total_errors", {})
    
    if not isinstance(errs, dict):
        return "Error data is unavailable."

    today = errs.get("today")
    is_nonzero = errs.get("nonzero_today", False)
    change = errs.get("change", "").lower()

    if not is_nonzero or today == 0:
        return "No errors recorded in this period."
    elif "↑" in change and ("100%" in change or "200%" in change):
        return "Error rate has increased sharply; investigation is advised."
    elif "↑" in change:
        return "Error rate is higher than prior period."
    elif "↓" in change:
        return "Error rate is trending downward."
    else:
        return f"Errors remain at nonzero level ({today} total)."


# ── Route configuration (builder and interpreter mapping) ──────────────────


ROUTE_HANDLERS = {
    "report": {
        "preprocess": preprocess_report,
        "builder_summary": build_report_summary,
        "builder_signals": build_report_signals,
        "interpret_fallback": interpret_report_fallback,
    },
    "health": {
        "preprocess": preprocess_health,
        "builder_summary": build_health_summary,
        "builder_signals": build_health_signals,
        "interpret_fallback": interpret_health_fallback,
    },
    "traffic": {
        "preprocess": preprocess_traffic,
        "builder_summary": build_traffic_summary,
        "builder_signals": build_traffic_signals,
        "interpret_fallback": interpret_traffic_fallback,
    },
    "errors": {
        "preprocess": preprocess_errors,
        "builder_summary": build_errors_summary,
        "builder_signals": build_errors_signals,
        "interpret_fallback": interpret_errors_fallback,
    },
}
