# Statement of Truth (SoT) — Agent Smith

**Newest SOT entries supersede all older wording. Agents must read this file top-to-bottom. Historical deltas are preserved for audit only.**

## Current Mission (v0.10.3 — policy authority alignment)

Agent Smith is a Cloudflare-native, deterministic, personal-use watcher for fixed, read-only backend telemetry. It is built on Cloudflare Workers, Durable Objects, and Discord interactions over HTTP.

**[v0.10.3 Policy Authority Alignment]** Smith docs/contracts/operator wording now treat the updated TGC Analytics Policy document (`TGC Analytics Policie.md`) as the governing language authority for analytics levels, support classes, capability layers, null honesty, and per-property expectations.

Active v0.10.3 authority and expectation rules include:

- TGC Analytics Policy is the company-level language and expectation authority.
- Lighthouse remains telemetry/report-data authority.
- Smith remains a read-only consumer/presenter and does not redefine telemetry architecture.
- Company analytics levels in Smith wording are: `Page Level`, `Host Level`, `App Level`, `User Level`, `Internal`.
- Shared comparable events remain: `page_view`, `outbound_click`, `contact_click`, `service_interest`.
- Counted intent and non-counted public read wording remains distinct.
- Host traffic wording remains distinct from page/app execution wording.
- Global filter wording reflects `production_only` default true, `dev_mode` suppression standard, and null-honest unsupported metrics.

Per-property wording contract now in force:

- `buscore` stays `legacy_hybrid`, intentionally richer, and explicitly grandfathered as the richer exception.
- `star_map_generator` stays `event_only` with `Page Level` analytics scope and capability layers `L1 yes / L2 yes / L3 no / L4 no / L5 yes`.
- Star Map expected useful output remains `page_view`, extension events, top paths, top sources, top campaigns, top contents, top referrers.
- Missing Star Map request/visit/identity metrics are unsupported by design and not treated as report failure.
- `tgc_site` stays `event_only` with no traffic layer and no identity layer unless Lighthouse changes upstream.

**[v0.10.2 Production-Scope Rendering Clarity]** Smith normalized one-site reporting now preserves empty-vs-absent event breakdown semantics and makes production filtering explicit so empty attribution lists are no longer mysterious.

Active production-scope and attribution clarity rules now include:

- `events.top_contents` is accepted and rendered when Lighthouse provides it.
- `events.by_event_name`, `events.top_paths`, `events.top_sources`, `events.top_campaigns`, `events.top_referrers`, and `events.top_contents` keep empty-array/empty-object semantics when explicitly present.
- `unavailable` is used for absent/unsupported fields; explicitly present empty breakdown lists render as empty current-scope results, not unavailable.
- Production filtering state is made explicit using site scope/health fields (including `production_only` and `excluded_non_production_host` when present).
- Event-only read lines now include explicit production-filter guidance when attribution is empty under production-only scope.

**[v0.10.1 Event-Only Report Cleanup Fix]** Smith normalized one-site reporting now preserves and surfaces usable Lighthouse event telemetry for `event_only` sites instead of dropping or drowning it in fallback wording.

Active event-only rendering rules now include:

- Section order: `Summary`, `Event Telemetry`, `Attribution`, `Observability`, `Today` (only when meaningful), `Traffic`, `Read`
- `accepted_events_7d` leads the summary and event telemetry output using the best available summary/event alias source.
- Event-name breakdown renders whenever `events.by_event_name` is present, including extension events such as `preview_generated`.
- Top paths render whenever `events.top_paths` is present, even when there is only one path.
- Top sources, top campaigns, and top referrers render whenever Lighthouse provides those attribution lists.
- `unavailable` is reserved for truly absent values; Smith must not label useful event telemetry as unavailable when the payload contains it.
- Support-class explanation is compact, and unsupported Layer 3/Layer 4 wording is limited to one short note instead of repeated report spam.

**[v0.10.0 Event-Only Operator Usefulness]** Smith normalized one-site reporting now prioritizes current event telemetry data for `event_only` properties so Star Map/TGC outputs are more operator-useful for real eyes and attribution.

Event-only priority order in report presentation:

- `page_view` event count
- top paths (when Lighthouse provides them)
- top sources
- top campaigns
- top referrers
- event-name breakdown
- observability
- one compact unsupported-by-design note for Layer 3/Layer 4 gaps

