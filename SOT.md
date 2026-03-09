# Statement of Truth (SoT) — Agent Smith

**Newest SOT entries supersede all older wording. Agents must read this file top-to-bottom. Historical deltas are preserved for audit only.**

## Current Mission (v0.1.2+)

Agent Smith is a stateless, slash-command-only Discord operator bridge for fixed, read-only backend telemetry. It retrieves backend metrics, preprocesses them into operator-focused summaries in Python, and delivers fully structured operator responses assembled entirely in Python with optional model-generated interpretation.

## Core Invariants

1. **Stateless invariant**
   - Each operator command is independent and carries no conversation state.
   - No message history, no reset flow, no previous-message lookup.
   - Each `/report`, `/traffic`, `/errors`, `/health` call is a fresh backend request, preprocessing, and (optionally) analysis cycle.

2. **Read-only invariant**
   - Agent Smith only retrieves and analyzes telemetry. It does not mutate backend state.
   - No write, delete, or configuration-change actions are exposed.
   - No arbitrary command execution is permitted.

3. **Fixed-endpoint invariant**
   - The four slash commands call exactly four fixed backend routes, configured via environment variables.
   - Routes cannot be dynamically specified by users.
   - Each route is validated for HTTPS, whitelisted host, and proper JSON response.

4. **Validation-before-analysis invariant**
   - Backend responses are validated (HTTP status, content type, JSON parse, payload size) before any LLM usage.
   - Invalid responses fail clearly with a concise human-readable error, not LLM hallucination.
   - Sensitive fields (tokens, secrets, auth headers, cookies) are redacted before any downstream processing.

5. **Deterministic-first invariant** ⚡ **(v0.1.1+)**
   - Raw backend JSON is never sent directly to Ollama.
   - Each route applies route-specific Python preprocessing to extract only relevant fields, normalize structures, and compute deterministic derived values (day-over-day deltas, availability checks, health signals).
   - Preprocessing never invents missing data; unavailable fields are marked explicitly.
   - The model receives only compact operator-facing preprocessed payloads, never raw backend schema.

6. **Fallback-first invariant** ⚡ **(v0.1.1+)**
   - If Ollama fails (times out, is unreachable, or returns an error), Smith still returns useful deterministic output.
   - If model output fails quality gates (too long, contains banned phrases, lacks required sections), deterministic fallback is used instead.
   - Backend success + model failure always yields a useful operator response; model is enhancement, not single point of failure.

7. **Formatter-first invariant** ⚡ **(v0.1.2+)**
   - Final Discord response is composed entirely in Python, not by model output.
   - Summary and Signals sections are 100% deterministic, computed directly from preprocessed payload fields.
   - Interpretation section is optional model-generated content; if unavailable or weak, fallback interpretation is used.
   - All response structure (title, sections, bullets, formatting) is under operator control in Python code.
   - No raw telemetry JSON is shown to Discord users in normal success responses.
   - Internal scaffolding (section headers, field names, payload dumps) never leaks to operators.

8. **Quality gate invariant** ⚡ **(v0.1.2+)**
   - Model interpretation output is validated before use:
     - Max 500 characters.
     - Must not contain patterns: `section:`, `sanitized telemetry`, `route:`, `summary:`, `signals:`, etc.
     - Must not contain generic analytics language or schema discussion.
   - If output fails gates, deterministic fallback interpretation is used instead.

9. **Security invariant**
   - All backend URLs must be HTTPS.
   - All backend hosts must be in `BACKEND_ALLOWED_HOSTS` allowlist.
   - All requests use explicit timeout (`BACKEND_TIMEOUT_SECONDS`).
   - Payloads are bounded (`BACKEND_MAX_RESPONSE_BYTES`).
   - Auth tokens are environment-configured, never hardcoded or user-supplied.

9. **Freeform-message prohibition invariant**
   - Normal Discord messages do not trigger AI chat responses.
   - If received, normal messages get a brief redirect to slash commands.
   - No LLM-chat path exists for freeform text.

## Operator Surface

Exactly four slash commands:

