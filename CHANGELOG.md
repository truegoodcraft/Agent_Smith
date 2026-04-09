# Changelog

## [0.8.5] — 2026-04-08

### Fixed

*   **BUS Core site report now preserves the richer legacy Lighthouse path**: `/report site:buscore` now routes to bare Lighthouse `/report` instead of normalized `view=site`, restoring the richer BUS Core operator sections (`Summary`, `Today`, `Traffic`, `Human Traffic`, `Observability`, `Identity`, `Read`) without changing Lighthouse.
*   **Normalized site routing retained for non-BUS Core sites**: `/report site:star_map_generator` and `/report site:tgc_site` continue to use normalized `view=site&site_key=<site_key>` handling with null-honest rendering.
*   **All-sites operator path preserved**: Bare `/report` continues to request `view=fleet` and return the all-sites summary.

### Added

*   **Routing regression tests for BUS Core exception behavior**: Added contract coverage proving `site:buscore` uses the legacy path while `site:star_map_generator`, `site:tgc_site`, and bare `/report` keep their intended operator routes.

## [0.8.4] — 2026-04-08

### Changed

*   **Lighthouse terminology normalization across Smith docs/contracts**: Updated language in `README.md`, `CONTRACTS.md`, and `SOT.md` to use canonical Lighthouse terms for support classes, capability layers, shared comparable events, and field-meaning freeze.
*   **Operator wording now emphasizes capability-layer differences over parity assumptions**: Documentation now explicitly states that normalization does not mean equal telemetry richness and that unsupported metrics remain null/omitted by contract.
*   **Telemetry authority boundary language hardened**: Smith docs now consistently define Lighthouse as telemetry/normalization authority and Smith as a read-only deterministic consumer.
*   **Canonical source-layer distinction documented**: Added explicit wording that Cloudflare traffic, first-party standardized events, and BUS Core legacy pageviews are distinct, non-equivalent layers.
*   **Per-site section naming aligned in operator output wording**: Site report operator heading is now `Human Traffic / Events` to match canonical normalized per-site contract language.
*   **Glossary and operator request examples added**: Added compact terminology glossary and "How to ask for telemetry changes" examples using capability-layer language.

## [0.8.3] — 2026-04-08

### Fixed

*   **Site parser now accepts and renders all Lighthouse site payload fields**: Previously Smith was dropping or not displaying available Lighthouse site report fields. Now all fields are properly parsed with alias normalization and deterministic formatting.
*   **Summary section now displays expanded observability fields**: Added `accepted_events_7d`, `last_received_at`, and `has_recent_signal` to site summary output when present.
*   **Events section expanded with full event details**: Site events now display `accepted_events`, `unique_paths`, `by_event_name` distribution, and top lists for sources, campaigns, and referrers.
*   **Health section displays complete observability metrics**: Added `included_events`, `excluded_test_mode`, `excluded_non_production_host`, `cloudflare_traffic_enabled`, and `production_only_default` to site health observability output.
*   **Traffic section includes cloudflare_traffic_enabled state**: Traffic payload section now displays Cloudflare traffic enablement status.
*   **Site identity section now renders when present**: Optional site `identity` block is now parsed and formatted with demographic and returning-user attribution data.

### Added

*   **Comprehensive test coverage for expanded site payload**: Added 7 new contract tests verifying all expanded site report fields are correctly parsed, normalized (with alias support), and displayed in deterministic output.
*   **Event detail normalization helpers**: Added `normalizeSiteReportEvents()` with support for `by_event_name` maps and event top-list arrays.
*   **New type definitions**: Added `SiteReportEventTopItem`, `SiteReportEventsByName`, and `SiteReportIdentity` types to support expanded payload shapes.
*   **Event list formatting utilities**: Added `formatSiteEventsTopList()` and `formatSiteEventsByName()` to render event detail sections with proper markdown formatting.

### Changed