Presentation rules for this pass:

- If Lighthouse provides fields, Smith shows them.
- If only `page_view` is present, Smith says that explicitly.
- Smith avoids spending most of the report on repeated unavailable traffic/identity phrasing for `event_only` sites.

**[v0.9.0 Site Reporting Language Cleanup]** Smith report presentation, docs, and contracts now explicitly frame site reports by Lighthouse support class and capability layer without implying BUS Core parity.

**[v0.9.0 Site Reporting Language Cleanup]** Smith report presentation, docs, and contracts now explicitly frame site reports by Lighthouse support class and capability layer without implying BUS Core parity.

Normalized site-report wording now follows these active rules:

- `star_map_generator` and `tgc_site` read as `event_only` properties.
- Unsupported Layer 3 Traffic and Layer 4 Identity should read as unsupported by design when Lighthouse does not provide those layers.
- Event telemetry should be described as event telemetry, `page_view` events where used, and path/source/referrer attribution from events.
- BUS Core remains `legacy_hybrid`, intentionally richer, and not the universal template for all properties.
- Lighthouse field meanings remain intact; Smith changes wording and presentation only.

**[v0.8.6 Analytics Framing Alignment]** Smith documentation, contracts, and operator read-lines now explicitly align to TGC analytics policy language and Lighthouse support-class expectations.

TGC analytics policy is the company baseline for analytics scope language. Smith uses the following TGC levels when describing analytics scope:

- `Page Level`
- `Host Level`
- `App Level`
- `User Level`
- `Internal`

Authority boundaries remain explicit:

- Lighthouse is the telemetry authority and normalization authority.
- TGC analytics policy defines the company baseline analytics language.
- Smith formats and explains reports; it does not define telemetry semantics.

Expectation framing is now explicit by support class:

- `buscore` is `legacy_hybrid` and may legitimately expose richer operator sections.
- `star_map_generator` is `event_only` and should be evaluated mainly on page-level and event-level telemetry.
- `tgc_site` is `event_only` unless capability layers change upstream in Lighthouse.

Star Map expectations are explicit in active docs/contracts/operator wording:

- Useful Star Map telemetry includes event telemetry, `page_view` events where used, top paths, source/referrer/src attribution from events, and explicit funnel events if added later.
- Lack of Layer 3 Traffic or Layer 4 Identity support is not automatically a defect.
- Reduced telemetry richness is not itself a defect when the site is only intended to support lighter telemetry.

Operator wording must preserve these rules:

- Host traffic is not the same as page/app execution.
- Identity is optional and support-class dependent.
- Null or omitted values are honest when a layer is unsupported or unavailable.
- Unsupported Layer 3 or Layer 4 coverage should read as unsupported by design, not as broken.
- BUS Core richness is not the universal standard for all properties.

**[v0.8.5 BUS Core Legacy-Rich Exception]** `/report` remains operator-first with split routing by site key:

- Bare `/report` => all-sites summary via `GET /report?view=fleet`
- `/report site:buscore` => BUS Core legacy-rich report via bare `GET /report`
- `/report site:star_map_generator` => normalized one-site report via `GET /report?view=site&site_key=star_map_generator`
- `/report site:tgc_site` => normalized one-site report via `GET /report?view=site&site_key=tgc_site`

BUS Core is explicitly allowed to remain a legacy-rich exception at the report-consumption layer. Smith does not redesign or flatten BUS Core into the normalized site-view ceiling when the legacy `/report` path provides richer operator fields. Non-BUS Core sites retain normalized site-view handling and null-honesty semantics.

**[v0.8.4 Lighthouse Language Alignment]** Smith documentation and operator language are normalized to Lighthouse canonical terminology. Smith remains read-only and does not define telemetry semantics.

Canonical terminology now used across Smith docs/contracts/operator wording:

- Support classes: `legacy_hybrid`, `event_only`, `event_plus_cf_traffic`, `not_yet_normalized`
- Capability layers: `Layer 1 Registry`, `Layer 2 Event`, `Layer 3 Traffic`, `Layer 4 Identity`, `Layer 5 Extension`
- Shared comparable event names: `page_view`, `outbound_click`, `contact_click`, `service_interest`
- Shared field meaning freeze: `accepted_signal_7d`, `accepted_events_7d`, `has_recent_signal`, `last_received_at`, `cloudflare_traffic_enabled`
- Canonical normalized per-site report sections: `Summary`, `Today`, `Traffic`, `Event Telemetry`, `Observability`, `Identity`, `Read`

