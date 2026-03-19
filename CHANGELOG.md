# Changelog

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

## [0.1.4] — 2026-03-09

### Changed (Report Interpretation Grounding)

* **Condition-aware interpretation**: `interpret_report_fallback()` now reflects actual data conditions instead of defaulting to generic statements. Checks combinations of update checks, downloads, and errors to produce meaningful interpretations.
* **Zero-download detection**: When downloads are zero but update checks are present, interpretation explicitly mentions "update check activity present but no downloads recorded."
* **Error presence detection**: When errors > 0, interpretation explicitly mentions error activity and recommends investigation.
* **Low-signal awareness**: When most counters are zero or missing, interpretation acknowledges thin telemetry instead of claiming normal activity.
* **Grounding heuristic**: Added model output grounding checks for report route:
  - Rejects model interpretation if downloads == 0 but model doesn't mention limited/no activity
  - Rejects model interpretation if errors > 0 but model doesn't mention errors/issues
  - Rejects model interpretation if data is low-signal but model sounds overly confident (using words like "normal", "healthy", "active")
* **Quality gate enhancement**: `_quality_gate_interpretation()` now accepts preprocessed data and route label to perform route-specific grounding validation.

### Notes

* Interpretation remains 1-2 sentences maximum; no format regression.
* Deterministic fallback now preferred when model output is too generic.
* Command surface unchanged: `/report`, `/traffic`, `/errors`, `/health` remain the only commands.

## [0.1.3] — 2026-03-09

### Changed (Report Summary Strengthening)

* **Report summary enrichment**: `/report` summary section now always includes available core counters (update checks, downloads, errors) when present. Previously, summary could appear empty even when backend data contained useful metrics.
* **Preferred reporting window**: Summary builder now prefers `last_7_days` data when available and falls back to `today` data if not present. This provides more meaningful signal coverage in the summary window.
* **Low-signal detection**: Added deterministic low-signal indicator when most counters are zero or unavailable. Operators now receive explicit feedback: "Telemetry is low-signal in this window."
* **Preprocessing enhancement**: `preprocess_report()` now extracts actual counter values from `last_7_days` payload for use by summary builder, not just summary flags.

### Notes

* Command surface unchanged: `/report`, `/traffic`, `/errors`, `/health` remain the only commands.
* Interpretation remains constrained to one short sentence; no model expansion.
* No raw JSON or internal scaffolding is shown in output.

## [0.1.2] — 2026-03-09

### Changed (Phase 4: Formatter-First Response Architecture)

* **Response composition**: Final Discord responses are now assembled deterministically in Python instead of relying on model output. Internal Python code builds complete structured responses with title line, summary section, signals section, interpretation section, and optional limits. No raw model scaffolding leaks to operators.
* **Model role narrowing**: Ollama is now limited to generating only a brief interpretation (1–3 sentences max, no bullets, no headings, no schema discussion). Model no longer generates summary, signals, or any structural content.
* **Deterministic summary and signals**: Summary bullets and signal bullets are computed entirely in Python from preprocessed payload fields. These sections never depend on model output. Each route has its own `build_report_summary()`, `build_health_summary()`, `build_traffic_summary()`, `build_errors_summary()` (and corresponding `build_*_signals()` functions).
* **Interpretation fallback enhanced**: Added route-specific interpretation fallback functions (`interpret_report_fallback()`, `interpret_health_fallback()`, `interpret_traffic_fallback()`, `interpret_errors_fallback()`) that generate 1–3 sentence operational interpretations using only preprocessed data. Used when model fails, times out, or output fails quality gates.
* **Raw telemetry JSON removal**: Sanitized telemetry JSON is no longer sent to users in normal success responses. That data stays internal to preprocessing pipeline. Operators only see operator-facing summary, signals, and interpretation.
* **Quality gate strengthening**: Model interpretation output is now validated for maximum 500 chars and explicitly rejects patterns like `section:`, `sanitized telemetry`, `route:`, and other internal scaffolding labels. Stronger rejection ensures clean operator experience.
* **Output format simplification**: Final Discord format is now: `Route · HTTP status | Summary | Signals | Interpretation`. No extra narration, no duplicate sections, no filler.

### Notes

* Command surface unchanged: `/report`, `/traffic`, `/errors`, `/health` remain the only commands.
* Security model fully intact: HTTPS enforcement, host allowlist, sanitization, and read-only design unchanged.
* Backward compatible: Existing integrations and command invocations work without change.
* Model is now optional enhancement, not required for correct operation.

## [0.1.1] — 2026-03-09

### Changed (Phase 3: Operator Output Quality)