*   **Site report message structure enhanced**: `/report site:<site_key>` output now includes separate `Summary`, `Traffic`, `Events`, and `Observability` sections with all available Lighthouse fields. Optional `Identity` section renders when present.
*   **Field formatting consistency applied across sections**: All sections use consistent null-to-unavailable rendering, no boolean coercion, and preserve numeric zero values as zero (never dropping them).

## [0.8.2] — 2026-04-08

### Fixed

*   **Lighthouse field-drop regression in simplified `/report` output**: Restored correct surfacing of observability fields that were being incorrectly rendered as unavailable when Lighthouse provided them.
*   **Alias-aware telemetry normalization for fleet/site/source-health**: Smith now accepts Lighthouse alias keys and maps them into canonical internal fields:
  * `accepted_signal_7d` or `accepted_events_7d`
  * `last_received_at` or `last_received`
  * `cloudflare_traffic_enabled` or `traffic_enabled`
*   **All-sites observability totals repaired**: Fleet `Accepted signal 7d total` now computes from available normalized counts instead of falling back to unavailable when alias keys are used upstream.
*   **Operator visibility restored for available fields**: Fleet/site/source-health formatting now preserves and displays available accepted-signal counts, last-received timestamps, and traffic-enabled flags.

### Added

*   **Regression tests for dropped-field scenarios**: Added coverage proving alias fields are normalized and rendered correctly for fleet/site/source-health and for operator paths `/report` and `/report site:<site_key>`.

## [0.8.1] — 2026-04-08

### Changed

*   **`/report` is now operator-first by default**: Bare `/report` now routes to Lighthouse `view=fleet` and returns the all-sites operational report. `/report site:<site_key>` now routes directly to Lighthouse `view=site&site_key=<site_key>` and is the primary one-site path.
*   **Command surface simplified while preserving compatibility**: `site` is now the primary operator option; `view` remains available as an advanced compatibility override (`fleet`, `legacy`, `source_health`, `site`).
*   **Fleet and site presentation reshaped to BUS Core-style operational flow**: All-sites output now uses `Report · OK · 7d`, `Sites Summary`, `Observability`, and `Read`. Site output now uses `Report · <Site Label> · 7d`, `Summary`, `Today`, `Traffic`, `Human Traffic / Events`, `Observability`, and `Read`.
*   **Source-health noise reduced**: Unavailable `has_recent_signal` fields are no longer rendered as low-value operator noise.
*   **`accepted_signal_7d` semantics tightened**: Smith now treats `accepted_signal_7d` as numeric count telemetry in fleet/site/source-health payload families; boolean values are sanitized as unavailable.

### Added

*   **Contract tests for simplified operator paths**: Added tests for bare `/report` all-sites behavior and `/report site:buscore|tgc_site|star_map_generator` routing/output behavior.
*   **Output integrity tests**: Added tests for numeric `accepted_signal_7d`, unavailable-not-zero rendering, and reduced source-health signal-state noise in primary operator paths.

## [0.8.0] — 2026-04-08

### Added

*   **Automated Discord slash command registration**: Added `scripts/register-commands.ts` to register the full live command surface directly from repository command definitions using `DISCORD_APPLICATION_ID` and `DISCORD_BOT_TOKEN`.
*   **Dry-run registration mode**: Added `npm run register:commands:dry-run` to validate and print the exact payload without sending it to Discord.
*   **Code-owned command schema source of truth**: Added per-command `definition` payloads in `src/commands/health.ts` and `src/commands/report.ts`, and exported aggregate `commandDefinitions` from `src/commands/index.ts`.

### Changed

*   **Deploy workflow now syncs schema after deploy**: `.github/workflows/deploy.yml` now runs `npm run register:commands` after successful Cloudflare deployment.
*   **`/report` schema now codified in command definition**: Registration payload now includes `view` and `site` options directly from repo code, aligned with runtime behavior.
*   **Documentation alignment**: Updated `README.md` and `SOT.md` to document automated registration and in-repo schema authority.

## [0.7.0] — 2026-04-08

### Added

