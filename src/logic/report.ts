// src/logic/report.ts

import { LighthouseReport, ReportTraffic, ReportWindow, SelectedReport } from '../types/telemetry';

/**
 * Selects the canonical report window based on fixed rules.
 * Prefers `last_7_days` if present, otherwise falls back to `today`.
 */
export function selectReportWindow(payload: LighthouseReport): SelectedReport {
  if (payload.last_7_days) {
    return {
      windowLabel: '7d',
      selected: payload.last_7_days,
      today: payload.today,
      yesterday: payload.yesterday,
      traffic: payload.traffic,
    };
  }
  return {
    windowLabel: 'today',
    selected: payload.today,
    today: payload.today,
    yesterday: payload.yesterday,
    traffic: payload.traffic,
  };
}

/**
 * Generates deterministic read line from selected-window counters.
 */
export function getCoreRead(counters: ReportWindow): string {
  if (counters.errors > 0) {
    return 'Recent error activity present; investigation recommended.';
  }

  if (counters.downloads > 0 || counters.update_checks > 0) {
    return 'Normal activity present with no recent errors.';
  }

  return 'No core activity recorded in the selected window.';
}

function formatCounters(label: string, counters: ReportWindow): string {
  return [
    `**${label}**`,
    `- Update checks: ${counters.update_checks}`,
    `- Downloads: ${counters.downloads}`,
    `- Errors: ${counters.errors}`,
  ].join('\n');
}

export function getTrafficRead(traffic?: ReportTraffic): string {
  if (!traffic) {
    return 'Traffic data not present in this Lighthouse report.';
  }

  const readParts = [
    traffic.latest_day.day
      ? 'Traffic snapshot present for latest completed day.'
      : 'No traffic snapshot recorded yet.',
  ];

  if (traffic.last_7_days.days_with_data === 0) {
    readParts.push('No traffic history stored in the last 7 days.');
  } else if (
    typeof traffic.last_7_days.days_with_data === 'number' &&
    traffic.last_7_days.days_with_data > 0 &&
    typeof traffic.last_7_days.avg_daily_requests === 'number' &&
    traffic.last_7_days.avg_daily_requests > 0
  ) {
    readParts.push('Traffic history is available for recent days.');
  }

  return readParts.join(' ');
}

function formatNullableValue(value: number | string | null): string {
  if (value === null) {
    return 'unavailable';
  }

  return String(value);
}

function formatReferrerSummary(value: unknown | null): string {
  if (value === null) {
    return 'unavailable';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return 'unavailable';
  }
}

function formatTrafficSection(traffic?: ReportTraffic): string {
  if (!traffic) {
    return ['**Traffic**', 'Traffic data not present in this Lighthouse report.'].join('\n');
  }

  return [
    '**Traffic**',
    `- Latest snapshot day: ${formatNullableValue(traffic.latest_day.day)}`,
    `- Latest captured at: ${formatNullableValue(traffic.latest_day.captured_at)}`,
    `- Latest requests: ${formatNullableValue(traffic.latest_day.requests)}`,
    `- Latest visits: ${formatNullableValue(traffic.latest_day.visits)}`,
    `- Latest referrer summary: ${formatReferrerSummary(traffic.latest_day.referrer_summary)}`,
    `- Last 7 days requests: ${formatNullableValue(traffic.last_7_days.requests)}`,
    `- Last 7 days visits: ${formatNullableValue(traffic.last_7_days.visits)}`,
    `- Avg daily requests: ${formatNullableValue(traffic.last_7_days.avg_daily_requests)}`,
    `- Avg daily visits: ${formatNullableValue(traffic.last_7_days.avg_daily_visits)}`,
    `- Days with data: ${formatNullableValue(traffic.last_7_days.days_with_data)}`,
  ].join('\n');
}

/**
 * Formats the final report string to be sent to Discord.
 */
export function formatReport(report: SelectedReport): string {
  const statusLine = report.windowLabel === '7d'
    ? 'Report · OK · 7d'
    : 'Report · OK · today';

  const selectedBlock = formatCounters('Summary', report.selected);
  const todayBlock = formatCounters('Today', report.today);
  const trafficBlock = formatTrafficSection(report.traffic);
  const deterministicRead = [getCoreRead(report.selected), getTrafficRead(report.traffic)]
    .map((line) => `- ${line}`)
    .join('\n');

  return [
    `**${statusLine}**`,
    '',
    selectedBlock,
    '',
    todayBlock,
    '',
    trafficBlock,
    '',
    '**Read**',
    deterministicRead,
  ].join('\n');
}
