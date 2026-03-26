# Changelog

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