*   **Multi-view Lighthouse `/report` support**: Added explicit support for legacy (`/report`), `view=fleet`, `view=site&site_key=<site_key>`, and `view=source_health` using a single `LIGHTHOUSE_REPORT_URL` base endpoint with query parameters appended in code.
*   **Typed payload handling by view family**: Added explicit payload parsing/normalization for legacy, fleet, site, and source-health views, plus known Lighthouse 400 payloads (`invalid_view`, `missing_site_key`, `invalid_site_key`).
*   **View-aware deterministic formatting**: Added fleet, site, and source-health deterministic formatters while preserving legacy report formatting behavior.
*   **Contract tests for Lighthouse consumption**: Added TypeScript tests covering fleet/site/source-health parsing, known 400 error mapping, null/unavailable rendering semantics, legacy compatibility, and non-model report path enforcement.

### Changed

*   **`/report` command option routing**: `/report` now accepts `view` (`legacy`, `fleet`, `site`, `source_health`) and `site` options with deterministic routing and operator-facing errors for missing/invalid site and invalid view.
*   **Null preservation behavior**: Report parsing and rendering now preserve nullable values through formatting and render unavailable values honestly instead of coercing to zero.
*   **No local telemetry composition**: Smith now consumes Lighthouse view payloads directly without local reconstruction of Lighthouse-side composition.
*   **Governance docs aligned**: Updated `SOT.md`, `CONTRACTS.md`, and `README.md` for multi-view `/report` behavior and Lighthouse authority.

## [0.6.4] — 2026-03-26

### Added

*   **Optional `identity` block support for `/report`**: Extended `src/types/telemetry.ts` to parse and normalize Lighthouse identity telemetry (`today`, `last_7_days`, and `top_sources_by_returning_users`) as an additive optional section.
*   **Identity summary rendering**: Extended `src/logic/report.ts` to render a dedicated `Identity` section with today/7d new users, returning users, sessions, return rate, and top sources by returning users.
*   **Conservative identity read-lines**: Added identity-aware interpretation lines for anonymous return activity, early/tiny-signal language, sessions-vs-users depth inference, and source-quality signaling from returning-user attribution.

### Changed

*   **Partial identity field tolerance**: Identity parsing now accepts missing subfields without failing the report; missing numeric values render as `unavailable` rather than fabricated values.
*   **No-regression fallback behavior preserved**: Reports without `identity` continue to render in the existing style with no identity claims.
*   **Contract alignment**: Updated `CONTRACTS.md` to document consumed identity fields, rendered output shape, and conservative language guardrails for interpretation.

## [0.6.3] — 2026-03-25

### Fixed

*   **`src/types/telemetry.ts` syntax corruption repaired**: Removed mangled/truncated code inserted around the normalize block that caused parser failures (`Expression expected`, `';' expected`, `Identifier expected`, `Unterminated regular expression literal`, and final missing `}`) during `npm run typecheck`.
*   **Normalization/sanitization path preserved**: Kept `normalizeLighthouseReport()` present and active with required-core validation and optional-section sanitization behavior intact.
*   **Type export/helper continuity restored**: Reintroduced missing `SelectedReport` export and `isReportHumanTrafficNarrow()` helper reference continuity so downstream report typing compiles without changing report behavior.

## [0.6.2] — 2026-03-25

### Fixed

*   **`/report` parsing now uses explicit normalization/sanitization**: Added `normalizeLighthouseReport()` in `src/types/telemetry.ts` and switched `src/services/lighthouse.ts` to return only normalized data to downstream logic.
*   **Required core enforced correctly**: Only `today.update_checks`, `today.downloads`, and `today.errors` are required for payload acceptance.
*   **Optional sections sanitized to `undefined` when invalid**: `last_7_days`, `yesterday`, `month_to_date`, `traffic`, and `human_traffic` are now validated and sanitized; invalid optional sections no longer crash formatting.
*   **`trends` handled as optional opaque section**: If present, passed through as optional; if absent, `undefined`.
*   **Unknown top-level keys ignored**: Extra top-level Lighthouse keys are now tolerated and dropped from normalized output.
*   **Removed false `last_7_days` requirement behavior**: Eliminated `return hasOptionalLast7Days` path that could reject otherwise valid payloads.