Normalization rules reflected in Smith language:

- `TRACKED_SITES` is the canonical property registry.
- `/metrics/event` is the canonical fleet telemetry path.
- `/metrics/pageview` is BUS Core legacy-only support.
- `dev_mode` is the canonical cross-site developer/operator suppression contract.
- Normalization does not imply equal telemetry richness.
- Unsupported sections/metrics remain null or omitted by documented rule.
- Cloudflare traffic, first-party standardized events, and BUS Core legacy pageviews are distinct source layers and are not equivalent.

Current support-class reality reflected in operator language:

- `buscore` => `legacy_hybrid`
- `star_map_generator` => `event_only`
- `tgc_site` => `event_only`

Operator guidance examples now retained in active docs/contracts:

- `Add a traffic layer to TGC`
- `Keep Star Map event_only`
- `Add an extension layer to Star Map`
- `Do not add identity to this site`
- `Add shared outbound_click coverage to Buscore`

Anti-pattern retained in active docs/contracts:

- Do not ask to `make it like Buscore` unless the requested capability layers are named explicitly.

**[v0.8.3 Site Payload Expansion]** The `site` view response parser and formatter now accepts and renders all available Lighthouse site payload fields:

**Summary section** now includes:
- `accepted_events_7d` (aliased from `accepted_signal_7d`)
- `last_received_at` (aliased from `last_received`)
- `has_recent_signal` (boolean signal health indicator)

**Traffic section** now includes:
- `cloudflare_traffic_enabled` at traffic scope (not just scope-level)
- Full `latest_day` and `last_7_days` structures

**Events section** (expanded from minimal events) now includes:
- `accepted_signal_7d` / `accepted_events_7d` (aliased)
- `accepted_events` (total accepted count)
- `unique_paths` (count of unique URL paths)
- `by_event_name` (event type distribution map)
- `top_sources`, `top_campaigns`, `top_referrers` (top lists by name and count)
- `last_received_at` (aliased from `last_received`)
- `has_recent_signal` (boolean)

**Observability section** (health) now includes:
- `dropped_invalid`, `dropped_rate_limited` (event drop counts)
- `last_received_at` (aliased from `last_received`)
- `included_events` (count of events included in processing)
- `excluded_test_mode`, `excluded_non_production_host` (exclusion counts)
- `cloudflare_traffic_enabled` (aliased from `traffic_enabled`)
- `production_only_default` (boolean production filtering flag)

**Identity section** (new optional top-level) now supported:
- `today` window: `new_users`, `returning_users`, `sessions`
- `last_7_days` window: `new_users`, `returning_users`, `sessions`, `return_rate`
- `top_sources_by_returning_users` (top returning-user attribution)

All alias-aware field normalization is applied consistently: `accepted_signal_7d`/`accepted_events_7d`, `last_received_at`/`last_received`, `cloudflare_traffic_enabled`/`traffic_enabled` across all sections.

Null semantics are preserved: missing or explicit `null` values render as unavailable and are never coerced to zero. Deterministic behavior is maintained; no LLM or model-driven interpretation is applied.

## v0.8.2 Mission — /report field-mapping regression fix

Agent Smith is a Cloudflare-native, deterministic, personal-use watcher for fixed, read-only backend telemetry. It is built on Cloudflare Workers, Durable Objects, and Discord interactions over HTTP.

`/report` consumes Lighthouse `/report` as the only source of truth. Smith is read-only and does not compose Lighthouse-side telemetry locally.

`LIGHTHOUSE_REPORT_URL` is treated as a single base endpoint. Smith appends query parameters at request time with an operator-first route policy:
- Default all-sites operator path: bare `/report` → `GET /report?view=fleet`
- Default one-site operator path: `/report site:<site_key>` → `GET /report?view=site&site_key=<site_key>`
- Compatibility path: `/report view:legacy` → legacy `GET /report`
- Advanced compatibility views remain available: `view=fleet`, `view=site`, `view=source_health`

