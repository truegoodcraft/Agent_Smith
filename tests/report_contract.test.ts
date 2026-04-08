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
} from '../src/types/telemetry';
import { formatLighthouseReport } from '../src/logic/report';
import { getLighthouseReport, LighthouseError } from '../src/services/lighthouse';
import { commandDefinitions } from '../src/commands';
import { report } from '../src/commands/report';

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

test('parses fleet response payload', () => {
  const payload = {
    view: 'fleet',
    generated_at: '2026-04-08T00:00:00Z',
    sites: [
      {
        site_key: 'buscore',
        label: 'BUS Core',
        backend_source: 'lighthouse',
        cloudflare_traffic_enabled: true,
        pageviews_7d: 10,
        requests_7d: 20,
        visits_7d: 15,
        accepted_signal_7d: 7,
        has_recent_signal: true,
        last_received_at: null,
      },
    ],
  };

  const parsed = normalizeFleetLighthouseReport(payload);
  assert.ok(parsed);
  assert.equal(parsed.view, 'fleet');
  assert.equal(parsed.sites[0].accepted_signal_7d, 7);
});

test('parses fleet alias fields without dropping values', () => {
  const payload = {
    view: 'fleet',
    generated_at: '2026-04-08T00:00:00Z',
    sites: [
      {
        site_key: 'buscore',
        label: 'BUS Core',
        backend_source: 'lighthouse',
        traffic_enabled: true,
        accepted_events_7d: 49,
        last_received: '2026-04-08T19:55:17.273Z',
      },
    ],
  };

  const parsed = normalizeFleetLighthouseReport(payload);
  assert.ok(parsed);
  assert.equal(parsed.sites[0].cloudflare_traffic_enabled, true);
  assert.equal(parsed.sites[0].accepted_signal_7d, 49);
  assert.equal(parsed.sites[0].last_received_at, '2026-04-08T19:55:17.273Z');

  const output = formatLighthouseReport(parsed);
  assert.match(output, /Cloudflare traffic enabled: true/);
  assert.match(output, /Accepted signal 7d: 49/);
  assert.match(output, /Last signal received: 2026-04-08T19:55:17.273Z/);
  assert.match(output, /Accepted signal 7d total: 49/);
});

test('parses site response payload', () => {
  const payload = {
    view: 'site',
    generated_at: '2026-04-08T00:00:00Z',
    scope: {
      site_key: 'tgc_site',
      label: 'TGC Site',
      backend_source: 'lighthouse',
      cloudflare_traffic_enabled: false,
    },
    summary: {
      pageviews_7d: null,
      requests_7d: null,
      visits_7d: null,
    },
    traffic: null,
    events: {
      accepted_signal_7d: 3,
      has_recent_signal: false,
      last_received_at: null,
    },
    health: {
      dropped_invalid: null,
      dropped_rate_limited: 0,
    },
  };

  const parsed = normalizeSiteLighthouseReport(payload);
  assert.ok(parsed);
  assert.equal(parsed.view, 'site');
  assert.equal(parsed.events?.accepted_signal_7d, 3);
});

test('parses site alias fields without dropping values', () => {
  const payload = {
    view: 'site',
    generated_at: '2026-04-08T00:00:00Z',
    scope: {
      site_key: 'star_map_generator',
      label: 'Star Map Generator',
      backend_source: 'lighthouse',
      traffic_enabled: true,
    },
    summary: {
      pageviews_7d: 10,
      requests_7d: 11,
      visits_7d: 12,
    },
    traffic: null,
    events: {
      accepted_events_7d: 3,
      has_recent_signal: true,
      last_received: '2026-04-08T20:05:07.704Z',
    },
    health: {
      dropped_invalid: 0,
      dropped_rate_limited: 0,
    },
  };

  const parsed = normalizeSiteLighthouseReport(payload);
  assert.ok(parsed);
  assert.equal(parsed.scope?.cloudflare_traffic_enabled, true);
  assert.equal(parsed.events?.accepted_signal_7d, 3);
  assert.equal(parsed.events?.last_received_at, '2026-04-08T20:05:07.704Z');

  const output = formatLighthouseReport(parsed);
  assert.match(output, /Cloudflare traffic enabled: true/);
  assert.match(output, /Accepted signal 7d: 3/);
  assert.match(output, /Last signal received: 2026-04-08T20:05:07.704Z/);
});

