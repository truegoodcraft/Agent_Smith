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