| Command | Backend Route | Purpose |
|---------|---------------|----------|
| `/report` | `LIGHTHOUSE_REPORT_URL` | Fetch and analyze telemetry report |
| `/traffic` | `LIGHTHOUSE_TRAFFIC_URL` | Fetch and analyze traffic telemetry |
| `/errors` | `LIGHTHOUSE_ERRORS_URL` | Fetch and analyze error telemetry |
| `/health` | `LIGHTHOUSE_HEALTH_URL` | Fetch and analyze health telemetry |

All commands:
- Respect Discord channel/user allow-lists (`ALLOWED_CHANNEL_IDS`, `ALLOWED_USER_IDS`).
- Are subject to rate limiting (`RATE_LIMIT_REQUESTS`, `RATE_LIMIT_WINDOW`).
- Log operator actions with user ID, channel ID, command, route label, and HTTP status.

## Backend Integration Architecture

### `services/backend_client.py`
- Read-only async HTTP client for approved telemetry endpoints.
- Enforces HTTPS, host allowlist, request timeout, payload size bounds.
- Returns normalized result structure:
  ```python
  {
    "ok": bool,
    "status_code": int | None,
    "url": str,
    "error": str | None,
    "json": dict | None,
    "raw_text": str | None,
    "content_type": str | None,
  }
  ```

### `services/telemetry_validation.py`
- Validates HTTP status, content type (must contain `application/json`), JSON parse success, payload size.
- Redacts sensitive keys: `authorization`, `token`, `access_token`, `api_key`, `secret`, `password`, `cookie`, `set-cookie`.
- Returns validation result and sanitized JSON (or error description).

### `services/telemetry_preprocess.py` ⚡ **(v0.1.1+)**
- Route-specific preprocessing functions:
  - `preprocess_report(data)` → operator summary with update checks, downloads, errors, and 7-day/month trends.
  - `preprocess_health(data)` → health status, component status, overall health signal.
  - `preprocess_traffic(data)` → total requests, top routes, and latency percentiles.
  - `preprocess_errors(data)` → error counts, top error types, and severity distribution.
- Each preprocessor:
  - Extracts only relevant fields from raw backend JSON.
  - Computes deterministic derived values (day-over-day deltas, availability checks, threshold checks).
  - Marks absent fields explicitly (e.g., `[not present in payload]`) instead of inventing data.
  - Returns compact operator-facing dict.
- No business logic; only extraction and simple math.

### Fallback Formatters ⚡ **(v0.1.1+)**
- Route-specific deterministic formatters (no LLM):
  - `format_report_fallback(payload)` → concise bullet-point report summary.
  - `format_health_fallback(payload)` → health status and degraded components.
  - `format_traffic_fallback(payload)` → request counts and latency summary.
  - `format_errors_fallback(payload)` → error counts and top error types.
- Used when model fails, times out, or output fails quality gates.
- Produces operator-readable output directly from preprocessed data.

### `services/alert_intake.py`
- Minimal placeholder data shape for future backend-originated alert intake.
- No webhook server or runtime intake is currently implemented.

## Operator Workflow (v0.1.2+)

1. User invokes slash command (e.g., `/report`).
2. Permission check (channel/user allow-lists).
3. Rate-limit check.
4. Backend call via `BackendClient.get_<route>()`.
5. Response validation via `validate_and_sanitize()`.
6. If valid:
   - **Deterministic preprocessing** (Python): Apply route-specific preprocessing to extract compact operator summary.
   - **Build Summary section** (100% Python): Extract key metrics from preprocessed payload.
   - **Build Signals section** (100% Python): Generate anomaly/threshold signals from payload fields.
   - **Optional model call** (Ollama): Request brief interpretation (1–3 sentences, no bullets/headings).
   - **Quality gate interpretation**: Reject if >500 chars or contains internal scaffolding.
   - **Build Interpretation section** (Python): Use model interpretation if available, otherwise fallback deterministic.
   - **Assemble final response** (Python): Combine title, summary, signals, interpretation into clean Discord message.
   - **Send to Discord**: No raw JSON, no internal labels, no model scaffolding.
7. If invalid:
   - Return concise failure report (route, HTTP status, parse state, exact error).
   - No speculative analysis.

## Response Format (v0.1.2+)

Final Discord responses are formatted as:

