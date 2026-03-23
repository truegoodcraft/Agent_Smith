"""Slash commands for fixed, read-only backend telemetry operations."""
from __future__ import annotations

import json

import discord
from discord import app_commands
from discord.ext import commands

from bot.permissions import is_channel_allowed, is_user_allowed
from config.settings import settings
from ollama.client import OllamaClient, OllamaError
from services.backend_client import BackendClient
from services.telemetry_validation import validate_and_sanitize
from services.telemetry_preprocess import ROUTE_HANDLERS, select_report_window
from utils.formatting import split_message
from utils.logger import get_logger

log = get_logger(__name__)

# System prompt: model should only generate brief interpretation and optional limits.
# No sections, no bullet points, no scaffolding.
_INTERPRETATION_SYSTEM_PROMPT = (
    "You are an operator briefing system. "
    "Given preprocessed telemetry data, provide a brief interpretation "
    "(1–3 sentences max). "
    "If data is incomplete or ambiguous, note that in 1 sentence max. "
    "Do NOT include section headings, bullet points, or schema discussion. "
    "Speak directly to what the data means operationally."
)

# Quality gate: stronger rejection of model output with internal scaffolding
_BANNED_PATTERNS = {
    "section:",
    "sanitized telemetry",
    "route:",
    "summary:",
    "signals:",
    "limits:",
    "interpretation:",
    "telemetry analyzed includes",
    "convergence ratio",
    "data structure includes",
    "payload contains",
    "schema",
    "the following fields",
    "let me analyze",
    "based on the provided",
    "here's",
    "here are",
}


