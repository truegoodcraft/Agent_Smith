# MIGRATION: Phoenix Rewrite to Cloudflare Workers

This file documents the deprecation of the original Python-based gateway bot and the migration to a new, Cloudflare-native architecture.

## Deprecation Notice

**Effective `v0.2.0` and forward, the Python-based bot implementation is deprecated and will be removed.**

All previous Python source code (`main.py`, the `bot/`, `services/`, `ollama/`, etc., directories), `requirements.txt`, and `Dockerfile` are now considered legacy. They are preserved temporarily for historical reference during the rewrite but should not be used for new development.

## New Architecture Target

The bot is being rewritten from the ground up to be a **Cloudflare-native, deterministic, personal-use watcher.**

The new architecture is built on:
- Cloudflare Workers
- Cloudflare Durable Objects
- Discord Interactions over HTTP webhooks

### Key Changes:
- **No Discord Gateway:** The bot no longer maintains a persistent WebSocket connection to Discord. It responds to stateless HTTP webhooks.
- **No Python Runtime:** The deployed service is pure JavaScript/TypeScript running on Cloudflare's edge network.
- **No Docker Dependency:** Deployment is managed via the `wrangler` CLI, not Docker.
- **No Ollama:** All "AI" and model-based interpretation layers have been removed. The bot is 100% deterministic.

## Legacy File Status

The original Python source code files (`main.py`, directories like `bot/`, `services/`, etc.) currently remain in the repository.

**These files are considered deprecated and inactive.**

They are preserved **temporarily** for two reasons:
1.  To serve as a logical reference for porting the deterministic processing rules to TypeScript.
2.  To provide historical context for the project's evolution.

They are scheduled for **complete removal** from the repository as soon as their equivalent logic is implemented and verified in the new TypeScript architecture. This is to ensure the repository does not drift into a state of having two competing implementations. The Cloudflare Worker in `src/` is the one and only source of truth going forward.