```
Route · HTTP status

**Summary**
· metric 1
· metric 2

**Signals**
· signal 1
· signal 2

**Interpretation**
Brief operational interpretation (1–3 sentences, model-generated or deterministic fallback).
```

Key properties:
- Title line shows route and HTTP status only.
- Summary bullets show key metrics directly from payload (no model involvement).
- Signals bullets show anomalies based on thresholds and deltas (no model involvement).
- Interpretation is optional brief model output or deterministic fallback.
- Only sections with content are shown.
- No raw telemetry JSON.
- No internal labels like `Route:`, `Sanitized telemetry`, `Section:`.
- No repeated headings or duplicate sections.

## Response Format Legacy (v0.1.1+)

All operator responses must be concise and structured:

- **Summary**: 2–4 bullet points maximum. Key metrics and status.
- **Signals**: 1–4 bullet points maximum. Notable anomalies or deviations. Omit if none.
- **Interpretation**: Max 3 sentences. Operational context or meaning.
- **Limits**: 1 sentence only if data is thin, ambiguous, or incomplete. Omit if not applicable.

Forbidden in all responses:
- Schema narration (describing input field names or structure).
- Generic analytics language (e.g., "convergence ratio", invented metrics).
- Repeating input data verbatim.
- Essay formatting, numbered lists, or excessive structure.
- Mentioning fields or metrics not present in the payload.
- Filler or empty sections.

## Configuration Requirements

All backend URLs and auth are environment-configured:

