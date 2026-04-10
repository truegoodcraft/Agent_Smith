# Agent Smith — Cloudflare-Native Telemetry Watcher

Agent Smith is a deterministic, personal-use Discord bot that watches fixed, read-only backend telemetry. Built on Cloudflare Workers + Durable Objects with Discord HTTP interactions. No AI, no models, no persistence.

Lighthouse is the reporting authority. Smith is a read-only consumer and operator interface for Lighthouse report views.

Telemetry authority and normalization authority remain in Lighthouse. Smith does not define telemetry semantics; Smith reflects Lighthouse contracts with deterministic rendering.

TGC analytics policy defines the company baseline analytics language. Smith uses that language when describing reports, but Smith does not redefine the policy or Lighthouse telemetry semantics.

## Commands

| Command    | Description                                    |
| :--------- | :--------------------------------------------- |
| `/health`  | Confirms Worker + Durable Object are running   |
| `/report`  | Operator report aligned to Lighthouse support classes and site capabilities |

`/traffic` and `/errors` are planned but not yet implemented.

`/report` primary operator paths:

- `/report` (all tracked sites)
- `/report site:buscore`
- `/report site:tgc_site`
- `/report site:star_map_generator`

Advanced compatibility path (secondary):

- `/report view:legacy`
- `/report view:fleet`
- `/report view:source_health`
- `/report view:site site:<site_key>`

All-sites output is deterministic and sectioned as `Report · OK · 7d`, `Sites Summary`, `Observability`, and `Read`. One-site output follows the canonical normalized per-site section flow (`Summary`, `Today`, `Traffic`, `Event Telemetry`, `Observability`, `Identity`, `Read`; `Identity` remains optional). Nulls are rendered as unavailable and are not rewritten to zero.

For `event_only` sites (including Star Map and TGC Site), Smith now prioritizes event telemetry usefulness in the one-site output: `page_view` count, attribution lists (top paths when provided, top sources, top campaigns, top referrers), event-name breakdown, and observability. Traffic/identity layer status is kept as one compact support-class note instead of repeated unavailable-only phrasing.

BUS Core remains the allowed legacy-rich exception at the report-consumption layer: `/report site:buscore` uses Lighthouse legacy `/report`, while `/report site:tgc_site` and `/report site:star_map_generator` stay on the normalized site-view path with null-honest rendering.

BUS Core is not the universal standard for every property. BUS Core is `legacy_hybrid` and may legitimately expose richer report sections. Star Map and TGC Site are currently `event_only` properties and should be evaluated mainly on event telemetry, `page_view` events where used, and path/source/referrer/src attribution from events, not on host traffic or identity parity with BUS Core.

For Star Map specifically, useful telemetry today is event telemetry, `page_view` events where used, top paths, source/referrer/src attribution from events, and explicit funnel events if they are added later. Lack of a traffic layer or identity layer is not automatically a defect.

Host traffic is a different telemetry layer from page/app execution. Identity is optional and support-class dependent.

Null or omitted values are honest when a site does not support a layer. Smith should describe unsupported traffic or identity layers as unsupported by design, not as broken. Smith should not imply that every site ought to expose the same telemetry richness.

## TGC Analytics Baseline

Smith uses the TGC analytics policy levels when describing analytics scope:

- Page Level
- Host Level
- App Level
- User Level
- Internal

## Lighthouse Terminology Alignment

Smith operator language aligns to Lighthouse canonical terminology:

- Support classes: `legacy_hybrid`, `event_only`, `event_plus_cf_traffic`, `not_yet_normalized`
- Capability layers: `Layer 1 Registry`, `Layer 2 Event`, `Layer 3 Traffic`, `Layer 4 Identity`, `Layer 5 Extension`
- Canonical shared comparable event names: `page_view`, `outbound_click`, `contact_click`, `service_interest`

Current support-class reality:

- `buscore` => `legacy_hybrid`
- `star_map_generator` => `event_only`
- `tgc_site` => `event_only`

Expectation model by site:

- `buscore`: `legacy_hybrid` and allowed to surface richer legacy report detail.
- `star_map_generator`: `event_only` and evaluated mainly on page/event attribution coverage, not host traffic or identity depth.
- `tgc_site`: `event_only` unless Lighthouse capability layers change upstream.

Normalization constraints (Lighthouse authority):

- `TRACKED_SITES` is the canonical property registry.
- `/metrics/event` is the canonical fleet telemetry path.
- `/metrics/pageview` is BUS Core legacy-only support.
- `dev_mode` is the canonical cross-site developer/operator suppression contract.
- Normalization does not mean equal telemetry richness.
- Unsupported metrics remain null or are omitted by documented rule.
- Cloudflare traffic, first-party standardized events, and BUS Core legacy pageviews are distinct source layers and are not interchangeable.

## Glossary

- Support class: Lighthouse site-level telemetry profile (`legacy_hybrid`, `event_only`, etc.).
- Capability layer: telemetry layer scope (`Layer 1 Registry` through `Layer 5 Extension`).
- Normalization: shared contract language and comparable fields, not equal data richness.
- `legacy_hybrid`: site combines modern event telemetry with legacy compatibility support.
- `event_only`: site reports event-layer telemetry without additional traffic/identity layers unless added upstream.
- Extension layer: site-specific additional telemetry beyond the shared base layers.
- Null semantics: null/unavailable means unsupported or unavailable data, not zero.

## How To Ask For Telemetry Changes

Smith is read-only. Request telemetry capability changes in Lighthouse language:

- "Add a traffic layer to TGC."
- "Keep Star Map event_only."
- "Add an extension layer to Star Map."
- "Do not add identity to this site."
- "Add shared outbound_click coverage to Buscore."

Anti-pattern:

- Do not ask to "make it like Buscore" unless the request names the specific capability layers to add.

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

After the Worker deploy step succeeds, the workflow now runs `npm run register:commands` to sync slash command schema to Discord using repository-defined command definitions.

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
4. Set `DISCORD_APPLICATION_ID` and `DISCORD_BOT_TOKEN` in your environment and run command registration from repo code:
   ```bash
   npm run register:commands:dry-run  # inspect payload only
   npm run register:commands          # PUT payload to Discord
   ```
   Command schema source of truth is in `src/commands/*.ts` via each command's `definition` object.
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
