# Changelog

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
