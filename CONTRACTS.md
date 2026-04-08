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
Fetches Lighthouse report views from `LIGHTHOUSE_REPORT_URL`.

- **Request Shape**: `APIApplicationCommandInteraction`
- **Output Shape**: `InteractionResponse` with `ChannelMessageWithSource`.
- **Supported options**:
  - `view` (optional): `legacy`, `fleet`, `site`, `source_health`
  - `site` (optional): `buscore`, `tgc_site`, `star_map_generator`
- **Route behavior**:
  - Bare `/report` uses the legacy Lighthouse contract (`GET /report`).
  - `/report view:legacy` also uses the legacy Lighthouse contract.
  - `/report view:fleet` requests `GET /report?view=fleet`.
  - `/report view:site site:<site_key>` requests `GET /report?view=site&site_key=<site_key>`.
  - `/report view:source_health` requests `GET /report?view=source_health`.
  - If `view=site` and no site is supplied, Smith returns deterministic operator error text and does not call any model path.
  - If `view=fleet` or `view=source_health` and a site is supplied, the site value is ignored.
- **Consumed Lighthouse payload families**:
  - Legacy (`GET /report`): core windows, optional traffic, optional human traffic, optional identity.
  - Fleet (`view=fleet`): `view`, `generated_at`, `sites[]` with per-site metrics and signal health fields.
  - Site (`view=site`): `view`, `generated_at`, `scope`, `summary`, `traffic`, `events`, `health`.
  - Source health (`view=source_health`): `view`, `generated_at`, `sites[]` focused on telemetry integrity fields.
- **Deterministic output expectations**:
  - Legacy formatting remains the structured `Summary`/`Today`/`Traffic`/optional `Human Traffic`/optional `Observability`/optional `Identity`/`Read` output.
  - Fleet formatting is compact per-site and includes label, `site_key`, backend source (if present), recent signal, last received timestamp, and key 7d metrics.
  - Site formatting is sectioned into `Scope`, `Summary`, `Traffic`, `Events`, and `Health`.
  - Source health formatting reports telemetry integrity values only.
  - `null` values must render as unavailable and must not be coerced to `0`.
  - `accepted_signal_7d` is preserved as returned (`number`, `boolean`, or `null`), without coercion.
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