* **Telemetry preprocessing**: Added deterministic preprocessing layer (`services/telemetry_preprocess.py`) that transforms raw backend JSON into compact operator-facing payloads before any LLM processing. Route-specific preprocessing functions extract only relevant fields, normalize structures, and compute deterministic derived values (day-over-day deltas, availability checks, health signals) without inventing missing data.
* **Model input narrowing**: Raw backend JSON is no longer sent directly to Ollama. The model now receives only compact, preprocessed operator summaries. This eliminates schema narration, generic language, and hallucination of non-existent fields.
* **System prompt tightening**: Updated system prompt to explicitly require structured output format with exact sections (Summary, Signals, Interpretation, Limits) and strict prohibitions on schema description, field invention, and generic language.
* **Response quality guardrails**: Added deterministic quality gate that rejects model outputs exceeding 2000 chars, containing banned phrases (schema narration, generic analytics language), or lacking required sections. Low-quality outputs trigger fallback.
* **Fallback non-LLM formatting**: Added route-specific fallback formatters that produce concise, deterministic operator-readable output using only preprocessed data if Ollama fails, times out, or produces low-quality output. Backend success + model failure still yields useful analysis.
* **Output format**: Responses now strictly structured with 2–4 bullet point summaries, 1–4 bullet point signals, max 3-sentence interpretation, and concise limits. Eliminated essay formatting, schema restating, and filler.

### Notes

* Command surface unchanged: `/report`, `/traffic`, `/errors`, `/health` remain the only commands.
* Security model fully intact: HTTPS enforcement, host allowlist, sanitization, and read-only design unchanged.
* Backward compatible: Existing integrations and command invocations work without change.

## [0.1.0] — 2026-03-09

### Changed (Phase 2: Telemetry Operator Bridge)

* **Telemetry preprocessing**: Added deterministic preprocessing layer (`services/telemetry_preprocess.py`) that transforms raw backend JSON into compact operator-facing payloads before any LLM processing. Route-specific preprocessing functions extract only relevant fields, normalize structures, and compute deterministic derived values (day-over-day deltas, availability checks, health signals) without inventing missing data.
* **Model input narrowing**: Raw backend JSON is no longer sent directly to Ollama. The model now receives only compact, preprocessed operator summaries. This eliminates schema narration, generic language, and hallucination of non-existent fields.
* **System prompt tightening**: Updated system prompt to explicitly require structured output format with exact sections (Summary, Signals, Interpretation, Limits) and strict prohibitions on schema description, field invention, and generic language.
* **Response quality guardrails**: Added deterministic quality gate that rejects model outputs exceeding 2000 chars, containing banned phrases (schema narration, generic analytics language), or lacking required sections. Low-quality outputs trigger fallback.
* **Fallback non-LLM formatting**: Added route-specific fallback formatters that produce concise, deterministic operator-readable output using only preprocessed data if Ollama fails, times out, or produces low-quality output. Backend success + model failure still yields useful analysis.
* **Output format**: Responses now strictly structured with 2–4 bullet point summaries, 1–4 bullet point signals, max 3-sentence interpretation, and concise limits. Eliminated essay formatting, schema restating, and filler.

### Notes

* Command surface unchanged: `/report`, `/traffic`, `/errors`, `/health` remain the only commands.
* Security model fully intact: HTTPS enforcement, host allowlist, sanitization, and read-only design unchanged.
* Backward compatible: Existing integrations and command invocations work without change.

## [0.1.0] — 2026-03-09

### Changed (Phase 2: Telemetry Operator Bridge)

* **User-facing behavior**: Converted from stateless general-purpose chat bridge to narrow, read-only operator telemetry bridge.
* **Command surface**: Removed `/ask`, `/model`, `/models`. Added fixed commands: `/report`, `/traffic`, `/errors`, `/health`.
* **Freeform message handling**: Normal Discord messages no longer trigger LLM responses. Users are directed to use slash commands.
* **Backend integration**: Introduced dedicated backend service layer (`services/backend_client.py`) for fixed-endpoint telemetry calls.
* **Validation and sanitization**: All backend responses are validated and sanitized before LLM analysis (`services/telemetry_validation.py`).
* **Security controls**:
  - HTTPS enforcement for all backend URLs.
  - Host allowlist validation (`BACKEND_ALLOWED_HOSTS`).
  - Explicit request timeout (`BACKEND_TIMEOUT_SECONDS`).
  - Payload size bounds (`BACKEND_MAX_RESPONSE_BYTES`).
  - Sensitive key redaction before LLM (auth tokens, secrets, cookies).
* **Configuration**: Added backend telemetry environment variables for endpoint URLs, timeouts, and auth. All backend URLs and tokens are environment-driven.
* **Error handling**: Invalid backend responses fail clearly and concisely without LLM hallucination.
* **Operator logging**: Added structured logging for operator actions (command invoked, user, channel, route, HTTP status, success/failure).
* **Alert intake foundation**: Added minimal placeholder data shape for future structured alert intake (`services/alert_intake.py`); no webhook server yet.

