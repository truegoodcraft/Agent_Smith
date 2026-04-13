import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  APIApplicationCommandInteraction,
  APIInteractionResponse,
  ApplicationCommandType,
  InteractionType,
} from 'discord-api-types/v10';

import {
  normalizeFleetLighthouseReport,
  normalizeLegacyLighthouseReport,
  normalizeSiteLighthouseReport,
  normalizeSourceHealthLighthouseReport,
} from '../src/types/telemetry.ts';
import { formatLighthouseReport } from '../src/logic/report.ts';
import { getLighthouseReport, LighthouseError } from '../src/services/lighthouse.ts';
import { commandDefinitions } from '../src/commands/index.ts';
import { report } from '../src/commands/report.ts';

function withMockFetch(mockImpl: typeof globalThis.fetch, fn: () => Promise<void>): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = mockImpl;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      globalThis.fetch = original;
    });
}

const baseEnv = {
  AGENT_SMITH_DO: {} as DurableObjectNamespace,
  DISCORD_PUBLIC_KEY: 'pk',
  DISCORD_APPLICATION_ID: 'app',
  DISCORD_BOT_TOKEN: 'bot',
  LIGHTHOUSE_ADMIN_TOKEN: 'admin',
  LIGHTHOUSE_REPORT_URL: 'https://example.test/report',
};

function buildInteraction(options?: Array<{ name: string; value: string }>): APIApplicationCommandInteraction {
  return {
    id: '1',
    application_id: 'app',
    type: InteractionType.ApplicationCommand,
    token: 'token',
    version: 1,
    data: {
      id: 'cmd',
      name: 'report',
      type: ApplicationCommandType.ChatInput,
      options,
    },
    channel_id: '1',
    guild_id: '1',
    locale: 'en-US',
    guild_locale: 'en-US',
    app_permissions: '0',
    entitlements: [],
  } as APIApplicationCommandInteraction;
}

async function invokeReport(options?: Array<{ name: string; value: string }>): Promise<APIInteractionResponse> {
  const interaction = buildInteraction(options);
  const response = await report.handler(interaction, baseEnv, {} as ExecutionContext);
  return response.json() as Promise<APIInteractionResponse>;
}

test('parses fleet and source_health alias fields', () => {
  const fleet = normalizeFleetLighthouseReport({
    view: 'fleet',
    generated_at: null,
    sites: [{ site_key: 'buscore', accepted_events_7d: 9, traffic_enabled: true, last_received: 'x' }],
  });
  assert.ok(fleet);
  assert.equal(fleet.sites[0].accepted_signal_7d, 9);
  assert.equal(fleet.sites[0].cloudflare_traffic_enabled, true);

  const sourceHealth = normalizeSourceHealthLighthouseReport({
    view: 'source_health',
    generated_at: null,
    sites: [{ site_key: 'buscore', accepted_events_7d: 8, traffic_enabled: false, last_received: 'y' }],
  });
  assert.ok(sourceHealth);
  assert.equal(sourceHealth.sites[0].accepted_signal_7d, 8);
  assert.equal(sourceHealth.sites[0].cloudflare_traffic_enabled, false);
});

test('parses site aliases and canonical events count key', () => {
  const site = normalizeSiteLighthouseReport({
    view: 'site',
    generated_at: null,
    scope: { site_key: 'star_map_generator', support_class: 'event_only', traffic_enabled: false },
    summary: { accepted_events_7d: 11, last_received: '2026-04-01T00:00:00Z' },
    traffic: null,
    events: {
      accepted_events_7d: 10,
      by_event_name: [{ event_name: 'page_view', events: 8 }],
      top_sources: [{ source: 'reddit', events: 7, count: 999 }],
    },
    health: null,
  });

  assert.ok(site);
  assert.equal(site.scope?.cloudflare_traffic_enabled, false);
  assert.equal(site.summary?.accepted_events_7d, 11);
  assert.equal(site.events?.accepted_signal_7d, 10);
  assert.equal(site.events?.top_sources?.[0].count, 7);
});

test('legacy report formatting remains available for buscore route', () => {
  const payload = normalizeLegacyLighthouseReport({
    today: { update_checks: 1, downloads: 1, errors: 0 },
    last_7_days: { update_checks: 2, downloads: 2, errors: 0 },
  });

  assert.ok(payload);
  const output = formatLighthouseReport(payload);
  assert.match(output, /\*\*Report · OK · 7d\*\*/);
  assert.match(output, /\*\*Summary\*\*/);
});