## [0.6.1] — 2026-03-25

### Fixed

*   **`/report` validation too strict for live Lighthouse payload**: Relaxed schema validation in `src/types/telemetry.ts` to accept Lighthouse responses with varying optional section shapes. Only required fields now: `today` with `update_checks`, `downloads`, `errors`; optional `last_7_days` with the same three core fields if present. All other sections (`yesterday`, `month_to_date`, `trends`, `traffic`, `human_traffic`, `observability`) are now treated as optional and validated narrowly; if malformed, they are safely skipped rather than failing validation.
*   **Unknown top-level keys now tolerated**: Lighthouse responses with extra top-level keys no longer cause schema validation failure.
*   **Narrow validation for optional sections**: Added `isReportTrafficNarrow()` and `isReportHumanTrafficNarrow()` to validate only the fields `/report` actually uses. Optional sections that mismatch expected structure are logged with a warning and skipped rather than failing the entire request.
*   **Debug logging preserved**: Kept existing diagnostic logs (fetch, JSON parse, validation stages) for operator triage during this debug pass.

## [0.6.0] — 2026-03-25

### Added

*   **`/report` debug pass for diagnostics**: Added granular console logging with safe debug codes to identify exactly where `/report` fails after Lighthouse returns HTTP 200.
*   **Debug codes in error messages**: User-facing `/report` error message now includes a safe debug code suffix like `(REPORT_JSON_FAIL)`, `(REPORT_VALIDATION_FAIL)`, or `(REPORT_FORMAT_FAIL)` to indicate the failure stage.
*   **Safe diagnostic logging**: Console logs for fetch, JSON parsing, schema validation, and formatting stages log only safe information: HTTP status, top-level keys, section existence checks, success/failure status—no secrets or full payloads.

### Changed

*   **Console logs added at 7 distinct stages**:
    - `[REPORT_FETCH_OK]`: Lighthouse HTTP 200 confirmed
    - `[REPORT_JSON_OK]`: JSON parsed successfully
    - `[REPORT_TOP_LEVEL_KEYS]`: List of top-level keys from Lighthouse response
    - `[REPORT_VALIDATION_OK]`: Payload passed schema validation
    - `[REPORT_VALIDATION_FAIL]`: Payload failed validation (logged on failure)
    - `[REPORT_FORMAT_OK]`: Report formatted successfully for Discord
    - `[REPORT_FORMAT_FAIL]`: Formatting exception (logged on failure)


## [0.5.9] — 2026-03-25

### Changed

*   **`/report` additive `human_traffic` support**: Extended `src/types/telemetry.ts` and `src/logic/report.ts` so Smith validates and consumes optional Lighthouse `human_traffic` fields while preserving existing report behavior when the block is missing.
*   **New Human Traffic + Observability sections**: `/report` now renders `Human Traffic` and `Observability` sections below `Traffic` when `human_traffic` exists, including pageview totals and non-empty top lists for paths, referrers, and sources.
*   **Read section extended without redesign**: Added a short deterministic human-layer read line when `human_traffic` exists to reflect presence/absence and download-pageview relationship signals.
*   **Contract and SOT alignment**: Updated `CONTRACTS.md` and `SOT.md` to reflect optional `human_traffic` consumption, rendering, and fallback behavior.

## [0.5.8] — 2026-03-24

### Changed

*   **`/report` Lighthouse traffic contract aligned**: Removed all `referrer_summary` expectations from `src/types/telemetry.ts` and `src/logic/report.ts`. Smith now validates and formats traffic using only the current Lighthouse runtime fields.
*   **Traffic section kept stable without referrer output**: `/report` still renders the same `Traffic` section and deterministic read behavior for traffic totals, but it no longer prints or reasons about referrers.
*   **Contract docs updated**: Updated `CONTRACTS.md` and `SOT.md` to reflect the current Lighthouse `/report` traffic block and removed referrer-specific contract language.