test('parses source health response payload', () => {
  const payload = {
    view: 'source_health',
    generated_at: '2026-04-08T00:00:00Z',
    sites: [
      {
        site_key: 'star_map_generator',
        label: 'Star Map Generator',
        accepted_signal_7d: 5,
        has_recent_signal: null,
        last_received_at: null,
        dropped_invalid: null,
        dropped_rate_limited: 2,
        cloudflare_traffic_enabled: false,
      },
    ],
  };

  const parsed = normalizeSourceHealthLighthouseReport(payload);
  assert.ok(parsed);
  assert.equal(parsed.view, 'source_health');
  assert.equal(parsed.sites[0].accepted_signal_7d, 5);
});

test('parses source health alias fields without dropping values', () => {
  const payload = {
    view: 'source_health',
    generated_at: '2026-04-08T00:00:00Z',
    sites: [
      {
        site_key: 'star_map_generator',
        label: 'Star Map Generator',
        accepted_events_7d: 3,
        has_recent_signal: true,
        last_received: '2026-04-08T20:05:07.704Z',
        dropped_invalid: 0,
        dropped_rate_limited: 0,
        traffic_enabled: false,
      },
    ],
  };

  const parsed = normalizeSourceHealthLighthouseReport(payload);
  assert.ok(parsed);
  assert.equal(parsed.sites[0].accepted_signal_7d, 3);
  assert.equal(parsed.sites[0].last_received_at, '2026-04-08T20:05:07.704Z');
  assert.equal(parsed.sites[0].cloudflare_traffic_enabled, false);

  const output = formatLighthouseReport(parsed);
  assert.match(output, /accepted_signal_7d=3/);
  assert.match(output, /last_received=2026-04-08T20:05:07.704Z/);
  assert.match(output, /traffic_enabled=false/);
});

test('accepted_signal_7d rejects boolean and sanitizes to unavailable', () => {
  const payload = {
    view: 'fleet',
    generated_at: '2026-04-08T00:00:00Z',
    sites: [
      {
        site_key: 'buscore',
        label: 'BUS Core',
        accepted_signal_7d: true,
      },
    ],
  };

  const parsed = normalizeFleetLighthouseReport(payload);
  assert.ok(parsed);
  assert.equal(parsed.sites[0].accepted_signal_7d, undefined);

  const output = formatLighthouseReport(parsed);
  assert.match(output, /Accepted signal 7d: unavailable/);
});

test('maps invalid view 400 error', async () => {
  await withMockFetch(
    (async () =>
      new Response(JSON.stringify({ ok: false, error: 'invalid_view' }), {
        status: 400,
      })) as typeof globalThis.fetch,
    async () => {
      await assert.rejects(
        async () => getLighthouseReport(baseEnv, { view: 'fleet' }),
        (error) => error instanceof LighthouseError && error.code === 'invalid_view',
      );
    },
  );
});

test('maps missing site key 400 error', async () => {
  await withMockFetch(
    (async () =>
      new Response(JSON.stringify({ ok: false, error: 'missing_site_key' }), {
        status: 400,
      })) as typeof globalThis.fetch,
    async () => {
      await assert.rejects(
        async () => getLighthouseReport(baseEnv, { view: 'site' }),
        (error) => error instanceof LighthouseError && error.code === 'missing_site_key',
      );
    },
  );
});

