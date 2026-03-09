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
from utils.formatting import split_message
from utils.logger import get_logger

log = get_logger(__name__)

_TELEMETRY_SYSTEM_PROMPT = (
    "You are Agent Smith, a strict telemetry analyst. Treat input as operational "
    "telemetry only. Be concise. Summarize only what is present. Identify anomalies, "
    "trends, and limits. Do not invent missing data. Do not imply prior context. "
    "Do not behave conversationally."
)


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

        sanitized_payload = validation["sanitized_json"]
        telemetry_json = json.dumps(sanitized_payload, indent=2, sort_keys=True)
        analysis_prompt = (
            "Analyze this telemetry and output exactly these sections:\n"
            "Summary\n"
            "Notable signals\n"
            "Likely interpretation\n"
            "Confidence / limits\n\n"
            f"Route: {route_label}\n"
            f"HTTP status: {status_code}\n"
            "Sanitized telemetry JSON:\n"
            f"{telemetry_json}"
        )

        messages = [
            {"role": "system", "content": _TELEMETRY_SYSTEM_PROMPT},
            {"role": "user", "content": analysis_prompt},
        ]

        try:
            analysis = await self.ollama.chat(messages, model=settings.OLLAMA_MODEL)
        except OllamaError as exc:
            log.error(
                "operator_action_analysis_error command=%s user_id=%s route=%s status=%s error=%s",
                command_name,
                user_id,
                route_label,
                status_code,
                exc,
            )
            await interaction.followup.send(
                "\n".join(
                    [
                        f"Route: {route_label}",
                        f"HTTP status: {status_code if status_code is not None else 'unknown'}",
                        "JSON parse: ok",
                        f"Result: backend retrieval succeeded, analysis unavailable ({exc})",
                    ]
                )
            )
            return

        log.info(
            "operator_action_success command=%s user_id=%s route=%s status=%s",
            command_name,
            user_id,
            route_label,
            status_code,
        )

        reply = "\n".join(
            [
                f"Route: {route_label}",
                f"HTTP status: {status_code if status_code is not None else 'unknown'}",
                "JSON parse: ok",
                "",
                analysis.strip() or "No analysis generated.",
            ]
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
