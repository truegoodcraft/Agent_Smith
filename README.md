# Agent Smith — Cloudflare-Native Telemetry Watcher

Agent Smith is a deterministic, personal-use Discord bot that watches fixed, read-only backend telemetry. Built on Cloudflare Workers + Durable Objects with Discord HTTP interactions. No AI, no models, no persistence.

Lighthouse is the reporting authority. Smith is a read-only consumer and operator interface for Lighthouse report views.

## Commands

| Command    | Description                                    |
| :--------- | :--------------------------------------------- |
| `/health`  | Confirms Worker + Durable Object are running   |
| `/report`  | Lighthouse report consumer: `legacy`, `fleet`, `site`, `source_health` |

`/traffic` and `/errors` are planned but not yet implemented.

`/report` supports these operator paths:

- `/report` (legacy-compatible)
- `/report view:legacy`
- `/report view:fleet`
- `/report view:site site:buscore`
- `/report view:site site:tgc_site`
- `/report view:site site:star_map_generator`
- `/report view:source_health`

Legacy output remains deterministic `Summary`, `Today`, `Traffic`, and `Read` sections (plus optional human/identity sections). Fleet, site, and source-health outputs are deterministic and view-specific. Nulls are rendered as unavailable and are not rewritten to zero.

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
       {
         "name":"report",
         "description":"Fetch Lighthouse report views",
         "type":1,
         "options":[
           {
             "name":"view",
             "description":"Report view",
             "type":3,
             "required":false,
             "choices":[
               {"name":"legacy","value":"legacy"},
               {"name":"fleet","value":"fleet"},
               {"name":"site","value":"site"},
               {"name":"source_health","value":"source_health"}
             ]
           },
           {
             "name":"site",
             "description":"Site key for site view",
             "type":3,
             "required":false,
             "choices":[
               {"name":"buscore","value":"buscore"},
               {"name":"tgc_site","value":"tgc_site"},
               {"name":"star_map_generator","value":"star_map_generator"}
             ]
           }
         ]
       }
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
