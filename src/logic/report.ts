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

function getFallbackSupportClass(siteKey?: string | null): string | undefined {
  if (siteKey === 'buscore') {
    return 'legacy_hybrid';
  }

  if (siteKey === 'star_map_generator' || siteKey === 'tgc_site') {
    return 'event_only';
  }

  return undefined;
}

function resolveSupportClass(report: SiteLighthouseReport): {
  supportClass: string | undefined;
  usedFallback: boolean;
} {
  if (report.scope?.support_class) {
    return {
      supportClass: report.scope.support_class,
      usedFallback: false,
    };
  }

  return {
    supportClass: getFallbackSupportClass(report.scope?.site_key ?? undefined),
    usedFallback: true,
  };
}

function getSiteTrafficEnabled(report: SiteLighthouseReport): boolean | undefined {
  const candidates = [
    report.traffic?.cloudflare_traffic_enabled,
    report.scope?.cloudflare_traffic_enabled,
    report.health?.cloudflare_traffic_enabled,
  ];

  return candidates.find((value): value is boolean => typeof value === 'boolean');
}

function hasEventAttribution(report: SiteLighthouseReport): boolean {
  return Boolean(
      (report.events?.top_paths?.length ?? 0) > 0 ||
      (report.events?.top_sources?.length ?? 0) > 0 ||
      (report.events?.top_campaigns?.length ?? 0) > 0 ||
      (report.events?.top_referrers?.length ?? 0) > 0 ||
      (report.events?.top_contents?.length ?? 0) > 0,
  );
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
    return 'Traffic layer data not present in this Lighthouse report.';
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

function formatSignalState(value: boolean | null | undefined): string {
  if (typeof value !== 'boolean') {
    return 'unavailable';
  }

  return value ? 'recent' : 'stale';
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
    return ['**Traffic**', 'Traffic layer data not present in this Lighthouse report.'].join('\n');
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
  const supportClass = getFallbackSupportClass(site.site_key);
  const trafficBits = [
    `requests ${formatNullableValue(site.requests_7d)}`,
    `visits ${formatNullableValue(site.visits_7d)}`,
    `page_view ${formatNullableValue(site.pageviews_7d)}`,
  ].join(' · ');

  const summaryLines = [
    `**${label}**`,
    `- Key: ${site.site_key}`,
    supportClass ? `- Support class: ${supportClass}` : undefined,
    `- Backend source: ${formatNullableValue(site.backend_source)}`,
    `- Cloudflare traffic enabled: ${formatNullableValue(site.cloudflare_traffic_enabled)}`,
    `- Traffic 7d: ${trafficBits}`,
    `- Accepted signal 7d: ${formatNullableValue(site.accepted_signal_7d)}`,
    `- Last signal received: ${formatNullableValue(site.last_received_at)}`,
  ];

  if (typeof site.has_recent_signal === 'boolean') {
    summaryLines.push(`- Signal state: ${site.has_recent_signal ? 'recent' : 'stale'}`);
  }

  return summaryLines.filter((line): line is string => Boolean(line)).join('\n');
}

function formatSourceHealthSiteLine(site: SourceHealthSite): string {
  const label = site.label || site.site_key;
  const lines = [
    `- ${label} (${site.site_key})`,
    `  accepted_signal_7d=${formatNullableValue(site.accepted_signal_7d)}`,
    `  last_received=${formatNullableValue(site.last_received_at)}`,
    `  dropped_invalid=${formatNullableValue(site.dropped_invalid)}`,
    `  dropped_rate_limited=${formatNullableValue(site.dropped_rate_limited)}`,
    `  traffic_enabled=${formatNullableValue(site.cloudflare_traffic_enabled)}`,
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
    'This legacy-rich report path is intentionally richer than normalized event_only site views.',
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

function formatSiteEventsTopList(heading: string, items?: Array<{ name: string; count: number }> | null): string {
  if (!items || items.length === 0) {
    return '';
  }

  const entries = items.map((entry) => `${entry.name} (${entry.count})`);
  return [heading, ...entries.map((entry) => `  - ${entry}`)].join('\n');
}

function toEventCountMap(
  byEventName?: Array<{ event_name: string; events: number }> | null,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!byEventName) {
    return map;
  }

  byEventName.forEach((entry) => {
    const prior = map.get(entry.event_name) ?? 0;
    map.set(entry.event_name, prior + entry.events);
  });

  return map;
}

function formatSiteEventsByName(byEventName?: Array<{ event_name: string; events: number }> | null): string {
  if (!byEventName || byEventName.length === 0) {
    return '';
  }

  const entries = [...toEventCountMap(byEventName).entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} (${count})`);

  return ['Event-name breakdown:', ...entries.map((entry) => `  - ${entry}`)].join('\n');
}

function hasMeaningfulSiteTraffic(today?: {
  day?: string | null;
  captured_at?: string | null;
  requests?: number | null;
  visits?: number | null;
} | null): boolean {
  if (!today) {
    return false;
  }

  return [today.day, today.captured_at, today.requests, today.visits].some(
    (value) => value !== undefined && value !== null,
  );
}

function hasMeaningfulTrafficWindow(traffic?: SiteLighthouseReport['traffic']): boolean {
  if (!traffic) {
    return false;
  }

  return [
    traffic.cloudflare_traffic_enabled,
    traffic.last_7_days?.requests,
    traffic.last_7_days?.visits,
    traffic.last_7_days?.avg_daily_requests,
    traffic.last_7_days?.avg_daily_visits,
    traffic.last_7_days?.days_with_data,
  ].some((value) => value !== undefined && value !== null);
}

function formatSiteTopPaths(topPaths?: Array<{ path: string; events?: number | null; pageviews?: number | null; count?: number | null }> | null): string {
  if (!topPaths || topPaths.length === 0) {
    return '';
  }

  const entries = topPaths.map((entry) => {
    const count = typeof entry.events === 'number'
      ? entry.events
      : typeof entry.pageviews === 'number'
      ? entry.pageviews
      : typeof entry.count === 'number'
        ? entry.count
        : undefined;

    return `${entry.path} (${formatNullableValue(count)})`;
  });

  return ['Top Paths:', ...entries.map((entry) => `  - ${entry}`)].join('\n');
}

function formatLegacyHybridReport(
  report: SiteLighthouseReport,
  supportClass: string | undefined,
  usedFallback: boolean,
): string {
  const siteLabel = report.scope?.label || report.scope?.site_key || 'Site';
  const byEventName = report.events?.by_event_name ?? undefined;
  const eventMap = toEventCountMap(byEventName);
  const pageviews7d =
    typeof report.summary?.pageviews_7d === 'number'
      ? report.summary?.pageviews_7d
      : eventMap.get('page_view');
  const acceptedEvents7d = report.summary?.accepted_events_7d ?? report.events?.accepted_signal_7d;
  const productionOnlyScope = report.scope?.production_only ?? report.health?.production_only_default;
  const sectionAvailability = report.scope?.section_availability;
  const diagnostics = [
    '**Diagnostics**',
    `- Last received: ${formatNullableValue(report.summary?.last_received_at ?? report.health?.last_received_at ?? report.events?.last_received_at)}`,
    `- Included events: ${formatNullableValue(report.health?.included_events)}`,
    `- Dropped invalid: ${formatNullableValue(report.health?.dropped_invalid)}`,
    `- Dropped rate limited: ${formatNullableValue(report.health?.dropped_rate_limited)}`,
  ];

  if (productionOnlyScope === true) {
    diagnostics.push('- Report scope is production-only.');
    if (typeof report.health?.excluded_non_production_host === 'number') {
      diagnostics.push(`- Excluded non-production host rows: ${report.health.excluded_non_production_host}`);
    }
  }

  const eventsLines = ['**Event Telemetry**'];
  if (report.events || acceptedEvents7d !== undefined || pageviews7d !== undefined) {
    eventsLines.push(`- Accepted events 7d: ${formatNullableValue(acceptedEvents7d)}`);
    eventsLines.push(`- page_view events 7d: ${formatNullableValue(pageviews7d)}`);
    eventsLines.push(`- Accepted signal 7d: ${formatNullableValue(report.events?.accepted_signal_7d)}`);
    eventsLines.push(`- Accepted events: ${formatNullableValue(report.events?.accepted_events)}`);

    const byEventNameBlock = formatSiteEventsByName(report.events?.by_event_name);

    if (byEventNameBlock) {
      eventsLines.push(byEventNameBlock);
    } else if (report.events && 'by_event_name' in report.events) {
      eventsLines.push('- Event-name breakdown: empty in current scope');
    } else {
      eventsLines.push('- Event-name breakdown: unavailable');
    }

    if (typeof report.events?.unique_paths === 'number') {
      eventsLines.push(`- Unique paths: ${report.events.unique_paths}`);
    }
  } else {
    eventsLines.push('- unavailable');
  }

  const attributionLines = ['**Attribution**'];
  if (report.events) {
    const topPathsBlock = formatSiteTopPaths(report.events.top_paths);
    const topSourcesBlock = formatSiteEventsTopList('Top Sources:', report.events.top_sources);
    const topCampaignsBlock = formatSiteEventsTopList('Top Campaigns:', report.events.top_campaigns);
    const topReferrersBlock = formatSiteEventsTopList('Top Referrers:', report.events.top_referrers);
    const topContentsBlock = formatSiteEventsTopList('Top Contents:', report.events.top_contents);
    const attributionBlocks = [topPathsBlock, topSourcesBlock, topCampaignsBlock, topReferrersBlock, topContentsBlock].filter(
      Boolean,
    );
    const attributionFieldsPresent =
      'top_paths' in report.events ||
      'top_sources' in report.events ||
      'top_campaigns' in report.events ||
      'top_referrers' in report.events ||
      'top_contents' in report.events;

    if (attributionBlocks.length > 0) {
      attributionLines.push(...attributionBlocks);
    } else if (attributionFieldsPresent) {
      if (productionOnlyScope === true) {
        attributionLines.push('- Attribution lists are empty in the current production-only scope.');
        if (typeof report.health?.excluded_non_production_host === 'number' && report.health.excluded_non_production_host > 0) {
          attributionLines.push(`- Non-production host rows were excluded: ${report.health.excluded_non_production_host}.`);
          attributionLines.push('- Useful event rows may exist outside the current production-only filter.');
        }
      } else {
        attributionLines.push('- Attribution lists are empty for the current scope (no matching rows).');
      }
    } else if (sectionAvailability?.attribution === false || sectionAvailability?.events === false) {
      attributionLines.push('- unsupported for this site scope');
    } else {
      attributionLines.push('- unavailable');
    }
  } else {
    attributionLines.push('- unavailable');
  }

  const identityBlock: string[] = [];
  if (report.identity) {
    identityBlock.push('**Identity**');
    identityBlock.push(`- New users (today): ${formatNullableNumber(report.identity.today?.new_users)}`);
    identityBlock.push(`- Returning users (today): ${formatNullableNumber(report.identity.today?.returning_users)}`);
    identityBlock.push(`- Sessions (today): ${formatNullableNumber(report.identity.today?.sessions)}`);
    identityBlock.push(`- New users (7d): ${formatNullableNumber(report.identity.last_7_days?.new_users)}`);
    identityBlock.push(`- Returning users (7d): ${formatNullableNumber(report.identity.last_7_days?.returning_users)}`);
    identityBlock.push(`- Sessions (7d): ${formatNullableNumber(report.identity.last_7_days?.sessions)}`);
    identityBlock.push(`- Return rate (7d): ${formatReturnRate(report.identity.last_7_days?.return_rate)}`);

    if (
      report.identity.top_sources_by_returning_users &&
      report.identity.top_sources_by_returning_users.length > 0
    ) {
      identityBlock.push(
        'Top Sources by Returning Users:\n' +
          report.identity.top_sources_by_returning_users
            .map((entry) => `  - ${entry.source} (${entry.users})`)
            .join('\n'),
      );
    }
  }

  const readLines: string[] = [];
  if (typeof acceptedEvents7d === 'number' && acceptedEvents7d > 0) {
    readLines.push(`Event telemetry is active for this site (${acceptedEvents7d} accepted in 7d).`);
  }
  if (hasEventAttribution(report)) {
    readLines.push('Attribution lists are present for this reporting scope.');
  }
  if (usedFallback) {
    readLines.push('Support class is currently inferred via temporary fallback and should be removed once Lighthouse always sends scope.support_class.');
  }
  if (readLines.length === 0) {
    readLines.push('No meaningful operator signals are available for this site yet.');
  }

  const showTrafficSection =
    report.scope?.section_availability?.traffic === true ||
    hasMeaningfulTrafficWindow(report.traffic) ||
    hasMeaningfulSiteTraffic(report.traffic?.latest_day);

  return [
    `**Report · ${siteLabel} · 7d**`,
    `- Generated at: ${formatNullableValue(report.generated_at)}`,
    '',
    '**Summary**',
    `- Site key: ${formatNullableValue(report.scope?.site_key)}`,
    supportClass ? `- Support class: ${supportClass}` : undefined,
    usedFallback ? '- Support class source: temporary fallback (contract drift bridge)' : undefined,
    productionOnlyScope === true
      ? '- Report scope is production-only.'
      : productionOnlyScope === false
        ? '- Report scope includes non-production hosts.'
        : undefined,
    `- Backend source: ${formatNullableValue(report.scope?.backend_source)}`,
    `- Accepted events 7d: ${formatNullableValue(acceptedEvents7d)}`,
    `- page_view events 7d: ${formatNullableValue(pageviews7d)}`,
    `- Requests 7d: ${formatNullableValue(report.summary?.requests_7d)}`,
    `- Visits 7d: ${formatNullableValue(report.summary?.visits_7d)}`,
    `- Cloudflare traffic enabled: ${formatNullableValue(report.scope?.cloudflare_traffic_enabled)}`,
    `- Last received: ${formatNullableValue(report.summary?.last_received_at ?? report.health?.last_received_at ?? report.events?.last_received_at)}`,
    report.summary?.has_recent_signal !== undefined || report.events?.has_recent_signal !== undefined
      ? `- Signal state: ${formatSignalState(report.summary?.has_recent_signal ?? report.events?.has_recent_signal)}`
      : undefined,
    '',
    eventsLines.join('\n'),
    '',
    attributionLines.join('\n'),
    ...(showTrafficSection
      ? [
          '',
          '**Traffic**',
          `- Cloudflare traffic enabled: ${formatNullableValue(report.traffic?.cloudflare_traffic_enabled)}`,
          `- Requests 7d: ${formatNullableValue(report.traffic?.last_7_days?.requests)}`,
          `- Visits 7d: ${formatNullableValue(report.traffic?.last_7_days?.visits)}`,
          `- Avg daily requests: ${formatNullableValue(report.traffic?.last_7_days?.avg_daily_requests)}`,
          `- Avg daily visits: ${formatNullableValue(report.traffic?.last_7_days?.avg_daily_visits)}`,
          `- Days with data: ${formatNullableValue(report.traffic?.last_7_days?.days_with_data)}`,
        ]
      : []),
    ...(identityBlock.length > 0 ? ['', identityBlock.join('\n')] : []),
    '',
    diagnostics.join('\n'),
    '',
    '**Read**',
    ...readLines.map((line) => `- ${line}`),
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}

const EVENT_ONLY_FUNNEL: Array<{ name: string; label: string }> = [
  { name: 'page_view', label: 'Page views' },
  { name: 'preview_generated', label: 'Previews generated' },
  { name: 'high_res_requested', label: 'High-res requests' },
  { name: 'payment_click', label: 'Payment clicks' },
  { name: 'download_completed', label: 'Downloads completed' },
];

function formatEventOnlyReport(
  report: SiteLighthouseReport,
  supportClass: string | undefined,
  usedFallback: boolean,
): string {
  const siteLabel = report.scope?.label || report.scope?.site_key || 'Site';
  const productionOnlyScope = report.scope?.production_only ?? report.health?.production_only_default;
  const byEventName = report.events?.by_event_name ?? undefined;
  const eventMap = toEventCountMap(byEventName);

  const getEventCount = (eventName: string): number => eventMap.get(eventName) ?? 0;

  const compactLabel = (value: string, maxLength = 42): string => {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 3)}...`;
  };

  const formatAttributionSummary = (title: string, items?: Array<{ name: string; count: number }> | null) => {
    if (!items) {
      return '';
    }
    if (items.length === 0) {
      return `- ${title}: empty in current scope`;
    }

    return `- ${title}: ${items
      .slice(0, 5)
      .map((entry) => `${compactLabel(entry.name)} (${entry.count})`)
      .join(' · ')}`;
  };

  const attributionLines = ['**Attribution Summary**'];
  const sourcesLine = formatAttributionSummary('Top Sources', report.events?.top_sources);
  const campaignsLine = formatAttributionSummary('Top Campaigns', report.events?.top_campaigns);
  const contentsLine = formatAttributionSummary('Top Contents', report.events?.top_contents);
  const pathsLine = report.events?.top_paths
    ? report.events.top_paths.length === 0
      ? '- Top Paths: empty in current scope'
      : `- Top Paths: ${report.events.top_paths
          .slice(0, 5)
          .map((entry) => {
            const count =
              typeof entry.events === 'number'
                ? entry.events
                : typeof entry.count === 'number'
                  ? entry.count
                  : typeof entry.pageviews === 'number'
                    ? entry.pageviews
                    : null;
            return `${compactLabel(entry.path)} (${formatNullableValue(count)})`;
          })
          .join(' · ')}`
    : '';

  [sourcesLine, campaignsLine, contentsLine, pathsLine]
    .filter(Boolean)
    .forEach((line) => attributionLines.push(line));

  if (attributionLines.length === 1) {
    attributionLines.push('- Attribution lists are unavailable in this payload.');
  }

  const actionLines = ['**Action Summary**'];
  EVENT_ONLY_FUNNEL.forEach((eventDef) => {
    actionLines.push(`- ${eventDef.label}: ${getEventCount(eventDef.name)}`);
  });

  const readLines = [
    '- Source rankings and action totals are separate aggregate views.',
    '- This report does not attribute specific actions to specific sources without event-by-source grouping from Lighthouse.',
    `- Funnel activity snapshot: previews ${getEventCount('preview_generated')}, payment clicks ${getEventCount('payment_click')}, downloads ${getEventCount('download_completed')}.`,
  ];

  if (productionOnlyScope === true && (report.events?.top_sources?.length ?? 0) === 0) {
    readLines.push('- Attribution lists are empty in the current production-only scope.');
  }

  const diagnostics = [
    '**Diagnostics**',
    `- Accepted events 7d: ${formatNullableValue(report.summary?.accepted_events_7d ?? report.events?.accepted_signal_7d)}`,
    `- Accepted signal 7d: ${formatNullableValue(report.events?.accepted_signal_7d)}`,
    `- Included events: ${formatNullableValue(report.health?.included_events)}`,
    `- Excluded test mode: ${formatNullableValue(report.health?.excluded_test_mode)}`,
    `- Excluded non-production host: ${formatNullableValue(report.health?.excluded_non_production_host)}`,
    `- Dropped invalid: ${formatNullableValue(report.health?.dropped_invalid)}`,
    `- Dropped rate limited: ${formatNullableValue(report.health?.dropped_rate_limited)}`,
    `- Cloudflare traffic enabled: ${formatNullableValue(report.scope?.cloudflare_traffic_enabled ?? report.health?.cloudflare_traffic_enabled)}`,
    `- Last received: ${formatNullableValue(report.summary?.last_received_at ?? report.health?.last_received_at ?? report.events?.last_received_at)}`,
    supportClass ? `- Support class: ${supportClass}` : '- Support class: unavailable',
  ];

  if (usedFallback) {
    diagnostics.push('- support_class source: temporary fallback (remove after Lighthouse contract compliance is verified)');
  }

  const showTrafficSection = report.scope?.section_availability?.traffic === true;
  const showIdentitySection = report.scope?.section_availability?.identity === true;

  return [
    `**Report · ${siteLabel} · 7d**`,
    `- Generated at: ${formatNullableValue(report.generated_at)}`,
    `- Site key: ${formatNullableValue(report.scope?.site_key)}`,
    productionOnlyScope === true ? '- Scope: production-only' : undefined,
    '',
    attributionLines.join('\n'),
    '',
    actionLines.join('\n'),
    '',
    '**Read**',
    ...readLines,
    ...(showTrafficSection
      ? [
          '',
          '**Traffic**',
          `- Requests 7d: ${formatNullableValue(report.traffic?.last_7_days?.requests)}`,
          `- Visits 7d: ${formatNullableValue(report.traffic?.last_7_days?.visits)}`,
        ]
      : []),
    ...(showIdentitySection && report.identity
      ? [
          '',
          '**Identity**',
          `- New users (7d): ${formatNullableNumber(report.identity.last_7_days?.new_users)}`,
          `- Returning users (7d): ${formatNullableNumber(report.identity.last_7_days?.returning_users)}`,
          `- Sessions (7d): ${formatNullableNumber(report.identity.last_7_days?.sessions)}`,
        ]
      : []),
    '',
    diagnostics.join('\n'),
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}

function formatSiteReport(report: SiteLighthouseReport): string {
  const { supportClass, usedFallback } = resolveSupportClass(report);

  if (supportClass === 'event_only') {
    return formatEventOnlyReport(report, supportClass, usedFallback);
  }

  return formatLegacyHybridReport(report, supportClass, usedFallback);
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
