# Agent Smith — Cloudflare-Native Telemetry Watcher

Agent Smith is a deterministic, personal-use Discord bot that watches fixed, read-only backend telemetry. Built on Cloudflare Workers + Durable Objects with Discord HTTP interactions. No AI, no models, no persistence.

## Commands

| Command    | Description                                    |
| :--------- | :--------------------------------------------- |
| `/health`  | Confirms Worker + Durable Object are running   |
| `/report`  | Compact Lighthouse report with optional traffic |

`/traffic` and `/errors` are planned but not yet implemented.

`/report` renders deterministic `Summary`, `Today`, `Traffic`, and `Read` sections. If Lighthouse omits `traffic`, Smith still succeeds and states that traffic data is not present in that report.

See [CONTRACTS.md](CONTRACTS.md) for exact output shapes.

## Architecture

```
Discord → Worker (signature verify) → SmithDO (singleton) → Service fetch → Logic → Response
```

- Worker ingress: `src/index.ts`
- DO orchestration: `src/durable/SmithDO.ts`
- Services: `src/services/lighthouse.ts`
- Logic: `src/logic/report.ts`
- Types: `src/types.ts`, `src/types/telemetry.ts`

See [SOT.md](SOT.md) for the full architectural statement of truth.

## Local Development

### Prerequisites
- Node.js 20+
- npm

### Setup
```bash
npm install
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your actual secrets and URLs
```

### Run
```bash
npm start          # wrangler dev
npm run typecheck  # tsc --noEmit
npm run check:governance
```

## Deployment

### Deployment via GitHub Actions (recommended)

Push to `main` triggers the deploy workflow. Required GitHub Secrets:

| Secret                   | Purpose                                  |
| :----------------------- | :--------------------------------------- |
| `CLOUDFLARE_API_TOKEN`   | Wrangler deploy authentication           |
| `CLOUDFLARE_ACCOUNT_ID`  | Target Cloudflare account                |
| `DISCORD_PUBLIC_KEY`     | Pushed as Worker secret for sig verify   |
| `DISCORD_APPLICATION_ID` | Pushed as Worker secret                  |
| `DISCORD_BOT_TOKEN`      | Pushed as Worker secret (command registration) |
| `LIGHTHOUSE_ADMIN_TOKEN` | Pushed as Worker secret for backend auth |

### Cloudflare Environment Variables

Set in `wrangler.toml` `[vars]` before deploying:

| Variable                 | Purpose                          |
| :----------------------- | :------------------------------- |
| `LIGHTHOUSE_REPORT_URL`  | Lighthouse `/report` endpoint    |

### Manual deployment
```bash
npm run deploy     # wrangler deploy
```

Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in environment.

## Discord Setup

1. Create a Discord application at https://discord.com/developers/applications
2. Under **General Information**, copy the Application ID and Public Key
3. Create a bot user under **Bot**, copy the token
4. Register slash commands using the Discord API (a one-time HTTP call using `DISCORD_APPLICATION_ID` and `DISCORD_BOT_TOKEN`):
   ```bash
   curl -X PUT \
     "https://discord.com/api/v10/applications/YOUR_APP_ID/commands" \
     -H "Authorization: Bot YOUR_BOT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '[
       {"name":"health","description":"Check Smith operational status","type":1},
       {"name":"report","description":"Fetch telemetry report","type":1}
     ]'
   ```
5. Under **General Information** → **Interactions Endpoint URL**, set it to your Worker URL (e.g., `https://agent-smith.your-account.workers.dev`)
6. Discord will send a PING to validate the endpoint. The Worker handles this automatically.
7. Invite the bot to your server using an OAuth2 URL with the `applications.commands` scope.

## Governance

- `npm run check:governance` — runs drift/alignment checks
- Runs automatically in CI on every push/PR
- Deploy is gated on governance pass
- See [AGENTS.md](AGENTS.md) for change control rules

## Legacy

The original Python bot is archived in `legacy/`. It is not part of the active runtime. See [MIGRATION_README.md](MIGRATION_README.md) for history.