## [0.5.7] — 2026-03-23

### Changed

*   **`/report` Lighthouse traffic support**: Updated `src/types/telemetry.ts` and `src/logic/report.ts` so Smith accepts the optional `traffic` block returned by Lighthouse `/report` and formats it directly without creating a separate telemetry model.
*   **Deterministic `/report` output reshaped**: Replaced the old selected-window/trend presentation with `Summary`, `Today`, `Traffic`, and `Read` sections. Traffic values now use Lighthouse field names (`requests`, `visits`) and null values are shown honestly as unavailable.
*   **Backward compatibility for missing traffic**: When Lighthouse omits the entire `traffic` block, `/report` still succeeds and renders `Traffic data not present in this Lighthouse report.`
*   **Governance docs aligned**: Updated `CONTRACTS.md`, `README.md`, and `SOT.md` to describe the new `/report` field consumption and output shape.

## [0.5.6] — 2026-03-23

### Changed

*   **`/report` readability polish**: Updated `src/logic/report.ts` labels to improve Discord readability while preserving the same sections and data. Renamed `Deterministic read` to `Read`, `Deterministic trend` to `Trend`, and status line text to `Report · OK · <window>`.
*   **Temporary report diagnostics removed**: Removed temporary report debug logging from `src/services/lighthouse.ts` and removed user-visible debug codes from `/report` error responses in `src/commands/report.ts`.

## [0.5.5] — 2026-03-23

### Changed

*   **`/report` deterministic presentation refresh**: Updated `src/logic/report.ts` to return a structured output with: status line, selected-window counters, today counters, deterministic read section, and deterministic trend section.
*   **Deterministic comparison rules added**: `/report` now compares today total activity against the 7-day per-day average when `last_7_days` exists, and compares today against yesterday when available. Wording is plain, mechanical, and non-speculative.
*   **Telemetry shape support extended for `/report`**: `src/types/telemetry.ts` now accepts optional `yesterday` and `month_to_date` windows in the validated Lighthouse payload while keeping `today` required.

## [0.5.4] — 2026-03-23

### Changed

*   **Temporary /report diagnostics added**: `src/services/lighthouse.ts` now logs safe, non-secret diagnostics for the report fetch path: URL presence, safe URL origin/path, admin-token presence, response status/statusText, JSON parse success, and payload-validation success.
*   **Safe debug codes surfaced to operator**: `src/commands/report.ts` now returns a short failure code in the ephemeral error message for report failures (`REPORT_URL_MISSING`, `REPORT_FETCH_FAILED`, `REPORT_401`, `REPORT_INVALID_JSON`, `REPORT_INVALID_PAYLOAD`).

## [0.5.3] — 2026-03-23

### Fixed

*   **`wrangler.toml` Durable Object migration**: Replaced invalid `new_classes` key with `new_sqlite_classes` (required by Cloudflare Free plan for SQLite-backed DOs). Also corrected migration tag from `v1-create-do` to `v1`. The DO binding (`AGENT_SMITH_DO` → `SmithDO`) was already correct and is unchanged.

## [0.5.2] — 2026-03-22

### Removed

*   **Deleted orphaned command files**: Removed `src/commands/traffic.ts` and `src/commands/errors.ts` which were left behind in v0.5.1 scope correction. No active code referenced them.
*   **`/traffic` and `/errors` removed from SOT operator surface table**: These deferred entries and accompanying note are no longer listed.

### Changed

*   **SOT.md**: Operator surface now lists only `/health` and `/report`.

## [0.5.1] — 2026-03-22

### Removed (Scope Correction)

*   **`/traffic` command removed from active surface**: Deleted command handler (`src/commands/traffic.ts`), logic module (`src/logic/traffic.ts`), and all provisional traffic types/type-guards from `src/types/telemetry.ts`.
*   **`/errors` command removed from active surface**: Deleted command handler (`src/commands/errors.ts`), logic module (`src/logic/errors.ts`), and all provisional errors types/type-guards from `src/types/telemetry.ts`.
*   **`getLighthouseTraffic()` and `getLighthouseErrors()`** removed from `src/services/lighthouse.ts`.
*   **`LIGHTHOUSE_TRAFFIC_URL` and `LIGHTHOUSE_ERRORS_URL`** removed from `Env` interface, `wrangler.toml` `[vars]`, and `.dev.vars.example`.