### Removed

* Freeform chat bridge behavior from normal Discord messages.
* `/ask` command (general-purpose prompt).
* `/model` and `/models` commands (no longer needed for telemetry).
* Per-channel model override logic.
* System prompt for general chat assistance.

### Notes

* Agent Smith is now read-only; no write or mutation actions are exposed.
* Arbitrary shell commands, arbitrary URLs, and autonomous tool selection are forbidden by architecture.
* No conversation memory, no reset flow, no previous-message lookup.
* Each operator command is stateless.

* **User-facing behavior**: Converted from stateless general-purpose chat bridge to narrow, read-only operator telemetry bridge.
* **Command surface**: Removed `/ask`, `/model`, `/models`. Added fixed commands: `/report`, `/traffic`, `/errors`, `/health`.
* **Freeform message handling**: Normal Discord messages no longer trigger LLM responses. Users are directed to use slash commands.
* **Backend integration**: Introduced dedicated backend service layer (`services/backend_client.py`) for fixed-endpoint telemetry calls.
* **Validation and sanitization**: All backend responses are validated and sanitized before LLM analysis (`services/telemetry_validation.py`).
* **Security controls**:
  - HTTPS enforcement for all backend URLs.
  - Host allowlist validation (`BACKEND_ALLOWED_HOSTS`).
  - Explicit request timeout (`BACKEND_TIMEOUT_SECONDS`).
  - Payload size bounds (`BACKEND_MAX_RESPONSE_BYTES`).
  - Sensitive key redaction before LLM (auth tokens, secrets, cookies).
* **Configuration**: Added backend telemetry environment variables for endpoint URLs, timeouts, and auth. All backend URLs and tokens are environment-driven.
* **Error handling**: Invalid backend responses fail clearly and concisely without LLM hallucination.
* **Operator logging**: Added structured logging for operator actions (command invoked, user, channel, route, HTTP status, success/failure).
* **Alert intake foundation**: Added minimal placeholder data shape for future structured alert intake (`services/alert_intake.py`); no webhook server yet.

### Removed

* Freeform chat bridge behavior from normal Discord messages.
* `/ask` command (general-purpose prompt).
* `/model` and `/models` commands (no longer needed for telemetry).
* Per-channel model override logic.
* System prompt for general chat assistance.

### Notes

* Agent Smith is now read-only; no write or mutation actions are exposed.
* Arbitrary shell commands, arbitrary URLs, and autonomous tool selection are forbidden by architecture.
* No conversation memory, no reset flow, no previous-message lookup.
* Each operator command is stateless.

## [0.0.8] — 2026-03-02

### Changed

* Converted to pure stateless request/response bridge.
* Each message triggers exactly one LLM call with no history injected.
* System prompt: "You are Agent Smith. Provide direct, concise answers."

### Removed

* Memory compaction system (`memory/compaction.py`).
* Structured summarizer (`memory/summarizer.py`).
* Message history buffers, rolling context, and reset markers.
* Background compaction tasks and per-channel locks.
* Message counters and threshold logic.
* Auto-channel summary editing and Discord summary channel integration.
* `/reset` slash command (no state to reset).
* `/memory status` slash command.
* All memory-related configuration settings.

## [0.0.4] — 2026-03-02

### Added

* Background memory compaction system.
* Structured LLM-based segment summaries.
* Discord summary channel integration.
* Configurable memory thresholds.

### Architecture

* Introduced mid-term structured memory tier.
* Maintained default fast chat invariant.
* No automatic summary injection into prompt.

## [0.0.5] — 2026-03-02

### Fixed

* Removed rate limiting reintroduction.
* Restored governance handling for SOT/CHANGELOG/VERSION (no file replacement; append-only deltas only).
* Made memory compaction disk I/O non-blocking (threaded).
* Made summary storage append-only and moved retention to a separate live-view file for Discord.

### Notes

* v0.0.4 contained governance regressions; v0.0.5 corrects them without rewriting history.

## [0.0.6] — 2026-03-02

### Fixed

* Restored fast-path history trimming to enforce MAX_CONTEXT_PAIRS for Ollama prompt construction.
* Aligned OLLAMA_MODEL default to tinyllama to match .env.example and dev target.
* Restored full canonical SoT content in SOT.md while preserving appended delta blocks.

## [0.0.7] — 2026-03-02

### Added

* /memory status slash command for per-channel memory observability.

### Notes

* No changes to chat flow.
* No changes to compaction logic.
* No changes to model invocation behavior.
* Purely diagnostic layer.