test('maps invalid site key 400 error', async () => {
  await withMockFetch(
    (async () =>
      new Response(JSON.stringify({ ok: false, error: 'invalid_site_key' }), {
        status: 400,
      })) as typeof globalThis.fetch,
    async () => {
      await assert.rejects(
        async () => getLighthouseReport(baseEnv, { view: 'site', siteKey: 'buscore' }),
        (error) => error instanceof LighthouseError && error.code === 'invalid_site_key',
      );
    },
  );
});

test('null metrics render as unavailable, never as zero', () => {
  const report = {
    view: 'fleet' as const,
    generated_at: null,
    sites: [
      {
        site_key: 'tgc_site',
        label: 'TGC Site',
        backend_source: 'lighthouse',
        cloudflare_traffic_enabled: false,
        pageviews_7d: null,
        requests_7d: null,
        visits_7d: null,
        accepted_signal_7d: null,
        has_recent_signal: null,
        last_received_at: null,
      },
    ],
  };

  const output = formatLighthouseReport(report);
  assert.match(output, /pageviews unavailable/);
  assert.doesNotMatch(output, /pageviews 0/);
});

test('fleet report hides unavailable has_recent_signal noise', () => {
  const report = {
    view: 'fleet' as const,
    generated_at: null,
    sites: [
      {
        site_key: 'tgc_site',
        label: 'TGC Site',
        accepted_signal_7d: 9,
        has_recent_signal: null,
        last_received_at: null,
      },
    ],
  };

  const output = formatLighthouseReport(report);
  assert.doesNotMatch(output, /Signal state: unavailable/);
  assert.match(output, /Accepted signal 7d: 9/);
});

test('legacy report path still formats', () => {
  const payload = normalizeLegacyLighthouseReport({
    today: { update_checks: 3, downloads: 1, errors: 0 },
    traffic: {
      latest_day: { day: null, visits: null, requests: null, captured_at: null },
      last_7_days: {
        visits: null,
        requests: null,
        avg_daily_visits: null,
        avg_daily_requests: null,
        days_with_data: null,
      },
    },
  });

  assert.ok(payload);
  const output = formatLighthouseReport(payload);
  assert.match(output, /\*\*Report · OK · today\*\*/);
});

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

test('bare /report defaults to all-sites fleet operator report', async () => {
  let requestedUrl = '';
  await withMockFetch(
    (async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({
        view: 'fleet',
        generated_at: null,
        sites: [
          {
            site_key: 'buscore',
            label: 'BUS Core',
            requests_7d: 8,
            visits_7d: 7,
            pageviews_7d: 6,
            accepted_signal_7d: 3,
            has_recent_signal: true,
            last_received_at: '2026-04-08T00:00:00Z',
          },
        ],
      })) as Response;
    }) as typeof globalThis.fetch,
    async () => {
      const payload = await invokeReport();
      const content = payload.data && 'content' in payload.data ? payload.data.content : '';

      assert.match(String(content), /\*\*Report · OK · 7d\*\*/);
      assert.match(String(content), /\*\*Sites Summary\*\*/);
      assert.match(requestedUrl, /view=fleet/);
    },
  );
});

test('bare /report preserves alias observability fields from fleet output', async () => {
  await withMockFetch(
    (async () =>
      new Response(JSON.stringify({
        view: 'fleet',
        generated_at: null,
        sites: [
          {
            site_key: 'buscore',
            label: 'BUS Core',
            backend_source: 'lighthouse',
            accepted_events_7d: 49,
            last_received: '2026-04-08T19:55:17.273Z',
            traffic_enabled: true,
          },
          {
            site_key: 'star_map_generator',
            label: 'Star Map Generator',
            backend_source: 'lighthouse',
            accepted_events_7d: 3,
            last_received: '2026-04-08T20:05:07.704Z',
            traffic_enabled: false,
          },
        ],
      })) as Response) as typeof globalThis.fetch,
    async () => {
      const payload = await invokeReport();
      const content = payload.data && 'content' in payload.data ? payload.data.content : '';

      assert.match(String(content), /Accepted signal 7d total: 52/);
      assert.match(String(content), /Accepted signal 7d: 49/);
      assert.match(String(content), /Last signal received: 2026-04-08T19:55:17.273Z/);
      assert.match(String(content), /Cloudflare traffic enabled: true/);
      assert.match(String(content), /Accepted signal 7d: 3/);
      assert.match(String(content), /Last signal received: 2026-04-08T20:05:07.704Z/);
    },
  );
});

