# Statement of Truth (SoT) — Agent Smith

**Newest SOT entries supersede all older wording. Agents must read this file top-to-bottom. Historical deltas are preserved for audit only.**

## Current Mission (v0.1.0+)

Agent Smith is a stateless, slash-command-only Discord operator bridge for fixed, read-only backend telemetry. It retrieves and analyzes operational metrics from pre-approved backend sources using strict validation and security controls.

## Core Invariants

1. **Stateless invariant**
   - Each operator command is independent and carries no conversation state.
   - No message history, no reset flow, no previous-message lookup.
   - Each `/report`, `/traffic`, `/errors`, `/health` call is a fresh backend request and analysis cycle.

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
   - Sensitive fields (tokens, secrets, auth headers, cookies) are redacted before LLM sees the data.

5. **Security invariant**
   - All backend URLs must be HTTPS.
   - All backend hosts must be in `BACKEND_ALLOWED_HOSTS` allowlist.
   - All requests use explicit timeout (`BACKEND_TIMEOUT_SECONDS`).
   - Payloads are bounded (`BACKEND_MAX_RESPONSE_BYTES`).
   - Auth tokens are environment-configured, never hardcoded or user-supplied.

6. **Freeform-message prohibition invariant**
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
