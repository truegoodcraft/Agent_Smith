# Changelog

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