test('report site:buscore preserves alias observability fields from site output', async () => {
  await withMockFetch(
    (async () =>
      new Response(JSON.stringify({
        view: 'site',
        generated_at: null,
        scope: {
          site_key: 'buscore',
          label: 'BUS Core',
          backend_source: 'lighthouse',
          traffic_enabled: true,
        },
        summary: { requests_7d: 22, visits_7d: 21, pageviews_7d: 20 },
        traffic: null,
        events: {
          accepted_events_7d: 49,
          has_recent_signal: true,
          last_received: '2026-04-08T19:55:17.273Z',
        },
        health: { dropped_invalid: 0, dropped_rate_limited: 0 },
      })) as Response) as typeof globalThis.fetch,
    async () => {
      const payload = await invokeReport([{ name: 'site', value: 'buscore' }]);
      const content = payload.data && 'content' in payload.data ? payload.data.content : '';

      assert.match(String(content), /Cloudflare traffic enabled: true/);
      assert.match(String(content), /Accepted signal 7d: 49/);
      assert.match(String(content), /Last signal received: 2026-04-08T19:55:17.273Z/);
      assert.doesNotMatch(String(content), /Accepted signal 7d: unavailable/);
      assert.doesNotMatch(String(content), /Last signal received: unavailable/);
    },
  );
});

test('report site:buscore routes to site view and renders BUS Core style sections', async () => {
  let requestedUrl = '';
  await withMockFetch(
    (async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({
        view: 'site',
        generated_at: null,
        scope: {
          site_key: 'buscore',
          label: 'BUS Core',
          backend_source: 'lighthouse',
          cloudflare_traffic_enabled: true,
        },
        summary: { requests_7d: 22, visits_7d: 21, pageviews_7d: 20 },
        traffic: {
          latest_day: { day: '2026-04-07', requests: 4, visits: 3, captured_at: '2026-04-08T00:00:00Z' },
          last_7_days: { requests: 22, visits: 21, avg_daily_requests: 3, avg_daily_visits: 3, days_with_data: 7 },
        },
        events: { accepted_signal_7d: 12, has_recent_signal: true, last_received_at: '2026-04-08T00:00:00Z' },
        health: { dropped_invalid: 0, dropped_rate_limited: 0 },
      })) as Response;
    }) as typeof globalThis.fetch,
    async () => {
      const payload = await invokeReport([{ name: 'site', value: 'buscore' }]);
      const content = payload.data && 'content' in payload.data ? payload.data.content : '';

      assert.match(requestedUrl, /view=site/);
      assert.match(requestedUrl, /site_key=buscore/);
      assert.match(String(content), /\*\*Report · BUS Core · 7d\*\*/);
      assert.match(String(content), /\*\*Summary\*\*/);
      assert.match(String(content), /\*\*Today\*\*/);
      assert.match(String(content), /\*\*Traffic\*\*/);
      assert.match(String(content), /\*\*Human Traffic \/ Events\*\*/);
      assert.match(String(content), /\*\*Observability\*\*/);
      assert.match(String(content), /\*\*Read\*\*/);
    },
  );
});