Typed payload handling is explicit for all four response families. Nulls are preserved until formatting and rendered as unavailable, never silently coerced to zero. Known Lighthouse 400 payloads (`invalid_view`, `missing_site_key`, `invalid_site_key`) map to deterministic operator-facing errors. Report handling remains deterministic-only and non-model-driven.

`accepted_signal_7d` is treated as numeric count telemetry in fleet/site/source-health payload families. Boolean coercion is not applied. Output avoids low-value noise such as unavailable signal-state fields in operator-facing sections.

To prevent upstream naming drift from masking available telemetry, Smith now performs alias-aware normalization for key observability fields before formatting:
- `accepted_signal_7d` or `accepted_events_7d`
- `last_received_at` or `last_received`
- `cloudflare_traffic_enabled` or `traffic_enabled`

If Lighthouse provides any of the accepted alias forms above, Smith must surface the value and must not render `unavailable` for that field.

Slash command schema is defined in repository code (`src/commands/*.ts`) and registered to Discord from `scripts/register-commands.ts`. Deployment now performs command registration automatically after successful Worker deploy, preventing runtime/schema drift.

**[v0.6.4 Identity Support]** `/report` now accepts and interprets an optional `identity` block (anonymous new users, returning users, sessions, return rate, and top returning-user sources). Identity is additive and does not replace core counters, traffic, human traffic, or observability signals. Interpretation language is conservative by design: no retention/channel-fit/product-market-fit claims from weak counts; tiny values are framed as early signals only.

**[v0.6.2 Normalization Pipeline]** `normalizeLighthouseReport()` is the authoritative parser for Lighthouse `/report`. Schema acceptance is decoupled from optional section shape by sanitizing optional sections rather than rejecting the whole payload. This removes the prior false coupling where optional `last_7_days` could block otherwise valid payloads.

**[v0.6.3 Syntax Integrity Hotfix]** `src/types/telemetry.ts` had a mangled mid-file insertion around normalization that introduced parse-breaking tokens and an unmatched closing structure. The file was repaired with minimal, non-behavioral syntax restoration. `normalizeLighthouseReport()` remains present and preserves required-core acceptance with optional-section sanitization semantics.

**[v0.6.1 Validation Relaxation]** Schema validation no longer rejects live Lighthouse payloads due to strict optional-section enforcement. `isLighthouseReport()` now uses lenient validation with narrow sub-validators for optional sections. When optional sections are present, `isReportTrafficNarrow()` and `isReportHumanTrafficNarrow()` validate only the fields used by formatting logic. Malformed optional sections are logged with `[REPORT_VALIDATION_WARN]` and skipped rather than failing the entire request.

**[v0.6.0 Debugging Capability]** When `/report` fails after Lighthouse returns HTTP 200, console logs now provide granular diagnostics at 7 stages (fetch, JSON parse, top-level keys, schema validation, formatting). Error responses include safe debug codes like `(REPORT_JSON_FAIL)`, `(REPORT_VALIDATION_FAIL)`, `(REPORT_FORMAT_FAIL)` for operator triage. All logged information is safe: no secrets, no full payloads, only HTTP status, key lists, section existence, and success/failure states.

This is a full rewrite path, not a preservation path for the previous Python implementation.

## Core Architecture

1.  **Discord Interaction:** Discord sends a slash-command interaction to a Cloudflare Worker HTTP endpoint.
2.  **Signature Verification:** The Worker verifies the incoming request signature using the application's public key (`DISCORD_PUBLIC_KEY`).
3.  **Durable Object Routing:** The Worker routes the validated interaction to a singleton Durable Object (`SmithDO`).
4.  **Single-Threaded Orchestration:** The DO acts as a single-threaded "command brain", ensuring commands are processed one at a time.
5.  **Service Fetch:** Dedicated service functions (`src/services/lighthouse.ts`) fetch validated telemetry from Lighthouse backend endpoints.
6.  **Deterministic Logic:** Stateless logic modules (`src/logic/`) apply fixed interpretation rules to produce compact, operator-grade output.
7.  **Response to Discord:** The Worker returns the final deterministic response.

## Core Invariants