test('maps invalid view/missing site/invalid site errors', async () => {
  await withMockFetch(
    (async () => new Response(JSON.stringify({ ok: false, error: 'invalid_view' }), { status: 400 })) as typeof globalThis.fetch,
    async () => {
      await assert.rejects(
        async () => getLighthouseReport(baseEnv, { view: 'fleet' }),
        (error) => error instanceof LighthouseError && error.code === 'invalid_view',
      );
    },
  );

  await withMockFetch(
    (async () => new Response(JSON.stringify({ ok: false, error: 'missing_site_key' }), { status: 400 })) as typeof globalThis.fetch,
    async () => {
      await assert.rejects(
        async () => getLighthouseReport(baseEnv, { view: 'site' }),
        (error) => error instanceof LighthouseError && error.code === 'missing_site_key',
      );
    },
  );

  await withMockFetch(
    (async () => new Response(JSON.stringify({ ok: false, error: 'invalid_site_key' }), { status: 400 })) as typeof globalThis.fetch,
    async () => {
      await assert.rejects(
        async () => getLighthouseReport(baseEnv, { view: 'site', siteKey: 'buscore' }),
        (error) => error instanceof LighthouseError && error.code === 'invalid_site_key',
      );
    },
  );
});

test('logs contract warning when scope.support_class is missing', async () => {
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };

  try {
    await withMockFetch(
      (async () =>
        new Response(JSON.stringify({
          view: 'site',
          generated_at: null,
          scope: { site_key: 'star_map_generator', label: 'Star Map Generator' },
          summary: null,
          traffic: null,
          events: { accepted_signal_7d: 1 },
          health: null,
        })) as Response) as typeof globalThis.fetch,
      async () => {
        const result = await getLighthouseReport(baseEnv, { view: 'site', siteKey: 'star_map_generator' });
        assert.ok('view' in result && result.view === 'site');
      },
    );
  } finally {
    console.warn = originalWarn;
  }

  assert.ok(warnings.some((line) => line.includes('[REPORT_CONTRACT_WARN] missing scope.support_class')));
});

test('support_class trust behavior with unknown site key', () => {
  const payload = normalizeSiteLighthouseReport({
    view: 'site',
    generated_at: null,
    scope: {
      site_key: 'unknown_property',
      label: 'Unknown Property',
      support_class: 'event_only',
    },
    summary: { accepted_events_7d: 8 },
    traffic: null,
    events: { by_event_name: [{ event_name: 'page_view', events: 5 }] },
    health: null,
  });

  assert.ok(payload);
  const output = formatLighthouseReport(payload);
  assert.match(output, /\*\*Attribution Summary\*\*/);
  assert.match(output, /\*\*Action Summary\*\*/);
  assert.doesNotMatch(output, /temporary fallback/i);
});

test('temporary fallback appears when support_class is missing', () => {
  const payload = normalizeSiteLighthouseReport({
    view: 'site',
    generated_at: null,
    scope: { site_key: 'star_map_generator', label: 'Star Map Generator' },
    summary: { accepted_events_7d: 8 },
    traffic: null,
    events: { by_event_name: [{ event_name: 'page_view', events: 5 }] },
    health: null,
  });

  assert.ok(payload);
  const output = formatLighthouseReport(payload);
  assert.match(output, /Support class: event_only/);
  assert.match(output, /support_class source: temporary fallback/i);
});

test('by_event_name canonical array shape drives action summary', () => {
  const payload = normalizeSiteLighthouseReport({
    view: 'site',
    generated_at: null,
    scope: { site_key: 'star_map_generator', support_class: 'event_only' },
    summary: null,
    traffic: null,
    events: {
      by_event_name: [
        { event_name: 'page_view', events: 10 },
        { event_name: 'preview_generated', events: 3 },
        { event_name: 'payment_click', events: 1 },
      ],
    },
    health: null,
  });

  assert.ok(payload);
  assert.equal(payload.events?.by_event_name?.length, 3);

  const output = formatLighthouseReport(payload);
  assert.match(output, /Page views: 10/);
  assert.match(output, /Previews generated: 3/);
  assert.match(output, /Payment clicks: 1/);
});