test('report site:tgc_site routes to site view', async () => {
  let requestedUrl = '';
  await withMockFetch(
    (async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({
        view: 'site',
        generated_at: null,
        scope: {
          site_key: 'tgc_site',
          label: 'TGC Site',
          backend_source: 'lighthouse',
          cloudflare_traffic_enabled: true,
        },
        summary: { requests_7d: null, visits_7d: null, pageviews_7d: null },
        traffic: null,
        events: { accepted_signal_7d: 2, has_recent_signal: false, last_received_at: null },
        health: { dropped_invalid: null, dropped_rate_limited: 1 },
      })) as Response;
    }) as typeof globalThis.fetch,
    async () => {
      const payload = await invokeReport([{ name: 'site', value: 'tgc_site' }]);
      const content = payload.data && 'content' in payload.data ? payload.data.content : '';

      assert.match(requestedUrl, /site_key=tgc_site/);
      assert.match(String(content), /Report · TGC Site · 7d/);
    },
  );
});

test('report site:star_map_generator routes to site view', async () => {
  let requestedUrl = '';
  await withMockFetch(
    (async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({
        view: 'site',
        generated_at: null,
        scope: {
          site_key: 'star_map_generator',
          label: 'Star Map Generator',
          backend_source: 'lighthouse',
          cloudflare_traffic_enabled: false,
        },
        summary: { requests_7d: 1, visits_7d: 1, pageviews_7d: 0 },
        traffic: {
          latest_day: { day: null, requests: null, visits: null, captured_at: null },
          last_7_days: { requests: 1, visits: 1, avg_daily_requests: 0.1, avg_daily_visits: 0.1, days_with_data: 1 },
        },
        events: { accepted_signal_7d: 1, has_recent_signal: true, last_received_at: '2026-04-08T00:00:00Z' },
        health: { dropped_invalid: 0, dropped_rate_limited: 0 },
      })) as Response;
    }) as typeof globalThis.fetch,
    async () => {
      const payload = await invokeReport([{ name: 'site', value: 'star_map_generator' }]);
      const content = payload.data && 'content' in payload.data ? payload.data.content : '';

      assert.match(requestedUrl, /site_key=star_map_generator/);
      assert.match(String(content), /Report · Star Map Generator · 7d/);
    },
  );
});

test('report command remains deterministic and non-model-driven', () => {
  const source = fs.readFileSync('src/commands/report.ts', 'utf8');
  assert.doesNotMatch(source, /model|ollama|llm/i);
});

test('command registration payload includes health and report with report site/view options', () => {
  const names = commandDefinitions.map((definition) => definition.name).sort();
  assert.deepEqual(names, ['health', 'report']);

  const reportDefinition = commandDefinitions.find((definition) => definition.name === 'report');
  assert.ok(reportDefinition);
  assert.ok(reportDefinition.options);

  const optionNames = reportDefinition.options.map((option) => option.name).sort();
  assert.deepEqual(optionNames, ['site', 'view']);
});

test('site report summary displays all expanded fields when present', () => {
  const payload = {
    view: 'site' as const,
    generated_at: '2026-04-08T00:00:00Z',
    scope: {
      site_key: 'buscore',
      label: 'BUS Core',
      backend_source: 'lighthouse',
      cloudflare_traffic_enabled: true,
    },
    summary: {
      pageviews_7d: 100,
      requests_7d: 150,
      visits_7d: 80,
      accepted_events_7d: 42,
      last_received_at: '2026-04-08T20:00:00Z',
      has_recent_signal: true,
    },
    traffic: { latest_day: null, last_7_days: null },
    events: null,
    health: null,
  };

  const parsed = normalizeSiteLighthouseReport(payload);
  assert.ok(parsed);
  assert.equal(parsed.summary?.accepted_events_7d, 42);
  assert.equal(parsed.summary?.last_received_at, '2026-04-08T20:00:00Z');
  assert.equal(parsed.summary?.has_recent_signal, true);

  const output = formatLighthouseReport(parsed);
  assert.match(output, /Accepted events 7d: 42/);
  assert.match(output, /Last received: 2026-04-08T20:00:00Z/);
  assert.match(output, /Signal state: recent/);
});

