import {
  FleetLighthouseReport,
  FleetReportSite,
  LegacyLighthouseReport,
  LighthouseReportPayload,
  ReportHumanTraffic,
  ReportIdentity,
  ReportTraffic,
  ReportWindow,
  SelectedLegacyReport,
  SiteLighthouseReport,
  SourceHealthLighthouseReport,
  SourceHealthSite,
} from '../types/telemetry';

export function selectReportWindow(payload: LegacyLighthouseReport): SelectedLegacyReport {
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

export function getCoreRead(counters: ReportWindow): string {
  if (counters.errors > 0) {
    return 'Recent error activity present; investigation recommended.';
  }

  if (counters.downloads > 0 || counters.update_checks > 0) {
    return 'Normal activity present with no recent errors.';
  }

  return 'No core activity recorded in the selected window.';
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

function formatCounters(label: string, counters: ReportWindow): string {
  return [
    `**${label}**`,
    `- Update checks: ${counters.update_checks}`,
    `- Downloads: ${counters.downloads}`,
    `- Errors: ${counters.errors}`,
  ].join('\n');
}

function formatNullableValue(value: number | string | boolean | null | undefined): string {
  if (value === undefined || value === null) {
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

function formatTopList(heading: string, entries: string[]): string {
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
    `- Last received: ${formatNullableValue(humanTraffic.observability.last_received_at)}`,
  ].join('\n');
}

function formatIdentitySection(identity: ReportIdentity): string {
  const topReturningSources =
    identity.top_sources_by_returning_users.length > 0
      ? identity.top_sources_by_returning_users
          .map((entry) => `- ${entry.source} (${entry.users})`)
          .join('\n')
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

  const knownValues = [todayReturning, sevenDayReturning, todayNewUsers, sevenDayNewUsers].filter(
    (value): value is number => typeof value === 'number',
  );

  return knownValues.length > 0 && Math.max(...knownValues) <= 2;
}

function getIdentityReadLines(identity?: ReportIdentity): string[] {
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

  const hasKnownReturning =
    typeof todayReturning === 'number' || typeof sevenDayReturning === 'number';

  const hasReturningUsersFromCounters =
    (typeof todayReturning === 'number' && todayReturning > 0) ||
    (typeof sevenDayReturning === 'number' && sevenDayReturning > 0);

  const hasReturningUsers = hasReturningUsersFromCounters || Boolean(returningSourceLeader);

  const hasAcquisitionOrActivity =
    (typeof todayNewUsers === 'number' && todayNewUsers > 0) ||
    (typeof sevenDayNewUsers === 'number' && sevenDayNewUsers > 0) ||
    (typeof todaySessions === 'number' && todaySessions > 0) ||
    (typeof sevenDaySessions === 'number' && sevenDaySessions > 0);

  if (hasReturningUsers) {
    if (isTinyIdentitySignal(identity)) {
      lines.push(
        'A small but real anonymous return signal is present; repeat engagement is visible, though still too early for strong conclusions.',
      );
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
    typeof sevenDaySessions === 'number' &&
    typeof sevenDayDistinctUsers === 'number' &&
    sevenDayDistinctUsers > 0 &&
    sevenDaySessions > sevenDayDistinctUsers
  ) {
    lines.push(
      'Session volume exceeds distinct-user counts, suggesting revisit depth or multi-session behavior.',
    );
  }

  if (returningSourceLeader) {
    lines.push(
      `${returningSourceLeader.source} appears in returning-user attribution, making it more meaningful than raw click volume alone.`,
    );
  }

  if (lines.length === 0) {
    lines.push('No returning anonymous visitors detected yet.');
  }

  return lines.slice(0, 3);
}

function getHumanTrafficRead(
  humanTraffic: ReportHumanTraffic | undefined,
  selected: ReportWindow,
  windowLabel: '7d' | 'today',
): string | null {
  if (!humanTraffic) {
    return null;
  }

  const pageviewsInSelectedWindow =
    windowLabel === '7d' ? humanTraffic.last_7_days.pageviews : humanTraffic.today.pageviews;

  const humanSignalLine =
    humanTraffic.today.pageviews > 0
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

function formatFleetSiteLine(site: FleetReportSite): string {
  const label = site.label || site.site_key;
  const trafficBits = [
    `requests ${formatNullableValue(site.requests_7d)}`,
    `visits ${formatNullableValue(site.visits_7d)}`,
    `pageviews ${formatNullableValue(site.pageviews_7d)}`,
  ].join(' · ');

  const summaryLines = [
    `**${label}**`,
    `- Key: ${site.site_key}`,
    `- Traffic 7d: ${trafficBits}`,
    `- Accepted signal 7d: ${formatNullableValue(site.accepted_signal_7d)}`,
    `- Last signal received: ${formatNullableValue(site.last_received_at)}`,
  ];

  if (typeof site.has_recent_signal === 'boolean') {
    summaryLines.push(`- Signal state: ${site.has_recent_signal ? 'recent' : 'stale'}`);
  }

  return summaryLines.join('\n');
}

function formatSourceHealthSiteLine(site: SourceHealthSite): string {
  const label = site.label || site.site_key;
  const lines = [
    `- ${label} (${site.site_key})`,
    `  accepted_signal_7d=${formatNullableValue(site.accepted_signal_7d)}`,
    `  last_received=${formatNullableValue(site.last_received_at)}`,
    `  dropped_invalid=${formatNullableValue(site.dropped_invalid)}`,
    `  dropped_rate_limited=${formatNullableValue(site.dropped_rate_limited)}`,
  ];

  if (typeof site.has_recent_signal === 'boolean') {
    lines.push(`  has_recent_signal=${site.has_recent_signal}`);
  }

  return lines.join('\n');
}

function formatLegacyReport(report: SelectedLegacyReport): string {
  const statusLine = report.windowLabel === '7d' ? 'Report · OK · 7d' : 'Report · OK · today';

  const selectedBlock = formatCounters('Summary', report.selected);
  const todayBlock = formatCounters('Today', report.today);
  const trafficBlock = formatTrafficSection(report.traffic);

  const humanTrafficBlock = report.human_traffic
    ? formatHumanTrafficSection(report.human_traffic)
    : null;

  const humanObservabilityBlock = report.human_traffic
    ? formatHumanObservabilitySection(report.human_traffic)
    : null;

  const identityBlock = report.identity ? formatIdentitySection(report.identity) : null;
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

  const sections = [`**${statusLine}**`, '', selectedBlock, '', todayBlock, '', trafficBlock];

  if (humanTrafficBlock && humanObservabilityBlock) {
    sections.push('', humanTrafficBlock, '', humanObservabilityBlock);
  }

  if (identityBlock) {
    sections.push('', identityBlock);
  }

  sections.push('', '**Read**', deterministicRead);

  return sections.join('\n');
}

function formatFleetReport(report: FleetLighthouseReport): string {
  const siteLines = report.sites.length > 0
    ? report.sites.map((site) => formatFleetSiteLine(site)).join('\n\n')
    : '- none';

  const recentSignalCount = report.sites.filter((site) => site.has_recent_signal === true).length;
  const staleSignalCount = report.sites.filter((site) => site.has_recent_signal === false).length;
  const unknownSignalCount = report.sites.filter(
    (site) => typeof site.has_recent_signal !== 'boolean',
  ).length;

  const acceptedSignalValues = report.sites
    .map((site) => site.accepted_signal_7d)
    .filter((value): value is number => typeof value === 'number');

  const totalAcceptedSignal = acceptedSignalValues.length > 0
    ? acceptedSignalValues.reduce((sum, value) => sum + value, 0)
    : null;

  const readLines: string[] = [];
  if (report.sites.length === 0) {
    readLines.push('No tracked sites were returned by Lighthouse.');
  } else {
    readLines.push(`${report.sites.length} tracked sites reported for the 7-day window.`);

    if (staleSignalCount > 0) {
      readLines.push(`${staleSignalCount} site(s) have stale signal state and may require telemetry checks.`);
    }

    if (typeof totalAcceptedSignal === 'number') {
      if (totalAcceptedSignal > 0) {
        readLines.push(`Accepted signal volume is active across the fleet (${totalAcceptedSignal} in 7d).`);
      } else {
        readLines.push('Accepted signal count is zero across reported sites in 7d.');
      }
    } else {
      readLines.push('Accepted signal totals are unavailable for all reported sites.');
    }
  }

  return [
    '**Report · OK · 7d**',
    `- Generated at: ${formatNullableValue(report.generated_at)}`,
    '',
    '**Sites Summary**',
    siteLines,
    '',
    '**Observability**',
    `- Sites with recent signal: ${recentSignalCount}`,
    `- Sites with stale signal: ${staleSignalCount}`,
    `- Sites with unknown signal state: ${unknownSignalCount}`,
    `- Accepted signal 7d total: ${formatNullableValue(totalAcceptedSignal)}`,
    '',
    '**Read**',
    ...readLines.map((line) => `- ${line}`),
  ].join('\n');
}

function formatSiteSection(
  title: string,
  section: object | null | undefined,
): string {
  if (!section) {
    return [`**${title}**`, '- unavailable'].join('\n');
  }

  const lines = Object.entries(section as Record<string, unknown>).map(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return `- ${key}: ${JSON.stringify(value)}`;
    }

    return `- ${key}: ${formatNullableValue(value as number | string | boolean | null | undefined)}`;
  });

  return [`**${title}**`, ...lines].join('\n');
}

function formatSiteReport(report: SiteLighthouseReport): string {
  const siteLabel = report.scope?.label || report.scope?.site_key || 'Site';

  const today = report.traffic?.latest_day;
  const todayHasData = Boolean(
    today &&
      (today.day !== undefined ||
        today.captured_at !== undefined ||
        today.requests !== undefined ||
        today.visits !== undefined),
  );

  const todaySection = todayHasData
    ? [
        '**Today**',
        `- Day: ${formatNullableValue(today?.day)}`,
        `- Captured at: ${formatNullableValue(today?.captured_at)}`,
        `- Requests: ${formatNullableValue(today?.requests)}`,
        `- Visits: ${formatNullableValue(today?.visits)}`,
      ].join('\n')
    : ['**Today**', '- unavailable'].join('\n');

  const eventsLines = [
    '**Human Traffic / Events**',
    `- Accepted signal 7d: ${formatNullableValue(report.events?.accepted_signal_7d)}`,
    `- Last signal received: ${formatNullableValue(report.events?.last_received_at)}`,
  ];
  if (typeof report.events?.has_recent_signal === 'boolean') {
    eventsLines.push(`- Signal state: ${report.events.has_recent_signal ? 'recent' : 'stale'}`);
  }

  const readLines: string[] = [];
  const requests7d = report.summary?.requests_7d;
  const pageviews7d = report.summary?.pageviews_7d;
  const acceptedSignal7d = report.events?.accepted_signal_7d;
  const droppedInvalid = report.health?.dropped_invalid;
  const droppedRateLimited = report.health?.dropped_rate_limited;

  if (
    typeof requests7d === 'number' &&
    requests7d > 0
  ) {
    readLines.push('Traffic activity is present in the 7-day window.');
  } else if (requests7d === 0) {
    readLines.push('No request traffic recorded for the 7-day window.');
  } else if (typeof pageviews7d === 'number' && pageviews7d > 0) {
    readLines.push('Pageview signal is present in the 7-day window.');
  } else {
    readLines.push('Traffic signal is unavailable or not yet present for this site.');
  }

  if (typeof acceptedSignal7d === 'number') {
    if (acceptedSignal7d > 0) {
      readLines.push(`Events signal is active (${acceptedSignal7d} accepted in 7d).`);
    } else {
      readLines.push('Events signal is present but currently zero in 7d.');
    }
  }

  if (
    (typeof droppedInvalid === 'number' && droppedInvalid > 0) ||
    (typeof droppedRateLimited === 'number' && droppedRateLimited > 0)
  ) {
    readLines.push('Dropped telemetry is present and should be reviewed in observability metrics.');
  }

  if (readLines.length === 0) {
    readLines.push('No meaningful operator signals are available for this site yet.');
  }

  return [
    `**Report · ${siteLabel} · 7d**`,
    `- Generated at: ${formatNullableValue(report.generated_at)}`,
    '',
    '**Summary**',
    `- Site key: ${formatNullableValue(report.scope?.site_key)}`,
    `- Backend source: ${formatNullableValue(report.scope?.backend_source)}`,
    `- Cloudflare traffic enabled: ${formatNullableValue(report.scope?.cloudflare_traffic_enabled)}`,
    `- Requests 7d: ${formatNullableValue(report.summary?.requests_7d)}`,
    `- Visits 7d: ${formatNullableValue(report.summary?.visits_7d)}`,
    `- Pageviews 7d: ${formatNullableValue(report.summary?.pageviews_7d)}`,
    '',
    todaySection,
    '',
    '**Traffic**',
    `- Requests 7d: ${formatNullableValue(report.traffic?.last_7_days?.requests)}`,
    `- Visits 7d: ${formatNullableValue(report.traffic?.last_7_days?.visits)}`,
    `- Avg daily requests: ${formatNullableValue(report.traffic?.last_7_days?.avg_daily_requests)}`,
    `- Avg daily visits: ${formatNullableValue(report.traffic?.last_7_days?.avg_daily_visits)}`,
    `- Days with data: ${formatNullableValue(report.traffic?.last_7_days?.days_with_data)}`,
    '',
    eventsLines.join('\n'),
    '',
    '**Observability**',
    `- Dropped invalid: ${formatNullableValue(report.health?.dropped_invalid)}`,
    `- Dropped rate limited: ${formatNullableValue(report.health?.dropped_rate_limited)}`,
    '',
    '**Read**',
    ...readLines.map((line) => `- ${line}`),
  ].join('\n');
}

function formatSourceHealthReport(report: SourceHealthLighthouseReport): string {
  const siteLines = report.sites.length > 0
    ? report.sites.map((site) => formatSourceHealthSiteLine(site)).join('\n')
    : '- none';

  return [
    '**Report · Source Health**',
    `- Generated at: ${formatNullableValue(report.generated_at)}`,
    `- Sites: ${report.sites.length}`,
    '',
    '**Telemetry Integrity**',
    siteLines,
  ].join('\n');
}

export function formatLighthouseReport(report: LighthouseReportPayload): string {
  if ('view' in report) {
    if (report.view === 'fleet') {
      return formatFleetReport(report);
    }

    if (report.view === 'site') {
      return formatSiteReport(report);
    }

    return formatSourceHealthReport(report);
  }

  return formatLegacyReport(selectReportWindow(report));
}