test('legacy by_event_name object-map remains backward compatible', () => {
  const payload = normalizeSiteLighthouseReport({
    view: 'site',
    generated_at: null,
    scope: { site_key: 'star_map_generator', support_class: 'event_only' },
    summary: null,
    traffic: null,
    events: {
      by_event_name: { page_view: 11, preview_generated: 2 },
    },
    health: null,
  });

  assert.ok(payload);
  assert.equal(payload.events?.by_event_name?.length, 2);

  const output = formatLighthouseReport(payload);
  assert.match(output, /Page views: 11/);
  assert.match(output, /Previews generated: 2/);
});

test('no false source-to-conversion inference in read text', () => {
  const payload = normalizeSiteLighthouseReport({
    view: 'site',
    generated_at: null,
    scope: { site_key: 'star_map_generator', support_class: 'event_only' },
    summary: { accepted_events_7d: 60 },
    traffic: null,
    events: {
      by_event_name: [{ event_name: 'preview_generated', events: 10 }],
      top_sources: [{ source: 'reddit', events: 50 }],
    },
    health: null,
  });

  assert.ok(payload);
  const output = formatLighthouseReport(payload);
  assert.match(output, /Source rankings and action totals are separate aggregate views/);
  assert.match(output, /does not attribute specific actions to specific sources/);
  assert.doesNotMatch(output, /reddit.*preview/i);
});

test('event_only report omits Traffic and Identity by default', () => {
  const payload = normalizeSiteLighthouseReport({
    view: 'site',
    generated_at: null,
    scope: {
      site_key: 'star_map_generator',
      support_class: 'event_only',
      section_availability: { traffic: false, identity: false },
    },
    summary: null,
    traffic: {
      cloudflare_traffic_enabled: false,
      latest_day: null,
      last_7_days: { requests: 22, visits: 20 },
    },
    events: { by_event_name: [{ event_name: 'page_view', events: 2 }] },
    health: null,
    identity: {
      today: { new_users: 1, returning_users: 1, sessions: 1 },
      last_7_days: { new_users: 1, returning_users: 1, sessions: 1, return_rate: 1 },
    },
  });

  assert.ok(payload);
  const output = formatLighthouseReport(payload);
  assert.doesNotMatch(output, /\*\*Traffic\*\*/);
  assert.doesNotMatch(output, /\*\*Identity\*\*/);
});

test('production-only wording remains explicit for event_only', () => {
  const payload = normalizeSiteLighthouseReport({
    view: 'site',
    generated_at: null,
    scope: {
      site_key: 'tgc_site',
      support_class: 'event_only',
      production_only: true,
    },
    summary: { accepted_events_7d: 2 },
    traffic: null,
    events: {
      by_event_name: [{ event_name: 'page_view', events: 2 }],
      top_sources: [],
    },
    health: {
      excluded_non_production_host: 1,
      production_only_default: true,
    },
  });

  assert.ok(payload);
  const output = formatLighthouseReport(payload);
  assert.match(output, /Scope: production-only/);
  assert.match(output, /Attribution lists are empty in the current production-only scope/);
  assert.match(output, /Excluded non-production host: 1/);
});

test('event_only diagnostics include accepted signal and observability fields', () => {
  const payload = normalizeSiteLighthouseReport({
    view: 'site',
    generated_at: null,
    scope: { site_key: 'tgc_site', support_class: 'event_only' },
    summary: null,
    traffic: null,
    events: { accepted_signal_7d: 0, by_event_name: null },
    health: {
      included_events: 500,
      excluded_test_mode: 2,
      excluded_non_production_host: 3,
      dropped_invalid: 10,
      dropped_rate_limited: 5,
      cloudflare_traffic_enabled: true,
      last_received_at: '2026-04-08T20:02:00Z',
    },
  });

  assert.ok(payload);
  const output = formatLighthouseReport(payload);
  assert.match(output, /Accepted signal 7d: 0/);
  assert.match(output, /Included events: 500/);
  assert.match(output, /Excluded test mode: 2/);
  assert.match(output, /Excluded non-production host: 3/);
  assert.match(output, /Dropped invalid: 10/);
  assert.match(output, /Dropped rate limited: 5/);
  assert.match(output, /Cloudflare traffic enabled: true/);
});

