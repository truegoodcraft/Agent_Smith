// src/logic/report.ts

import {
  LighthouseReport,
  ReportHumanTraffic,
  ReportIdentity,
  ReportTraffic,
  ReportWindow,
  SelectedReport,
} from '../types/telemetry';

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
      human_traffic: payload.human_traffic,
      identity: payload.identity,
    };
  }
  return {
    windowLabel: 'today',
    selected: payload.today,
    today: payload.today,
    yesterday: payload.yesterday,
    traffic: payload.traffic,
    human_traffic: payload.human_traffic,
    identity: payload.identity,
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

function formatNullableNumber(value?: number | null): string {
  if (typeof value !== 'number') {
    return 'unavailable';
  }

  return String(value);
}

function formatReturnRate(value?: number | null): string {
  if (typeof value !== 'number') {
    return 'unavailable';
  }

  const percentage = value <= 1 ? value * 100 : value;
  return `${percentage.toFixed(1)}%`;
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
    `- Last 7 days requests: ${formatNullableValue(traffic.last_7_days.requests)}`,
    `- Last 7 days visits: ${formatNullableValue(traffic.last_7_days.visits)}`,
    `- Avg daily requests: ${formatNullableValue(traffic.last_7_days.avg_daily_requests)}`,
    `- Avg daily visits: ${formatNullableValue(traffic.last_7_days.avg_daily_visits)}`,
    `- Days with data: ${formatNullableValue(traffic.last_7_days.days_with_data)}`,
  ].join('\n');
}

function formatTopList(
  heading: string,
  entries: string[],
): string {
  if (entries.length === 0) {
    return '';
  }

  return [heading, ...entries.map((entry) => `- ${entry}`)].join('\n');
}

