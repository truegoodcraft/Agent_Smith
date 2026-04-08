# Command Contracts

This document defines the canonical input/output contracts for Agent Smith's active slash commands. All deterministic logic must adhere to these shapes.

## Active Commands

### `/health`
Returns a static health check confirming the Worker and Durable Object are operational.

- **Request Shape**: `APIApplicationCommandInteraction`
- **Output Shape**: `InteractionResponse` with `ChannelMessageWithSource`.
- **Deterministic Output Expectations**:
  - The message content must be the static string: `Smith operational. Worker and Durable Object responding.`

### `/report`
Operator-first deterministic report for all tracked sites or one selected site from `LIGHTHOUSE_REPORT_URL`.

- **Request Shape**: `APIApplicationCommandInteraction`
- **Output Shape**: `InteractionResponse` with `ChannelMessageWithSource`.
- **Supported options**:
  - `site` (optional primary path): `buscore`, `tgc_site`, `star_map_generator`
  - `view` (optional compatibility/advanced override): `fleet`, `legacy`, `source_health`, `site`
- **Route behavior (operator-first)**:
  - Bare `/report` requests `GET /report?view=fleet` and returns all-site operator report output.
  - `/report site:<site_key>` requests `GET /report?view=site&site_key=<site_key>` and returns one-site operator output.
  - If both `site` and `view` are supplied, `site` takes precedence and Smith routes to site view.
  - `/report view:legacy` requests legacy `GET /report` for compatibility.
  - `/report view:source_health` requests `GET /report?view=source_health` for advanced telemetry-integrity diagnostics.
  - `/report view:site` without a site returns deterministic operator error text.
- **Consumed Lighthouse payload families**:
  - Legacy (`GET /report`): core windows, optional traffic, optional human traffic, optional identity.
  - Fleet (`view=fleet`): `view`, `generated_at`, `sites[]` with per-site metrics and signal health fields.
  - Site (`view=site`): `view`, `generated_at`, `scope`, `summary`, `traffic`, `events`, `health`.
  - Source health (`view=source_health`): `view`, `generated_at`, `sites[]` focused on telemetry integrity fields.
- **Deterministic output expectations**:
  - Fleet/all-sites formatting is sectioned as `Report · OK · 7d`, `Sites Summary`, `Observability`, and `Read`.
  - Site formatting follows BUS Core-style operator flow: `Report · <Site Label> · 7d`, `Summary`, `Today`, `Traffic`, `Human Traffic / Events`, `Observability`, `Read`.
  - Optional `Identity` is rendered only when present in payload shape.
  - Source health formatting reports telemetry integrity values only and avoids noisy unavailable signal-state fields.
  - `null` values must render as unavailable and must not be coerced to `0`.
  - `accepted_signal_7d` is treated as a numeric count and rendered accordingly.
  - Unavailable signal-state fields must not be rendered as misleading operator noise.
  - `/report` remains deterministic and non-model-driven for all views.
- **Lighthouse error payload handling**:
  - `400 {"ok":false,"error":"invalid_view"}` → deterministic ephemeral operator error.
  - `400 {"ok":false,"error":"missing_site_key"}` → deterministic ephemeral operator error.
  - `400 {"ok":false,"error":"invalid_site_key"}` → deterministic ephemeral operator error.
  - Any other fetch/validation failure returns deterministic ephemeral failure text.

## Deferred Commands

`/traffic` and `/errors` are planned but not part of the current MVP. They have no active handlers, services, types, or logic in the runtime.

## Error Handling

The interaction endpoint has the following deterministic error behaviors:

-   **Malformed Request/Invalid JSON**: If the request body is not valid JSON, the Worker will return an `HTTP 500` and post an ephemeral message to Discord stating: `An unexpected error occurred while processing your command.`
-   **Unknown Command**: If a user invokes a valid slash command that is not recognized by the bot, the Worker will return an `HTTP 400` and a public message stating: `Unknown command: [command_name]`.
-   **Unsupported Interaction Type**: If the Worker receives a valid but unsupported interaction type (e.g., a message component interaction), it will return an `HTTP 400` and an ephemeral message stating: `Error: Unsupported interaction type.`
