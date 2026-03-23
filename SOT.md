# Statement of Truth (SoT) — Agent Smith

**Newest SOT entries supersede all older wording. Agents must read this file top-to-bottom. Historical deltas are preserved for audit only.**

## Current Mission (v0.5.4 — Temporary report diagnostics)

Agent Smith is a Cloudflare-native, deterministic, personal-use watcher for fixed, read-only backend telemetry. It is built on Cloudflare Workers, Durable Objects, and Discord interactions over HTTP.

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
| `/report`  | Live     | `LIGHTHOUSE_REPORT_URL`  | Compact telemetry report         |

See `CONTRACTS.md` for detailed command contracts.

## Deployment

-   **Production:** GitHub Actions → Cloudflare via `wrangler-action`. See `.github/workflows/deploy.yml`.
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