function formatHumanTrafficSection(humanTraffic: ReportHumanTraffic): string {
  const topPathsBlock = formatTopList(
    'Top Paths:',
    humanTraffic.last_7_days.top_paths.map((entry) => `${entry.path} (${entry.pageviews})`),
  );
  const topReferrersBlock = formatTopList(
    'Top Referrers:',
    humanTraffic.last_7_days.top_referrers.map(
      (entry) => `${entry.referrer_domain} (${entry.pageviews})`,
    ),
  );
  const topSourcesBlock = formatTopList(
    'Top Sources:',
    humanTraffic.last_7_days.top_sources.map((entry) => `${entry.source} (${entry.pageviews})`),
  );

  return [
    '**Human Traffic**',
    `- Pageviews (today): ${humanTraffic.today.pageviews}`,
    `- Pageviews (7d): ${humanTraffic.last_7_days.pageviews}`,
    `- Days with data: ${humanTraffic.last_7_days.days_with_data}`,
    topPathsBlock,
    topReferrersBlock,
    topSourcesBlock,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatHumanObservabilitySection(humanTraffic: ReportHumanTraffic): string {
  return [
    '**Observability**',
    `- Accepted: ${humanTraffic.observability.accepted}`,
    `- Dropped (rate limited): ${humanTraffic.observability.dropped_rate_limited}`,
    `- Dropped (invalid): ${humanTraffic.observability.dropped_invalid}`,
  ].join('\n');
}

function formatIdentitySection(identity: ReportIdentity): string {
  const topReturningSources = identity.top_sources_by_returning_users.length > 0
    ? identity.top_sources_by_returning_users.map((entry) => `- ${entry.source} (${entry.users})`).join('\n')
    : '- none';

  return [
    '**Identity**',
    `- New users (today): ${formatNullableNumber(identity.today?.new_users)}`,
    `- Returning users (today): ${formatNullableNumber(identity.today?.returning_users)}`,
    `- Sessions (today): ${formatNullableNumber(identity.today?.sessions)}`,
    `- New users (7d): ${formatNullableNumber(identity.last_7_days?.new_users)}`,
    `- Returning users (7d): ${formatNullableNumber(identity.last_7_days?.returning_users)}`,
    `- Sessions (7d): ${formatNullableNumber(identity.last_7_days?.sessions)}`,
    `- Return rate (7d): ${formatReturnRate(identity.last_7_days?.return_rate)}`,
    'Top Sources by Returning Users:',
    topReturningSources,
  ].join('\n');
}

function isTinyIdentitySignal(identity: ReportIdentity): boolean {
  const todayReturning = identity.today?.returning_users;
  const sevenDayReturning = identity.last_7_days?.returning_users;
  const todayNewUsers = identity.today?.new_users;
  const sevenDayNewUsers = identity.last_7_days?.new_users;
  const knownValues = [todayReturning, sevenDayReturning, todayNewUsers, sevenDayNewUsers]
    .filter((value): value is number => typeof value === 'number');

  return knownValues.length > 0 && Math.max(...knownValues) <= 2;
}

export function getIdentityReadLines(identity?: ReportIdentity): string[] {
  if (!identity) {
    return [];
  }

  const lines: string[] = [];
  const todayReturning = identity.today?.returning_users;
  const sevenDayReturning = identity.last_7_days?.returning_users;
  const todayNewUsers = identity.today?.new_users;
  const sevenDayNewUsers = identity.last_7_days?.new_users;
  const todaySessions = identity.today?.sessions;
  const sevenDaySessions = identity.last_7_days?.sessions;
  const returningSourceLeader = identity.top_sources_by_returning_users
    .filter((entry) => entry.users > 0)
    .sort((a, b) => b.users - a.users)[0];
  const hasKnownReturning = typeof todayReturning === 'number' || typeof sevenDayReturning === 'number';
  const hasReturningUsersFromCounters = (typeof todayReturning === 'number' && todayReturning > 0)
    || (typeof sevenDayReturning === 'number' && sevenDayReturning > 0);
  const hasReturningUsers = hasReturningUsersFromCounters || Boolean(returningSourceLeader);
  const hasAcquisitionOrActivity =
    (typeof todayNewUsers === 'number' && todayNewUsers > 0)
    || (typeof sevenDayNewUsers === 'number' && sevenDayNewUsers > 0)
    || (typeof todaySessions === 'number' && todaySessions > 0)
    || (typeof sevenDaySessions === 'number' && sevenDaySessions > 0);

  if (hasReturningUsers) {
    if (isTinyIdentitySignal(identity)) {
      lines.push('A small but real anonymous return signal is present; repeat engagement is visible, though still too early for strong conclusions.');
    } else {
      lines.push('Anonymous return activity detected. Returning visitors are present in the 7-day window.');
    }
  } else if (hasKnownReturning && todayReturning === 0 && sevenDayReturning === 0) {
    if (hasAcquisitionOrActivity) {
      lines.push('Acquisition and activity are present, but no anonymous return activity is visible yet.');
    } else {
      lines.push('No returning anonymous visitors detected yet.');
    }
  }

  const sevenDayDistinctUsers =
    typeof sevenDayNewUsers === 'number' && typeof sevenDayReturning === 'number'
      ? sevenDayNewUsers + sevenDayReturning
      : null;

  if (
    typeof sevenDaySessions === 'number'
    && typeof sevenDayDistinctUsers === 'number'
    && sevenDayDistinctUsers > 0
    && sevenDaySessions > sevenDayDistinctUsers
  ) {
    lines.push('Session volume exceeds distinct-user counts, suggesting revisit depth or multi-session behavior.');
  }

  if (returningSourceLeader) {
    lines.push(`${returningSourceLeader.source} appears in returning-user attribution, making it more meaningful than raw click volume alone.`);
  }

  if (lines.length === 0) {
    lines.push('No returning anonymous visitors detected yet.');
  }

  return lines.slice(0, 3);
}

export function getHumanTrafficRead(
  humanTraffic: ReportHumanTraffic | undefined,
  selected: ReportWindow,
  windowLabel: '7d' | 'today',
): string | null {
  if (!humanTraffic) {
    return null;
  }

  const pageviewsInSelectedWindow = windowLabel === '7d'
    ? humanTraffic.last_7_days.pageviews
    : humanTraffic.today.pageviews;

  const humanSignalLine = humanTraffic.today.pageviews > 0
    ? `Human activity present with ${humanTraffic.today.pageviews} pageviews.`
    : 'Human traffic absent or very low.';

  let engagementLine = '';
  if (selected.downloads > 0 && pageviewsInSelectedWindow === 0) {
    engagementLine = 'Downloads present without pageviews (possible direct/binary access).';
  } else if (pageviewsInSelectedWindow > 0 && selected.downloads === 0) {
    engagementLine = 'Pageviews present without downloads (low conversion).';
  } else if (pageviewsInSelectedWindow > 0 && selected.downloads > 0) {
    engagementLine = 'Pageviews and downloads both present (active engagement).';
  }

  return [humanSignalLine, engagementLine].filter(Boolean).join(' ');
}

/**
 * Formats the final report string to be sent to Discord.
 */
export function formatReport(report: SelectedReport): string {
  try {
    const statusLine = report.windowLabel === '7d'
      ? 'Report · OK · 7d'
      : 'Report · OK · today';

  const selectedBlock = formatCounters('Summary', report.selected);
  const todayBlock = formatCounters('Today', report.today);
  const trafficBlock = formatTrafficSection(report.traffic);
  const humanTrafficBlock = report.human_traffic
    ? formatHumanTrafficSection(report.human_traffic)
    : null;
  const humanObservabilityBlock = report.human_traffic
    ? formatHumanObservabilitySection(report.human_traffic)
    : null;
  const identityBlock = report.identity
    ? formatIdentitySection(report.identity)
    : null;
  const identityReadLines = getIdentityReadLines(report.identity);
  const deterministicRead = [
    getCoreRead(report.selected),
    getTrafficRead(report.traffic),
    getHumanTrafficRead(report.human_traffic, report.selected, report.windowLabel),
    ...identityReadLines,
  ]
    .filter((line): line is string => Boolean(line))
    .map((line) => `- ${line}`)
    .join('\n');

  const sections = [
    `**${statusLine}**`,
    '',
    selectedBlock,
    '',
    todayBlock,
    '',
    trafficBlock,
  ];

  if (humanTrafficBlock && humanObservabilityBlock) {
    sections.push(
      '',
      humanTrafficBlock,
      '',
      humanObservabilityBlock,
    );
  }

  if (identityBlock) {
    sections.push(
      '',
      identityBlock,
    );
  }

  sections.push(
    '',
    '**Read**',
    deterministicRead,
  );

  const formatted = sections.join('\n');
  console.log('[REPORT_FORMAT_OK] Report formatted successfully');
  return formatted;
  } catch (e) {
    console.error('[REPORT_FORMAT_FAIL] Exception during formatting', e);
    throw e;
  }
}