class SlashCog(commands.Cog):
    """Approved slash command surface for telemetry operations."""

    def __init__(self, bot: commands.Bot, ollama: OllamaClient) -> None:
        self.bot = bot
        self.ollama = ollama
        self.backend = BackendClient()

    def _check_permissions(self, interaction: discord.Interaction) -> bool:
        if not is_channel_allowed(interaction.channel):  # type: ignore[arg-type]
            return False
        if not is_user_allowed(interaction.user):  # type: ignore[arg-type]
            return False
        return True

    @staticmethod
    def _should_use_model_for_route(route_label: str) -> bool:
        """Report is deterministic-only; other routes may use model interpretation."""
        return route_label != "report"

    def _quality_gate_interpretation(
        self, output: str, preprocessed: dict, route_label: str
    ) -> bool:
        """
        Validate model interpretation output.
        Reject if it contains internal scaffolding, is too long, or is too generic
        compared to actual data conditions (grounding check).
        """
        # Max reasonable interpretation is ~500 chars (Discord allows 2000)
        if len(output) > 500:
            log.warning("quality_gate interpretation_too_long length=%d", len(output))
            return False

        output_lower = output.lower()

        # Reject if contains banned patterns (especially internal scaffolding)
        for pattern in _BANNED_PATTERNS:
            if pattern in output_lower:
                log.warning("quality_gate banned_pattern detected=%s", pattern)
                return False

        # Must have some content
        if not output.strip():
            log.warning("quality_gate interpretation_empty")
            return False

        # === GROUNDING HEURISTIC (v0.1.4+) ===
        # Reject model output if it's more generic than deterministic fallback.
        # Apply route-specific grounding checks.
        if route_label == "report":
            selected = select_report_window(preprocessed)
            dl_today = selected["downloads"]
            err_today = selected["errors"]
            uc_today = selected["update_checks"]

            # Check for low-signal condition
            counters_present = sum(
                1 for v in [uc_today, dl_today, err_today] if v is not None
            )
            counters_nonzero = sum(
                1 for v in [uc_today, dl_today, err_today] if v is not None and v > 0
            )
            is_low_signal = (counters_present > 0 and counters_nonzero == 0) or (
                counters_present == 0
            )

            # Grounding check 1: If downloads == 0, model must mention limited/no activity
            if dl_today is not None and dl_today == 0:
                activity_mentioned = any(
                    phrase in output_lower
                    for phrase in [
                        "no download",
                        "zero download",
                        "without download",
                        "but no download",
                        "limited activity",
                        "no activity",
                        "thin",
                        "low-signal",
                    ]
                )
                if not activity_mentioned:
                    log.warning(
                        "quality_gate grounding_check_failed route=%s reason=zero_downloads_not_mentioned",
                        route_label,
                    )
                    return False

            # Grounding check 2: If errors > 0, model must mention errors/issues
            if err_today is not None and err_today > 0:
                error_mentioned = any(
                    phrase in output_lower
                    for phrase in [
                        "error",
                        "issue",
                        "problem",
                        "failure",
                        "concern",
                    ]
                )
                if not error_mentioned:
                    log.warning(
                        "quality_gate grounding_check_failed route=%s reason=errors_not_mentioned",
                        route_label,
                    )
                    return False

            # Grounding check 3: If low-signal, model must not sound overly confident
            if is_low_signal:
                overly_confident = any(
                    phrase in output_lower
                    for phrase in [
                        "normal",
                        "healthy",
                        "good",
                        "strong",
                        "active",
                    ]
                )
                if overly_confident:
                    log.warning(
                        "quality_gate grounding_check_failed route=%s reason=low_signal_but_confident",
                        route_label,
                    )
                    return False

        return True

    def _build_response(
        self,
        route_label: str,
        status_code: int | None,
        preprocessed: dict,
        interpretation: str | None = None,
    ) -> str:
        """
        Build final Discord response in Python (formatter-first).
        
        Structure:
        - Title line with route and status
        - Summary section (deterministic)
        - Signals section (deterministic, optional)
        - Interpretation section (model-generated or fallback)
        - Limits section (if data is thin, optional)
        """
        lines = []

        # Title line: Route and HTTP status
        status_str = f"HTTP {status_code}" if status_code else "HTTP unknown"
        lines.append(f"{route_label.capitalize()} · {status_str}")
        lines.append("")

        # Get route handlers
        handlers = ROUTE_HANDLERS.get(route_label)
        if not handlers:
            return "\n".join(lines) + "Unknown route."

        if route_label == "report":
            summary_bullets = handlers["builder_summary"](preprocessed)
            if summary_bullets:
                lines.append("**Summary**")
                for bullet in summary_bullets:
                    lines.append(f"· {bullet}")
                lines.append("")

            lines.append("**Interpretation**")
            lines.append(handlers["interpret_fallback"](preprocessed))
            return "\n".join(lines).strip()

        # Build Summary section (fully deterministic)
        summary_bullets = handlers["builder_summary"](preprocessed)
        if summary_bullets:
            lines.append("**Summary**")
            for bullet in summary_bullets:
                lines.append(f"· {bullet}")
            lines.append("")

        # Build Signals section (fully deterministic)
        signal_bullets = handlers["builder_signals"](preprocessed)
        if signal_bullets:
            lines.append("**Signals**")
            for bullet in signal_bullets:
                lines.append(f"· {bullet}")
            lines.append("")

        # Interpretation section: use model output if good, otherwise fallback
        use_fallback_interpretation = True
        if interpretation and self._quality_gate_interpretation(
            interpretation, preprocessed, route_label
        ):
            use_fallback_interpretation = False
            lines.append("**Interpretation**")
            lines.append(interpretation.strip())
            lines.append("")
        else:
            # Use deterministic fallback
            fallback = handlers["interpret_fallback"](preprocessed)
            lines.append("**Interpretation**")
            lines.append(fallback)
            lines.append("")

        if use_fallback_interpretation:
            log.info("interpretation_fallback_used route=%s", route_label)

        # Note: Limits section is omitted unless explicitly returned by model.
        # We only show limits if data is known to be thin, but Summary and Signals
        # already indicate that through their content.

        return "\n".join(lines).strip()

    async def _run_telemetry_command(
        self,
        interaction: discord.Interaction,
        command_name: str,
        route_label: str,
    ) -> None:
        if not self._check_permissions(interaction):
            await interaction.response.send_message(
                "You do not have permission to use this command here.",
                ephemeral=True,
            )
            return

        await interaction.response.defer(thinking=True)

        user_id = getattr(interaction.user, "id", None)
        channel_id = interaction.channel_id
        log.info(
            "operator_action command=%s user_id=%s channel_id=%s route=%s",
            command_name,
            user_id,
            channel_id,
            route_label,
        )

        fetchers = {
            "report": self.backend.get_report,
            "traffic": self.backend.get_traffic,
            "errors": self.backend.get_errors,
            "health": self.backend.get_health,
        }
        result = await fetchers[route_label]()

        validation = validate_and_sanitize(result)
        status_code = result.get("status_code")
        parse_state = "ok" if validation.get("parse_ok") else "failed"

        # If backend retrieval failed, report clearly and return
        if not validation.get("ok"):
            log.warning(
                "operator_action_failed command=%s user_id=%s route=%s status=%s error=%s",
                command_name,
                user_id,
                route_label,
                status_code,
                validation.get("error"),
            )
            await interaction.followup.send(
                "\n".join(
                    [
                        f"Route: {route_label}",
                        f"HTTP status: {status_code if status_code is not None else 'unknown'}",
                        f"JSON parse: {parse_state}",
                        f"Result: failed - {validation.get('error')}",
                    ]
                )
            )
            return

        # === DETERMINISTIC PREPROCESSING ===
        sanitized_payload = validation["sanitized_json"]
        handlers = ROUTE_HANDLERS.get(route_label)
        if not handlers:
            log.error("Unknown route: %s", route_label)
            await interaction.followup.send("Unknown route.")
            return

        preprocessed = handlers["preprocess"](sanitized_payload)
        log.debug(
            "preprocessing_complete route=%s preprocessed_keys=%s",
            route_label,
            list(preprocessed.keys()),
        )

        # === OPTIONAL MODEL CALL FOR INTERPRETATION ONLY ===
        # Model receives compact preprocessed payload, asked to generate
        # only interpretation (1–3 sentences max), no sections/bullets.
        interpretation = None
        use_fallback = False

        if self._should_use_model_for_route(route_label):
            preprocessed_json = json.dumps(preprocessed, indent=2, sort_keys=True)
            interpretation_prompt = (
                f"Preprocessed telemetry ({route_label}):\n"
                f"{preprocessed_json}\n\n"
                "Provide a 1–3 sentence interpretation of this data. "
                "No headings, no bullets, no schema discussion."
            )

            messages = [
                {"role": "system", "content": _INTERPRETATION_SYSTEM_PROMPT},
                {"role": "user", "content": interpretation_prompt},
            ]

            try:
                interpretation = await self.ollama.chat(messages, model=settings.OLLAMA_MODEL)
                log.debug(
                    "ollama_interpretation_received route=%s output_len=%d",
                    route_label,
                    len(interpretation),
                )
            except OllamaError as exc:
                log.warning(
                    "ollama_error route=%s error=%s",
                    route_label,
                    exc,
                )
                use_fallback = True

            # === QUALITY GATE: REJECT IF SCAFFOLDING LEAKED OR UNGROUNDED ===
            if interpretation and not use_fallback:
                if not self._quality_gate_interpretation(
                    interpretation, preprocessed, route_label
                ):
                    log.warning(
                        "quality_gate_interpretation_rejected route=%s",
                        route_label,
                    )
                    use_fallback = True

        # === BUILD FINAL RESPONSE IN PYTHON ===
        # Summary and Signals are 100% deterministic.
        # Interpretation is model-generated if available, else fallback.
        # No raw JSON shown.
        reply = self._build_response(
            route_label, status_code, preprocessed, interpretation
        )

        log.info(
            "operator_action_success command=%s user_id=%s route=%s status=%s",
            command_name,
            user_id,
            route_label,
            status_code,
        )

        chunks = split_message(reply)
        await interaction.followup.send(chunks[0])
        for chunk in chunks[1:]:
            await interaction.channel.send(chunk)  # type: ignore[union-attr]



    @app_commands.command(name="report", description="Fetch and analyze telemetry report")
    async def report(self, interaction: discord.Interaction) -> None:
        await self._run_telemetry_command(interaction, "/report", "report")

    @app_commands.command(name="traffic", description="Fetch and analyze traffic telemetry")
    async def traffic(self, interaction: discord.Interaction) -> None:
        await self._run_telemetry_command(interaction, "/traffic", "traffic")

    @app_commands.command(name="errors", description="Fetch and analyze error telemetry")
    async def errors(self, interaction: discord.Interaction) -> None:
        await self._run_telemetry_command(interaction, "/errors", "errors")

    @app_commands.command(name="health", description="Fetch and analyze health telemetry")
    async def health(self, interaction: discord.Interaction) -> None:
        await self._run_telemetry_command(interaction, "/health", "health")