### Changed

*   **Command surface narrowed to MVP**: Only `/health` and `/report` are active. `/traffic` and `/errors` are deferred.
*   **`src/commands/index.ts`**: Only imports and registers `health` and `report`.
*   **`CONTRACTS.md`**: Documents only `/health` and `/report` as active commands. `/traffic` and `/errors` listed as deferred.
*   **`SOT.md`**: Operator surface table marks `/traffic` and `/errors` as Deferred. Removed provisional contracts section.
*   **`README.md`**: Commands table shows only `/health` and `/report`. Discord setup curl command registers only those two. Removed traffic/errors endpoint vars from deployment docs.

## [0.5.0] — 2026-03-22

### Added (MVP Completion Pass)

*   **`/traffic` command — live**: Fetches traffic telemetry from `LIGHTHOUSE_TRAFFIC_URL`, validates the response, and returns a deterministic compact summary with interpretation. If the endpoint is not configured, returns an honest "not configured" message. If the fetch or validation fails, returns a safe failure message.
*   **`/errors` command — live**: Fetches error telemetry from `LIGHTHOUSE_ERRORS_URL`, validates the response, and returns a deterministic compact summary with interpretation (including top-5 error breakdown when available). Same honest failure handling as `/traffic`.
*   **Traffic types and logic**: Added `TrafficWindow`, `LighthouseTraffic`, `SelectedTraffic` types with type guards in `src/types/telemetry.ts`. Added `selectTrafficWindow`, `getTrafficInterpretation`, `formatTraffic` in `src/logic/traffic.ts`.
*   **Errors types and logic**: Added `ErrorEntry`, `ErrorWindow`, `LighthouseErrors`, `SelectedErrors` types with type guards in `src/types/telemetry.ts`. Added `selectErrorsWindow`, `getErrorsInterpretation`, `formatErrors` in `src/logic/errors.ts`.
*   **Lighthouse service expanded**: `src/services/lighthouse.ts` now exports `getLighthouseTraffic()` and `getLighthouseErrors()` alongside the existing `getLighthouseReport()`.
*   **Governance enforcement hardened**: `scripts/check-governance.mjs` now checks:
    - VERSION vs CHANGELOG top entry
    - All `src/commands/` handlers have CONTRACTS.md entries
    - `.dev.vars.example` exists
    - No `src/` file imports from `legacy/`
    - SOT.md references current version line
*   **GitHub CI workflow**: Runs `npm ci`, `tsc --noEmit`, governance checks, and tests on push/PR to main.
*   **GitHub Deploy workflow**: Runs gate checks first, then deploys to Cloudflare via `wrangler-action` using GitHub Secrets. Supports `workflow_dispatch` for manual deploys.
*   **`typecheck` npm script**: Added `npm run typecheck` (`tsc --noEmit`).

### Fixed

*   **SmithDO import paths**: Fixed `src/durable/SmithDO.ts` imports from `'./commands'`/`'./types'` to `'../commands'`/`'../types'`.
*   **SmithDO passThroughOnException**: Removed invalid `this.state.passThroughOnException()` call; replaced with no-op.
*   **wrangler.toml migration class**: Fixed `new_classes` from `["AgentSmithDurableObject"]` to `["SmithDO"]`.
*   **Env type completeness**: Added `LIGHTHOUSE_REPORT_URL`, `LIGHTHOUSE_TRAFFIC_URL`, `LIGHTHOUSE_ERRORS_URL` to the `Env` interface.
*   **VERSION/CHANGELOG drift**: Resolved drift where VERSION was 0.4.0 but CHANGELOG top was 0.3.1.

### Changed

