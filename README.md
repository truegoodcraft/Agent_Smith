# Agent Smith - Stateless Operator Telemetry Bridge

Agent Smith is a narrow, read-only Discord operator bridge for backend telemetry.

Each interaction is stateless. There is no conversation history, no reset flow, and no previous-message lookup.

## Scope

- Slash-command-driven only
- Fixed, pre-approved backend telemetry routes
- Read-only backend access
- Optional LLM analysis after strict validation and sanitization

## Non-Goals

- No general chat assistant behavior
- No arbitrary shell command execution
- No arbitrary URL fetching
- No write or mutation actions
- No autonomous tool selection

## Supported Commands

| Command | Backend Route |
|---|---|
| `/report` | `LIGHTHOUSE_REPORT_URL` |
| `/traffic` | `LIGHTHOUSE_TRAFFIC_URL` |
| `/errors` | `LIGHTHOUSE_ERRORS_URL` |
| `/health` | `LIGHTHOUSE_HEALTH_URL` |

Normal Discord messages do not trigger telemetry analysis. Users are instructed to use slash commands.

## Security and Validation Controls

For every operator command:

1. Exactly one fixed endpoint is called.
2. URL and auth token come from environment configuration.
3. Endpoint URL must be HTTPS.
4. Endpoint host must be in `BACKEND_ALLOWED_HOSTS`.
5. HTTP request uses explicit timeout.
6. Response payload is size-bounded.
7. Response must be parseable JSON with expected content type.
8. Sensitive fields are redacted before LLM analysis.
9. Invalid responses fail clearly without hallucinated analysis.

## Required Environment Variables

Copy `.env.example` to `.env` and set values:

- `DISCORD_TOKEN`
- `COMMAND_PREFIX`
- `OLLAMA_HOST`
- `OLLAMA_MODEL`
- `OLLAMA_TIMEOUT`
- `ALLOWED_CHANNEL_IDS`
- `ALLOWED_USER_IDS`
- `RATE_LIMIT_REQUESTS`
- `RATE_LIMIT_WINDOW`
- `BACKEND_ALLOWED_HOSTS`
- `BACKEND_TIMEOUT_SECONDS`
- `BACKEND_MAX_RESPONSE_BYTES`
- `LIGHTHOUSE_REPORT_URL`
- `LIGHTHOUSE_TRAFFIC_URL`
- `LIGHTHOUSE_ERRORS_URL`
- `LIGHTHOUSE_HEALTH_URL`
- `LIGHTHOUSE_ADMIN_TOKEN`
- `LOG_LEVEL`

## Run

```bash
pip install -r requirements.txt
python main.py
```

## Operator Output Shape

On success, output includes:

- Route label
- HTTP status
- JSON parse state
- Concise analysis sections:
  - Summary
  - Notable signals
  - Likely interpretation
  - Confidence / limits

On failure, output includes:

- Route label
- HTTP status (if available)
- JSON parse state
- Clear failure reason

## Notes

- This product is intentionally explicit and auditable.
- Keep endpoint and token management in environment config only.