test('site report events section displays event details when present', () => {
  const payload = {
    view: 'site' as const,
    generated_at: '2026-04-08T00:00:00Z',
    scope: { site_key: 'star_map_generator', label: 'Star Map Generator' },
    summary: null,
    traffic: null,
    events: {
      accepted_signal_7d: 50,
      accepted_events: 48,
      unique_paths: 12,
      has_recent_signal: true,
      last_received_at: '2026-04-08T20:01:00Z',
      by_event_name: { click: 30, view: 18 },
      top_sources: [
        { name: 'github', count: 25 },
        { name: 'twitter', count: 15 },
      ],
      top_campaigns: [{ name: 'spring_launch', count: 40 }],
      top_referrers: [{ name: 'example.com', count: 35 }],
    },
    health: null,
  };

  const parsed = normalizeSiteLighthouseReport(payload);
  assert.ok(parsed);
  assert.equal(parsed.events?.accepted_signal_7d, 50);
  assert.equal(parsed.events?.accepted_events, 48);
  assert.equal(parsed.events?.unique_paths, 12);
  assert.ok(parsed.events?.by_event_name);
  assert.equal(parsed.events.by_event_name.click, 30);

  const output = formatLighthouseReport(parsed);
  assert.match(output, /Accepted signal 7d: 50/);
  assert.match(output, /Accepted events: 48/);
  assert.match(output, /Unique paths: 12/);
  assert.match(output, /By Event Name:/);
  assert.match(output, /click \(30\)/);
  assert.match(output, /Top sources:/);
  assert.match(output, /github \(25\)/);
  assert.match(output, /Top campaigns:/);
  assert.match(output, /spring_launch \(40\)/);
  assert.match(output, /Top referrers:/);
  assert.match(output, /example.com \(35\)/);
});

test('site report health section displays all observability fields when present', () => {
  const payload = {
    view: 'site' as const,
    generated_at: '2026-04-08T00:00:00Z',
    scope: { site_key: 'tgc_site', label: 'TGC Site' },
    summary: null,
    traffic: null,
    events: null,
    health: {
      dropped_invalid: 10,
      dropped_rate_limited: 5,
      last_received_at: '2026-04-08T20:02:00Z',
      included_events: 500,
      excluded_test_mode: 2,
      excluded_non_production_host: 3,
      cloudflare_traffic_enabled: true,
      production_only_default: true,
    },
  };

  const parsed = normalizeSiteLighthouseReport(payload);
  assert.ok(parsed);
  assert.equal(parsed.health?.dropped_invalid, 10);
  assert.equal(parsed.health?.dropped_rate_limited, 5);
  assert.equal(parsed.health?.last_received_at, '2026-04-08T20:02:00Z');
  assert.equal(parsed.health?.included_events, 500);
  assert.equal(parsed.health?.excluded_test_mode, 2);
  assert.equal(parsed.health?.excluded_non_production_host, 3);
  assert.equal(parsed.health?.cloudflare_traffic_enabled, true);
  assert.equal(parsed.health?.production_only_default, true);

  const output = formatLighthouseReport(parsed);
  assert.match(output, /Dropped invalid: 10/);
  assert.match(output, /Dropped rate limited: 5/);
  assert.match(output, /Last received: 2026-04-08T20:02:00Z/);
  assert.match(output, /Included events: 500/);
  assert.match(output, /Excluded test mode: 2/);
  assert.match(output, /Excluded non-prod host: 3/);
  assert.match(output, /Cloudflare traffic enabled: true/);
  assert.match(output, /Production only default: true/);
});