*   **wrangler.toml**: Added `[vars]` section with Lighthouse endpoint URLs (empty defaults — must be configured before deployment).
*   **`.dev.vars.example`**: Added Lighthouse URL entries.
*   **package.json**: Version bumped to 0.5.0. Test script no longer exits with error code.
*   **Deploy workflow**: Now gates on type-check + governance before deploying. Uses `npm ci` instead of `npm install`. Added `workflow_dispatch` trigger.
*   **CI workflow**: Added type-check and test steps.
*   Updated `SOT.md`, `CONTRACTS.md`, `README.md` to reflect MVP-complete state.

## [0.3.1] — 2026-03-22

### Fixed

*   **Critical Bug in `/report` Formatting**: Fixed a bug in the `formatReport` function where template literals were being used incorrectly, causing counter values to be displayed as literal strings (e.g., "data.update_checks") instead of their numeric values.
*   **Implementation-Detail Leak in Error Response**: Corrected the error handling in the `/report` command. It no longer leaks internal error messages (e.g., from the Lighthouse service) to the user. Instead, it now shows a generic, user-safe error message while preserving the original error internally for future logging.

## [0.3.0] — 2026-03-22

### Added (Packet 3: /report Command and Lighthouse Integration)

*   **Implemented `/report` Command**: The `/report` command is now fully functional, providing a deterministic summary of backend telemetry.
*   **Lighthouse Service**: Created a new service module at `src/services/lighthouse.ts` to handle fetching and validating the report payload from the `LIGHTHOUSE_REPORT_URL`.
*   **Deterministic Report Logic**:
    *   Created a new logic module at `src/logic/report.ts`.
    *   Implemented canonical window selection, preferring `last_7_days` over `today`.
    *   Implemented the specific deterministic interpretation rules based on window counters.
    *   Implemented response formatting to produce a compact, operator-grade message.
*   **Telemetry Types**: Added formal TypeScript types for the Lighthouse payload in `src/types/telemetry.ts` to ensure type safety.

### Changed

*   Updated `SOT.md` and `CONTRACTS.md` to reflect that the `/report` command is live and to document its exact output shape and behavior.

## [0.2.2] — 2026-03-22

### Removed (Legacy Architecture)

*   **Decommissioned Python Bot**: The legacy Python gateway bot has been fully decommissioned and is no longer an active part of the repository.
    *   All Python source directories (`bot`, `services`, `config`, `ollama`, `utils`, `memory`) were moved into a top-level `legacy/` directory for historical reference.
    *   `main.py` and `requirements.txt` were also moved into `legacy/`.
    *   The Docker-based build and deployment artifacts (`Dockerfile`, `docker-compose.yml`, `.github/workflows/docker.yml`) were permanently deleted.

### Changed

*   All documentation was updated to remove references to the Python bot as an active system. The repository now exclusively describes the Cloudflare Workers architecture.

## [0.2.1] — 2026-03-22

### Added (Packet 2: End-to-End /health Command)

*   **Implemented `/health` command**: Created a working end-to-end path for the `/health` command, which returns a static, deterministic message ("Smith operational. Worker and Durable Object responding.").
*   **Refined Signature Verification**: The Discord signature verification logic in `src/discord.ts` was updated to use the web-standard `TextEncoder` API instead of Node.js `Buffer` for better Cloudflare Workers compatibility.

### Changed

*   **Durable Object Refactoring**:
    *   Renamed `AgentSmithDurableObject` to `SmithDO` for conciseness.
    *   Moved the file from `src/durableObject.ts` to `src/durable/SmithDO.ts`.
    *   Updated `wrangler.toml` and `src/index.ts` to reflect the new name and location.
*   **Updated Governance**: `SOT.md` and `CONTRACTS.md` were updated to reflect the live status and exact output of the `/health` command.

## [0.2.0] — 2026-03-22

### Added (Phoenix Rewrite: Cloudflare Native)