- `LIGHTHOUSE_REPORT_URL` (required, must be HTTPS)
- `LIGHTHOUSE_TRAFFIC_URL` (required, must be HTTPS)
- `LIGHTHOUSE_ERRORS_URL` (required, must be HTTPS)
- `LIGHTHOUSE_HEALTH_URL` (required, must be HTTPS)
- `LIGHTHOUSE_ADMIN_TOKEN` (required)
- `BACKEND_ALLOWED_HOSTS` (required, comma-separated hostnames, empty = reject all)
- `BACKEND_TIMEOUT_SECONDS` (default 10)
- `BACKEND_MAX_RESPONSE_BYTES` (default 200000)
- `OLLAMA_HOST`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT` (for LLM analysis)
- `ALLOWED_CHANNEL_IDS`, `ALLOWED_USER_IDS` (optional, empty = allow all)
- `RATE_LIMIT_REQUESTS`, `RATE_LIMIT_WINDOW` (optional rate limiting)

Missing required env vars cause startup failure.

## Goals and Non-Goals

### Goals
- Provide operators a trusted, auditable interface to backend telemetry.
- Enforce security by architecture (HTTPS, allowlist, validation, redaction).
- Fail safely and clearly when backend response is invalid.
- Log all operator actions for audit trail.
- Produce concise, deterministic, operator-focused output with or without LLM.
- Never fail uselessly; backend success always yields useful response.

### Non-Goals
- General-purpose chat assistance.
- Arbitrary command execution (shell, HTTP, etc.).
- Autonomous tool selection.
- Conversation history or state.
- User-supplied backend URLs or dynamic routing.
- Write or mutation actions.

## Known Limitations and Unresolved Assumptions

1. **Auth header format**: Currently sends both `Authorization: Bearer <token>` and `X-Admin-Token: <token>`. Confirm which header(s) your backend expects.
2. **Endpoint paths**: `LIGHTHOUSE_*_URL` values are examples. Confirm actual backend endpoint paths before production deployment.
3. **Response structure**: Assumes backend returns JSON objects (not root arrays). Root arrays are wrapped as `{"data": [...]}`.
4. **Token auth refresh**: No automatic token refresh or multi-credential support.
5. **Alert intake**: Placeholder only; no webhook server, no background processing.
6. **Model variation**: Fallback formatters are deterministic and operator-useful even if the configured model produces substandard output or is unavailable. Consider deploying with good model selection (e.g., `llama3`, `mistral`, or equivalent) for consistently useful LLM analysis.

## Architectural Constraints

- **No message-history storage**: Each operator command is independent.
- **No prompt injection surface**: Backend data is always validated, redacted, and preprocessed before reaching Ollama.
- **No background processing**: All operations are synchronous slash-command request → response cycles.
- **No access to other Discord features**: Agent Smith is read-only Discord message monitoring + slash command responder.
- **Preprocessing is deterministic and lightweight**: No async I/O, no external calls, no state mutation during preprocessing.

---

## SoT Deltas (Historical Reference Only)

### SOT Delta — v0.1.2 Phase 4 Formatter-First Response Architecture

⚡ Complete shift to formatter-first, model-optional design:
- Added Python-based response builders: `build_report_summary()`, `build_health_summary()`, `build_traffic_summary()`, `build_errors_summary()` (and corresponding signals builders).
- Added Python-based interpretation fallbacks: `interpret_report_fallback()`, `interpret_health_fallback()`, `interpret_traffic_fallback()`, `interpret_errors_fallback()`.
- Final Discord response is now assembled entirely in Python, never by model output. Summary and signals sections are 100% deterministic.
- Model role reduced to optional interpretation generation only: 1–3 sentences max, no bullets, no headings, no schema discussion.
- Removed raw sanitized telemetry JSON from Discord operator output; internal data only.
- Quality gate strengthened: model interpretation is max 500 chars and explicitly rejects patterns like `section:`, `sanitized telemetry`, `route:`, etc.
- New response format: `Route · HTTP status | Summary | Signals | Interpretation`. Only sections with content are shown.
- Model is now a true optional enhancement; deterministic output is complete and useful without it.

### SOT Delta — v0.1.1 Phase 3 Operator Output Quality

⚡ Deterministic preprocessing and fallback:
- Added `services/telemetry_preprocess.py` with route-specific preprocessing (extract, normalize, compute derived values only).
- Raw backend JSON no longer sent to Ollama; model receives only compact operator payloads.
- Added fallback deterministic formatters for all routes; backend success always yields useful response even if model fails.
- Added quality gates (length, banned phrases, required sections); low-quality output triggers fallback.
- System prompt tightened to require strict output structure and prohibit schema narration and field invention.
- Response format is now concise and structured (Summary, Signals, Interpretation, Limits) with explicit prohibitions on filler.

### SOT Delta — v0.1.0 Phase 2 Telemetry Operator Bridge

- Replaced general-purpose chat bridge with narrow, fixed-endpoint telemetry operator bridge.
- Removed freeform message handling; normal messages now redirect to slash commands.
- Replaced dynamic `/ask` with four fixed commands: `/report`, `/traffic`, `/errors`, `/health`.
- Introduced `services/backend_client.py` for fixed-endpoint, HTTPS-enforced, host-allowlisted telemetry calls.
- Introduced `services/telemetry_validation.py` for response validation and sensitive-key redaction.
- Added `services/alert_intake.py` as minimal placeholder foundation for future alert intake.
- All backend URLs and tokens are environment-configured; no user-supplied routing.
- Operator actions are logged with structured metadata (user, channel, command, route, HTTP status).
- Invalid backend responses fail clearly without hallucination.

### Original Historical Deltas

(See archived CHANGELOG.md entries for v0.0.4, v0.0.5, v0.0.8 detailed memory and compaction architecture. These are superseded by v0.1.0 stateless telemetry model.)

## SOT Delta — v0.0.8 Stateless Architecture Simplification

- Converted to pure stateless request/response bridge. One message = one LLM inference. No state retained between messages.
- Removed memory compaction system, structured summarizer, message history buffers, rolling context, and reset markers.
- Removed background compaction tasks, per-channel locks, message counters, and threshold logic.
- Removed Discord summary channel integration and auto-channel editing.
- Removed `/reset` and `/memory status` slash commands.
- Removed all memory-related configuration settings (`MAX_CONTEXT_PAIRS`, `MEMORY_*`).
- Prompt format is now fixed: system = "You are Agent Smith. Provide direct, concise answers." + user message only.
- Updated Product Invariants: fast-path chat invariant is now `User message → Ollama → streamed Discord response` with no history step.

### `services/alert_intake.py`
- Minimal placeholder data shape for future backend-originated alert intake.
- No webhook server or runtime intake is currently implemented.

## Operator Workflow

1. User invokes slash command (e.g., `/report`).
2. Permission check (channel/user allow-lists).
3. Rate-limit check.
4. Backend call via `BackendClient.get_<route>()`.
5. Response validation via `validate_and_sanitize()`.
6. If valid:
   - Construct telemetry JSON summary.
   - Send to Ollama with strict telemetry-analysis system prompt.
   - Return analysis (summary, notable signals, interpretation, confidence limits).
7. If invalid:
   - Return concise failure report (route, HTTP status, parse state, exact error).
   - No speculative analysis.

## Configuration Requirements

All backend URLs and auth are environment-configured:

- `LIGHTHOUSE_REPORT_URL` (required, must be HTTPS)
- `LIGHTHOUSE_TRAFFIC_URL` (required, must be HTTPS)
- `LIGHTHOUSE_ERRORS_URL` (required, must be HTTPS)
- `LIGHTHOUSE_HEALTH_URL` (required, must be HTTPS)
- `LIGHTHOUSE_ADMIN_TOKEN` (required)
- `BACKEND_ALLOWED_HOSTS` (required, comma-separated hostnames, empty = reject all)
- `BACKEND_TIMEOUT_SECONDS` (default 10)
- `BACKEND_MAX_RESPONSE_BYTES` (default 200000)
- `OLLAMA_HOST`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT` (for LLM analysis)
- `ALLOWED_CHANNEL_IDS`, `ALLOWED_USER_IDS` (optional, empty = allow all)
- `RATE_LIMIT_REQUESTS`, `RATE_LIMIT_WINDOW` (optional rate limiting)