test('site report displays identity section when present', () => {
  const payload = {
    view: 'site' as const,
    generated_at: '2026-04-08T00:00:00Z',
    scope: { site_key: 'buscore', label: 'BUS Core' },
    summary: null,
    traffic: null,
    events: null,
    health: null,
    identity: {
      today: { new_users: 5, returning_users: 3, sessions: 8 },
      last_7_days: { new_users: 25, returning_users: 15, sessions: 45, return_rate: 0.375 },
      top_sources_by_returning_users: [
        { source: 'direct', users: 8 },
        { source: 'github', users: 5 },
      ],
    },
  };

  const parsed = normalizeSiteLighthouseReport(payload);
  assert.ok(parsed);
  assert.ok(parsed.identity);
  assert.equal(parsed.identity.today?.new_users, 5);
  assert.equal(parsed.identity.last_7_days?.return_rate, 0.375);

  const output = formatLighthouseReport(parsed);
  assert.match(output, /\*\*Identity\*\*/);
  assert.match(output, /New users \(today\): 5/);
  assert.match(output, /Returning users \(today\): 3/);
  assert.match(output, /Sessions \(today\): 8/);
  assert.match(output, /New users \(7d\): 25/);
  assert.match(output, /Return rate \(7d\): 37.5%/);
  assert.match(output, /Top Sources by Returning Users:/);
  assert.match(output, /direct \(8\)/);
});

test('traffic section includes cloudflare_traffic_enabled from traffic payload', () => {
  const payload = {
    view: 'site' as const,
    generated_at: null,
    scope: { site_key: 'star_map_generator' },
    summary: null,
    traffic: {
      cloudflare_traffic_enabled: false,
      latest_day: null,
      last_7_days: { requests: 22, visits: 20 },
    },
    events: null,
    health: null,
  };

  const parsed = normalizeSiteLighthouseReport(payload);
  assert.ok(parsed);
  assert.equal(parsed.traffic?.cloudflare_traffic_enabled, false);

  const output = formatLighthouseReport(parsed);
  assert.match(output, /\*\*Traffic\*\*/);
  assert.match(output, /Cloudflare traffic enabled: false/);
  assert.match(output, /Requests 7d: 22/);
  assert.match(output, /Visits 7d: 20/);
});

test('site report aliases are normalized in all relevant sections', () => {
  const payload = {
    view: 'site' as const,
    generated_at: null,
    scope: { site_key: 'buscore', traffic_enabled: true },
    summary: {
      accepted_events_7d: 15,
      last_received: '2026-04-08T21:00:00Z',
    },
    traffic: { traffic_enabled: false },
    events: {
      accepted_events_7d: 12,
      last_received: '2026-04-08T21:05:00Z',
    },
    health: {
      traffic_enabled: true,
      last_received: '2026-04-08T21:10:00Z',
    },
  };

  const parsed = normalizeSiteLighthouseReport(payload);
  assert.ok(parsed);
  // Check aliases are resolved
  assert.equal(parsed.scope?.cloudflare_traffic_enabled, true);
  assert.equal(parsed.summary?.accepted_events_7d, 15);
  assert.equal(parsed.summary?.last_received_at, '2026-04-08T21:00:00Z');
  assert.equal(parsed.traffic?.cloudflare_traffic_enabled, false);
  // Events normalizes accepted_events_7d to accepted_signal_7d
  assert.equal(parsed.events?.accepted_signal_7d, 12);
  assert.equal(parsed.events?.last_received_at, '2026-04-08T21:05:00Z');
  assert.equal(parsed.health?.cloudflare_traffic_enabled, true);
  assert.equal(parsed.health?.last_received_at, '2026-04-08T21:10:00Z');
});

test('null event details render as unavailable, not as zeros or dropped', () => {
  const payload = {
    view: 'site' as const,
    generated_at: null,
    scope: { site_key: 'tgc_site' },
    summary: null,
    traffic: null,
    events: {
      accepted_signal_7d: 0,
      accepted_events: null,
      unique_paths: null,
      by_event_name: null,
      top_sources: null,
      top_campaigns: null,
      top_referrers: null,
    },
    health: null,
  };

  const parsed = normalizeSiteLighthouseReport(payload);
  assert.ok(parsed);
  const output = formatLighthouseReport(parsed);
  assert.match(output, /Accepted signal 7d: 0/);
  assert.match(output, /Accepted events: unavailable/);
  assert.match(output, /Unique paths: unavailable/);
  assert.doesNotMatch(output, /By Event Name:/);
  assert.doesNotMatch(output, /Top sources:/);
});