* **Architecture Rewrite**: Began a full rewrite of the bot from a Python Gateway client to a Cloudflare Workers application using TypeScript.
* **Cloudflare Native Scaffolding**:
  * Added `wrangler.toml` for Cloudflare Worker configuration.
  * Added `package.json` for Node.js dependencies and project scripts.
  * Added `tsconfig.json` for TypeScript configuration.
* **Core Components**:
  * Created initial Worker entrypoint (`src/index.ts`).
  * Implemented Discord interaction signature verification (`src/discord.ts`).
  * Created the `AgentSmithDurableObject` class (`src/durableObject.ts`) to act as a single-threaded command processor.
  * Defined core TypeScript types for the application (`src/types.ts`).
* **Command Scaffolding**:
  * Created placeholder handlers for `/report`, `/health`, `/traffic`, and `/errors` in the `src/commands/` directory.
  * Set up a command map for routing interactions to the correct handler.
* **Governance and Documentation**:
  * Added `MIGRATION_README.md` to document the deprecation of the Python architecture.
  * Updated `SOT.md` to reflect the new Cloudflare-native target architecture.

### Changed

* **Deprecated Python Bot**: The entire Python-based gateway bot is now considered legacy. The new source of truth is the TypeScript application in `src/`.
* **Development Workflow**: Local development now uses `wrangler dev` instead of `python main.py`.

### Removed

* **Ollama Dependency**: The new architecture has no dependency on Ollama or any other language model. The bot is 100% deterministic.
* **Python Runtime**: The production service no longer uses Python.
* **Docker**: The `Dockerfile` and `docker-compose.yml` are deprecated and will be removed.

---

## [0.1.6] — 2026-03-19

### Changed (Report Route Deterministic-Only)

* **No model path for `/report`**: `/report` now never calls Ollama. Route policy in `bot/commands.py` enforces deterministic-only handling for report while preserving model support for non-report routes.
* **Short report output shape**: `/report` responses now include only `Summary` and `Interpretation` sections. `Signals` are no longer rendered for report output.
* **Counter-only report interpretation**: `interpret_report_fallback()` now returns deterministic, non-speculative state output derived only from selected-window values:
  - `update_checks`
  - `downloads`
  - `errors`
  and selected window label (`last_7_days` or `today`).
* **No generated prose for `/report`**: Report interpretation is now a compact deterministic state line (for example: `window=today; update_checks=6; downloads=0; errors=0; state=checks_no_downloads`).

### Added

* Added `tests/test_report_route_policy.py` to verify report route model policy marker (`return route_label != "report"`).
* Updated `tests/test_report_logic.py` assertions to validate deterministic report interpretation state output.

## [0.1.5] — 2026-03-19

### Changed (Unified Report Window Semantics)

* **Single window selector for report logic**: Added `select_report_window(payload)` in `services/telemetry_preprocess.py` to enforce one shared selected window for report interpretation paths. The selector always prefers `last_7_days` when present and falls back to `today`.
* **Summary/signals/interpretation alignment**: Refactored `build_report_summary()`, `build_report_signals()`, and `interpret_report_fallback()` to consume the shared selected window instead of independent extraction branches.
* **Quality-gate alignment**: Refactored `SlashCog._quality_gate_interpretation()` (report route) to use the same selected-window logic via `select_report_window()`, removing duplicate window extraction logic in commands layer.
* **Contradiction hardening rule implemented**: `build_report_signals()` now never emits `No download activity recorded` when selected-window downloads are greater than zero.
* **Signal enrichment for mismatch detection**: Added deterministic report signal when selected-window downloads exceed selected-window update checks.

### Added

* New deterministic tests in `tests/test_report_logic.py` covering:
  - 7-day downloads > 0 while today downloads = 0 (window preference and contradiction prevention)
  - All-zero low-signal behavior
  - Checks-only behavior
  - Errors-present behavior
  - Downloads > update checks behavior

### Notes

* Report output layer is now deterministic across Summary, Signals, fallback Interpretation, and report quality-gate checks with shared window semantics.
* Command surface unchanged: `/report`, `/traffic`, `/errors`, `/health` remain the only commands.