Missing required env vars cause startup failure.

## Goalsand Non-Goals

### Goals
- Provide operators a trusted, auditable interface to backend telemetry.
- Enforce security by architecture (HTTPS, allowlist, validation, redaction).
- Fail safely and clearly when backend response is invalid.
- Log all operator actions for audit trail.
- Use LLM only after successful validation to generate concise operator-focused analysis.

### Non-Goals
- General-purpose chat assistance.
- Arbitrary command execution (shell, HTTP, etc.).
- Autonomous tool selection.
- Conversation history or state.
- User-supplied backend URLs or dynamic routing.
- Write or mutation actions.

## Known Limitations and Unresolved Assumptions

1. **Auth header format**: Currently sends both `Authorization: Bearer <token>` and `X-Admin-Token: <token>`. Confirm which header(s) your backend expects.
2. **Endpoint paths**: `LIGHTHOUSE_*_URL` values are examples. Confirm actual backend endpoint paths before production deployment.
3. **Response structure**: Assumes backend returns JSON objects (not root arrays). Root arrays are wrapped as `{"data": [...]}`.
4. **Token auth refresh**: No automatic token refresh or multi-credential support.
5. **Alert intake**: Placeholder only; no webhook server, no background processing.

## Architectural Constraints

- **No message-history storage**: Each operator command is independent.
- **No prompt injection surface**: Backend data is always validated and redacted before reaching Ollama.
- **No background processing**: All operations are synchronous slash-command request → response cycles.
- **No access to other Discord features**: Agent Smith is read-only Discord message monitoring + slash command responder.

---

## SoT Deltas (Historical Reference Only)

### SOT Delta — v0.1.0 Phase 2 Telemetry Operator Bridge

- Replaced general-purpose chat bridge with narrow, fixed-endpoint telemetry operator bridge.
- Removed freeform message handling; normal messages now redirect to slash commands.
- Replaced dynamic `/ask` with four fixed commands: `/report`, `/traffic`, `/errors`, `/health`.
- Introduced `services/backend_client.py` for fixed-endpoint, HTTPS-enforced, host-allowlisted telemetry calls.
- Introduced `services/telemetry_validation.py` for response validation and sensitive-key redaction.
- Added `services/alert_intake.py` as minimal placeholder foundation for future alert intake.
- All backend URLs and tokens are environment-configured; no user-supplied routing.
- Operator actions are logged with structured metadata (user, channel, command, route, HTTP status).
- Invalid backend responses fail clearly without hallucination.

### Original Historical Deltas

(See archived CHANGELOG.md entries for v0.0.4, v0.0.5, v0.0.8 detailed memory and compaction architecture. These are superseded by v0.1.0 stateless telemetry model.)
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