1.  **Cloudflare-Native:** The entire service runs on Cloudflare's network. No Python runtime, Docker dependency, or local server in production.
2.  **Stateless Invariant:** Each operator command is independent. The DO does not persist state in v1; it is only a single-threaded execution orchestrator.
3.  **Read-only Invariant:** Agent Smith only retrieves and analyzes telemetry. It does not mutate backend state.
4.  **Deterministic-Only Invariant:** All command outputs are deterministic and derived directly from fetched telemetry. No LLM/model path, no speculative language, no "AI" layer.
5.  **Fixed-Endpoint Invariant:** Active slash commands call fixed backend routes configured via Cloudflare environment variables and secrets.
6.  **Security Invariant:**
    -   Discord interaction signatures are verified for all incoming requests.
    -   Secrets are managed via the Cloudflare dashboard (production) or `.dev.vars` (local) and are never committed to the repository.
7.  **Webhook-Based Interaction:** The bot uses Discord's HTTP-based Interactions, not the persistent Gateway WebSocket connection.

## Operator Surface

| Command    | Status   | Backend                  | Description                      |
| :--------- | :------- | :----------------------- | :------------------------------- |
| `/health`  | Live     | None (static)            | Confirms Worker + DO operational |
| `/report`  | Live     | `LIGHTHOUSE_REPORT_URL`  | Operator-first deterministic report (`/report` all-sites, `/report site:buscore` legacy-rich BUS Core exception, `/report site:tgc_site|star_map_generator` normalized one-site; advanced compatibility views supported). Language follows Lighthouse support classes/capability layers, frames event_only traffic and identity gaps as unsupported by design, and preserves null-honesty semantics. |

See `CONTRACTS.md` for detailed command contracts.

## Deployment

-   **Production:** GitHub Actions → Cloudflare via `wrangler-action`, then Discord slash command registration via `npm run register:commands`. See `.github/workflows/deploy.yml`.
-   **Gate:** CI workflow runs type-check + governance checks before deploy.
-   **Local:** `npm start` → `wrangler dev` with `.dev.vars` for secrets/URLs.
-   **No local-machine dependency** for production deployment.

## Configuration & Secrets Contract

### GitHub Secrets (required for deployment)

| Secret                    | Purpose                           |
| :------------------------ | :-------------------------------- |
| `CLOUDFLARE_API_TOKEN`    | Wrangler deployment auth          |
| `CLOUDFLARE_ACCOUNT_ID`   | Cloudflare account target         |
| `DISCORD_PUBLIC_KEY`      | Pushed to CF as Worker secret     |
| `DISCORD_APPLICATION_ID`  | Pushed to CF as Worker secret     |
| `DISCORD_BOT_TOKEN`       | Pushed to CF as Worker secret     |
| `LIGHTHOUSE_ADMIN_TOKEN`  | Pushed to CF as Worker secret     |

### Cloudflare Runtime Secrets (set via dashboard or wrangler secret)

| Secret                   | Purpose                                    |
| :----------------------- | :----------------------------------------- |
| `DISCORD_PUBLIC_KEY`     | Verify incoming Discord webhook signatures |
| `LIGHTHOUSE_ADMIN_TOKEN` | Authenticate with Lighthouse backend       |
| `DISCORD_APPLICATION_ID` | Discord app ID (setup/management)          |
| `DISCORD_BOT_TOKEN`      | Register/update slash commands             |

### Environment Variables (wrangler.toml `[vars]`)

| Variable                | Purpose                        |
| :---------------------- | :----------------------------- |
| `LIGHTHOUSE_REPORT_URL` | Lighthouse report endpoint     |

### Local Development (.dev.vars)

Template: `.dev.vars.example`. Copy to `.dev.vars` and fill in values.

## Governance

-   `scripts/check-governance.mjs` — run via `npm run check:governance`
-   Enforces: VERSION↔CHANGELOG alignment, command↔CONTRACTS coverage, `.dev.vars.example` existence, no legacy imports in `src/`, SOT version reference.
-   Runs in CI on every push/PR and as a gate before deploy.

---
---

## SOT Deltas (Historical Reference Only)

**The v0.1.x Python-based architecture is fully deprecated as of v0.2.2. All related source files have been moved to the `legacy/` directory for historical reference and are no longer part of the active system.**

(Previous entries related to the v0.1.x Python architecture are preserved below for historical context but are now superseded by the v0.2.0 Cloudflare-native architecture.)

### SOT Delta — v0.1.6+

Agent Smith is a stateless, slash-command-only Discord operator bridge for fixed, read-only backend telemetry...
