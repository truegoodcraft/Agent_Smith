# Command Contracts

This document defines the canonical input/output contracts for Agent Smith's active slash commands. All deterministic logic must adhere to these shapes.

Telemetry authority is Lighthouse. Smith is a read-only consumer and deterministic operator formatter.

TGC analytics policy defines the company baseline analytics language. Smith uses that policy vocabulary when explaining report scope, but Smith does not redefine telemetry semantics.

## TGC Analytics Baseline

Smith uses the following TGC analytics policy levels when describing analytics scope:

- Page Level
- Host Level
- App Level
- User Level
- Internal

## Canonical Terminology

Smith contract language uses Lighthouse canonical terms:

- Support classes: `legacy_hybrid`, `event_only`, `event_plus_cf_traffic`, `not_yet_normalized`
- Capability layers: `Layer 1 Registry`, `Layer 2 Event`, `Layer 3 Traffic`, `Layer 4 Identity`, `Layer 5 Extension`
- Comparable shared events: `page_view`, `outbound_click`, `contact_click`, `service_interest`
- Field meaning freeze: `accepted_signal_7d`, `accepted_events_7d`, `has_recent_signal`, `last_received_at`, `cloudflare_traffic_enabled`

Normalization language constraints:

- `TRACKED_SITES` is the canonical property registry.
- `/metrics/event` is the canonical fleet telemetry path.
- `/metrics/pageview` is BUS Core legacy-only support.
- `dev_mode` is the canonical cross-site developer/operator suppression contract.
- Normalization does not imply equal telemetry richness across sites.
- Unsupported sections/metrics remain null or are omitted by documented rule.
- Cloudflare traffic, first-party standardized events, and BUS Core legacy pageviews are distinct source layers.

Per-site expectation constraints:

- `buscore` is `legacy_hybrid` and may legitimately render richer report sections.
- `star_map_generator` is `event_only` and should be evaluated mainly on event telemetry, `page_view` events where used, and path/source/referrer/src attribution from events.
- `tgc_site` is `event_only` unless Lighthouse capability layers change upstream.
- Lack of Layer 3 Traffic or Layer 4 Identity support is not automatically a defect.
- Host traffic is not the same as page/app execution.
- Identity is optional and support-class dependent.
- Null or omitted values are honest when a layer is unsupported or unavailable.

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
  - `/report site:buscore` requests legacy `GET /report` and returns the richer BUS Core legacy report output.
  - `/report site:star_map_generator` requests `GET /report?view=site&site_key=star_map_generator` and returns normalized one-site output.
  - `/report site:tgc_site` requests `GET /report?view=site&site_key=tgc_site` and returns normalized one-site output.
  - If both `site` and `view` are supplied, `site` takes precedence and Smith uses the operator-first site routing above.
  - `/report view:legacy` requests legacy `GET /report` for compatibility.
  - `/report view:source_health` requests `GET /report?view=source_health` for advanced telemetry-integrity diagnostics.
  - `/report view:site` without a site returns deterministic operator error text.
- **Consumed Lighthouse payload families**:
  - Legacy (`GET /report`): core windows, optional traffic, optional human traffic, optional identity.
  - Fleet (`view=fleet`): `view`, `generated_at`, `sites[]` with per-site metrics and signal health fields.
  - Site (`view=site`): `view`, `generated_at`, `scope`, `summary`, `traffic`, `events`, `health`.
  - Source health (`view=source_health`): `view`, `generated_at`, `sites[]` focused on telemetry integrity fields.
  - Field-name compatibility for observability values:
    - Accepted signal count: `accepted_signal_7d` or `accepted_events_7d`
    - Last received timestamp: `last_received_at` or `last_received`
    - Traffic enabled flag: `cloudflare_traffic_enabled` or `traffic_enabled`
- **Deterministic output expectations**:
  - Fleet/all-sites formatting is sectioned as `Report · OK · 7d`, `Sites Summary`, `Observability`, and `Read`.
  - `site:buscore` is a permitted legacy-rich exception at the report-consumption layer and uses legacy section flow: `Report · OK · 7d`, `Summary`, `Today`, `Traffic`, `Human Traffic`, `Observability`, `Identity`, `Read` (`Identity` is optional).
  - Site formatting follows canonical normalized per-site flow: `Report · <Site Label> · 7d`, `Summary`, `Today`, `Traffic`, `Event Telemetry`, `Observability`, `Identity`, `Read` (`Identity` is optional).
  - Normalized site summary includes support-class framing where Smith has authoritative site-class knowledge.
  - For `event_only` sites, event telemetry output is prioritized and should prominently surface `page_view` count, attribution lists present in the payload, event-name breakdown, and observability before optional traffic-layer detail.
  - Section naming and content do not imply telemetry parity between support classes.
  - Site read-lines should preserve the distinction between Layer 2 page/event attribution and Layer 3 traffic metrics.
  - Site read-lines should not imply that missing traffic or identity layers are defects when the site does not support them.
  - Event-only sites should describe unsupported traffic and identity layers as unsupported by design when Lighthouse does not provide those layers.
  - Event-only sites should use one compact unsupported-by-design note for traffic/identity layers rather than repeating unavailable language across multiple sections.
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

## Operator Guidance

Preferred request examples:

- "Add a traffic layer to TGC."
- "Keep Star Map event_only."
- "Add an extension layer to Star Map."
- "Do not add identity to this site."
- "Add shared outbound_click coverage to Buscore."

Anti-pattern:

- Do not ask to "make it like Buscore" unless the request explicitly names the capability layers to add.

## Deferred Commands

`/traffic` and `/errors` are planned but not part of the current MVP. They have no active handlers, services, types, or logic in the runtime.

## Error Handling

The interaction endpoint has the following deterministic error behaviors:

-   **Malformed Request/Invalid JSON**: If the request body is not valid JSON, the Worker will return an `HTTP 500` and post an ephemeral message to Discord stating: `An unexpected error occurred while processing your command.`
-   **Unknown Command**: If a user invokes a valid slash command that is not recognized by the bot, the Worker will return an `HTTP 400` and a public message stating: `Unknown command: [command_name]`.
-   **Unsupported Interaction Type**: If the Worker receives a valid but unsupported interaction type (e.g., a message component interaction), it will return an `HTTP 400` and an ephemeral message stating: `Error: Unsupported interaction type.`
