# Statement of Truth (SoT)

## Mission

Agent Smith is a Discord-based assistant bridge to Ollama focused on reliable, low-latency conversational operation, clear operational controls, and deterministic behavior under bounded in-memory context.

## Product Invariants

1. **Fast-path chat invariant**
   - The default path remains: `User message -> channel RAM history -> Ollama -> streamed Discord response`.
   - Streaming latency and token flow must not be blocked by non-essential background work.

2. **Prompt grounding invariant**
   - The model only receives context explicitly assembled from the channel buffer and system instructions.
   - No hidden memory injection occurs unless explicitly designed and documented as part of architecture governance.

3. **Bounded context invariant**
   - Per-channel prompt context is bounded by `MAX_CONTEXT_PAIRS` (`2 * pairs` messages maximum).
   - History trimming must be deterministic and consistently applied to both user and assistant appends on the fast path.

4. **Operational safety invariant**
   - Configuration is environment-driven via `config/settings.py` and `.env` defaults.
   - Runtime permissions are enforced via allow-lists for channels/users when configured.

## Architecture Overview

### Runtime Components

- `bot/events.py`
  - Handles incoming Discord messages and orchestrates fast-path streaming.
  - Maintains per-channel RAM history and reset markers.

- `ollama/client.py`
  - Wraps async calls to Ollama APIs for streaming and non-streaming chat.

- `bot/commands.py`
  - Provides slash command controls (`/ask`, `/reset`, `/model`, `/models`).

- `config/settings.py`
  - Centralized configuration defaults and environment loading.

### Memory Architecture

The system uses tiered memory behavior while preserving fast-path semantics:

1. **Active RAM tier**
   - Immediate channel context used for prompt assembly.
   - Bounded for prompt safety and deterministic behavior.

2. **Background compaction tier**
   - Triggered asynchronously at configured thresholds.
   - Produces structured summary segments and raw dropped logs without blocking chat streaming.

3. **Visibility tier**
   - Discord summary channel reflects compacted structured memory via single-message edit-in-place behavior per source channel.

## Governance Rules

1. **Append-only governance records**
   - `CHANGELOG.md` is append-only per release entry.
   - SoT architectural changes are recorded as append-only `SOT Delta` sections.

2. **Version discipline**
   - `VERSION` follows patch increments for corrective and additive changes unless otherwise specified.

3. **No hidden architectural drift**
   - Changes that alter invariants must be explicitly documented in both changelog and SoT delta entries.

4. **No unrelated refactors in corrective patches**
   - Corrective versions should target stated regressions only.

## Configuration Baseline

- Default model target: `tinyllama`.
- Memory compaction defaults are environment configurable and must preserve non-blocking operation for chat streaming.

## SoT Deltas

## SOT Delta — Background Memory Compaction + Structured Mid-Term Memory

- Introduced a 3-tier memory model: short-term active RAM window, mid-term structured summaries, and raw dropped transcript archives.
- Added asynchronous per-channel compaction triggered at a configurable threshold and executed via background tasks with per-channel locks.
- Added append-only structured summary segment files with strict section schema (FACTS, THREADS, DECISIONS, IDEAS, OPEN_LOOPS).
- Enforced bounded RAM by removing compacted messages and preserving only the configured active window after compaction.
- Added Discord summary channel visibility through single-message per-channel summary upsert (create+pin once, then edit in place).
- Preserved chat-path invariants by keeping default chat flow unchanged and avoiding automatic summary prompt injection.

## SOT Delta — v0.0.5 Governance and Performance Corrections

- Removed rate-limiting behavior from chat handling to restore prior runtime interaction invariants.
- Updated versioning and changelog flow as append/update operations without historical rewrite.
- Moved compaction file reads/writes onto threaded I/O boundaries to avoid event-loop blocking during background tasks.
- Split structured summary persistence into append-only archive files (`channel_<id>_archive.md`) and bounded live-view files (`channel_<id>_live.md`).
- Kept Discord summary updates sourced from live-view files while preserving full append-only archival segments.

## SOT Delta — Observability Layer — Memory Dashboard

- Added a diagnostic `/memory status` slash command for per-channel memory observability.
- Implemented read-only memory introspection without introducing architectural behavior changes.
- Preserved fast-path chat invariants and existing compaction/model invocation behavior.
- Added non-blocking status file reads using threaded I/O boundaries.

## SOT Delta — v0.0.8 Stateless Architecture Simplification

- Converted to pure stateless request/response bridge. One message = one LLM inference. No state retained between messages.
- Removed memory compaction system, structured summarizer, message history buffers, rolling context, and reset markers.
- Removed background compaction tasks, per-channel locks, message counters, and threshold logic.
- Removed Discord summary channel integration and auto-channel editing.
- Removed `/reset` and `/memory status` slash commands.
- Removed all memory-related configuration settings (`MAX_CONTEXT_PAIRS`, `MEMORY_*`).
- Prompt format is now fixed: system = "You are Agent Smith. Provide direct, concise answers." + user message only.
- Updated Product Invariants: fast-path chat invariant is now `User message → Ollama → streamed Discord response` with no history step.
