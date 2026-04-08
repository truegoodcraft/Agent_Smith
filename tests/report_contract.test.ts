import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  normalizeFleetLighthouseReport,
  normalizeLegacyLighthouseReport,
  normalizeSiteLighthouseReport,
  normalizeSourceHealthLighthouseReport,
} from '../src/types/telemetry';
import { formatLighthouseReport } from '../src/logic/report';
import { getLighthouseReport, LighthouseError } from '../src/services/lighthouse';
import { commandDefinitions } from '../src/commands';

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
      accepted_signal_7d: true,
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
  assert.equal(parsed.events?.accepted_signal_7d, true);
});

test('parses source health response payload', () => {
  const payload = {
    view: 'source_health',
    generated_at: '2026-04-08T00:00:00Z',
    sites: [
      {
        site_key: 'star_map_generator',
        label: 'Star Map Generator',
        accepted_signal_7d: false,
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
  assert.equal(parsed.sites[0].accepted_signal_7d, false);
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
  assert.match(output, /pageviews_7d=unavailable/);
  assert.doesNotMatch(output, /pageviews_7d=0/);
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

test('report command remains deterministic and non-model-driven', () => {
  const source = fs.readFileSync('src/commands/report.ts', 'utf8');
  assert.doesNotMatch(source, /model|ollama|llm/i);
});

test('command registration payload includes health and report with report view/site options', () => {
  const names = commandDefinitions.map((definition) => definition.name).sort();
  assert.deepEqual(names, ['health', 'report']);

  const reportDefinition = commandDefinitions.find((definition) => definition.name === 'report');
  assert.ok(reportDefinition);
  assert.ok(reportDefinition.options);

  const optionNames = reportDefinition.options.map((option) => option.name).sort();
  assert.deepEqual(optionNames, ['site', 'view']);
});