test('report command route behavior: fleet default, buscore legacy, event_only site view', async () => {
  let requestedUrls: string[] = [];

  await withMockFetch(
    (async (input) => {
      requestedUrls.push(String(input));
      const url = String(input);

      if (url.includes('view=fleet')) {
        return new Response(JSON.stringify({
          view: 'fleet',
          generated_at: null,
          sites: [{ site_key: 'buscore', accepted_signal_7d: 1 }],
        })) as Response;
      }

      if (url.includes('view=site') && url.includes('site_key=star_map_generator')) {
        return new Response(JSON.stringify({
          view: 'site',
          generated_at: null,
          scope: { site_key: 'star_map_generator', support_class: 'event_only' },
          summary: { accepted_events_7d: 1 },
          traffic: null,
          events: { by_event_name: [{ event_name: 'page_view', events: 1 }] },
          health: null,
        })) as Response;
      }

      return new Response(JSON.stringify({
        today: { update_checks: 1, downloads: 0, errors: 0 },
      })) as Response;
    }) as typeof globalThis.fetch,
    async () => {
      const fleet = await invokeReport();
      const fleetContent = fleet.data && 'content' in fleet.data ? String(fleet.data.content ?? '') : '';
      assert.match(fleetContent, /\*\*Report · OK · 7d\*\*/);

      const buscore = await invokeReport([{ name: 'site', value: 'buscore' }]);
      const buscoreContent = buscore.data && 'content' in buscore.data ? String(buscore.data.content ?? '') : '';
      assert.match(buscoreContent, /\*\*Report · OK · today\*\*/);

      const site = await invokeReport([{ name: 'site', value: 'star_map_generator' }]);
      const siteContent = site.data && 'content' in site.data ? String(site.data.content ?? '') : '';
      assert.match(siteContent, /\*\*Attribution Summary\*\*/);

      assert.ok(requestedUrls.some((url) => /view=fleet/.test(url)));
      assert.ok(requestedUrls.some((url) => /view=site/.test(url) && /site_key=star_map_generator/.test(url)));
      assert.ok(requestedUrls.some((url) => !/view=/.test(url) && !/site_key=/.test(url)));
    },
  );
});

test('truncation preserves Attribution and Action summaries by trimming diagnostics first', async () => {
  const longToken = 'x'.repeat(280);

  await withMockFetch(
    (async () =>
      new Response(JSON.stringify({
        view: 'site',
        generated_at: null,
        scope: {
          site_key: 'star_map_generator',
          label: 'Star Map Generator',
          support_class: 'event_only',
        },
        summary: {
          accepted_events_7d: 120,
        },
        traffic: null,
        events: {
          accepted_signal_7d: 120,
          by_event_name: [
            { event_name: 'page_view', events: 120 },
            { event_name: 'preview_generated', events: 80 },
            { event_name: 'high_res_requested', events: 60 },
            { event_name: 'payment_click', events: 40 },
            { event_name: 'download_completed', events: 20 },
          ],
          top_paths: Array.from({ length: 20 }, (_, i) => ({ path: `/path_${i}_${longToken}`, events: i + 1 })),
          top_sources: Array.from({ length: 20 }, (_, i) => ({ source: `src_${i}_${longToken}`, events: i + 1 })),
          top_campaigns: Array.from({ length: 20 }, (_, i) => ({ utm_campaign: `camp_${i}_${longToken}`, events: i + 1 })),
          top_contents: Array.from({ length: 20 }, (_, i) => ({ utm_content: `content_${i}_${longToken}`, events: i + 1 })),
        },
        health: {
          included_events: 120,
          dropped_invalid: 0,
          dropped_rate_limited: 0,
          excluded_non_production_host: 0,
        },
      })) as Response) as typeof globalThis.fetch,
    async () => {
      const payload = await invokeReport([{ name: 'site', value: 'star_map_generator' }]);
      const content = payload.data && 'content' in payload.data ? String(payload.data.content ?? '') : '';

      assert.ok(content.length <= 2000);
      assert.match(content, /\*\*Attribution Summary\*\*/);
      assert.match(content, /\*\*Action Summary\*\*/);
      if (content.includes('[Report truncated to fit Discord message limit.]')) {
        assert.doesNotMatch(content, /\*\*Diagnostics\*\*/);
      }
    },
  );
});

test('report command remains deterministic and non-model-driven', () => {
  const source = fs.readFileSync('src/commands/report.ts', 'utf8');
  assert.doesNotMatch(source, /model|ollama|llm/i);
});

test('command registration includes report site/view options', () => {
  const names = commandDefinitions.map((definition) => definition.name).sort();
  assert.deepEqual(names, ['health', 'report']);

  const reportDefinition = commandDefinitions.find((definition) => definition.name === 'report');
  assert.ok(reportDefinition);
  assert.ok(reportDefinition.options);

  const optionNames = reportDefinition.options.map((option) => option.name).sort();
  assert.deepEqual(optionNames, ['site', 'view']);
});
