export function selectReportWindow(payload) {
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
function getSupportClass(siteKey) {
    if (siteKey === 'buscore') {
        return 'legacy_hybrid';
    }
    if (siteKey === 'star_map_generator' || siteKey === 'tgc_site') {
        return 'event_only';
    }
    return undefined;
}
function getSiteTrafficEnabled(report) {
    const candidates = [
        report.traffic?.cloudflare_traffic_enabled,
        report.scope?.cloudflare_traffic_enabled,
        report.health?.cloudflare_traffic_enabled,
    ];
    return candidates.find((value) => typeof value === 'boolean');
}
function hasEventAttribution(report) {
    return Boolean((typeof report.summary?.pageviews_7d === 'number' && report.summary.pageviews_7d > 0) ||
        (typeof report.events?.unique_paths === 'number' && report.events.unique_paths > 0) ||
        (report.events?.top_sources?.length ?? 0) > 0 ||
        (report.events?.top_campaigns?.length ?? 0) > 0 ||
        (report.events?.top_referrers?.length ?? 0) > 0 ||
        (report.events?.by_event_name !== null &&
            report.events?.by_event_name !== undefined &&
            Object.keys(report.events.by_event_name).length > 0));
}
export function getCoreRead(counters) {
    if (counters.errors > 0) {
        return 'Recent error activity present; investigation recommended.';
    }
    if (counters.downloads > 0 || counters.update_checks > 0) {
        return 'Normal activity present with no recent errors.';
    }
    return 'No core activity recorded in the selected window.';
}
export function getTrafficRead(traffic) {
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
    }
    else if (typeof traffic.last_7_days.days_with_data === 'number' &&
        traffic.last_7_days.days_with_data > 0 &&
        typeof traffic.last_7_days.avg_daily_requests === 'number' &&
        traffic.last_7_days.avg_daily_requests > 0) {
        readParts.push('Traffic history is available for recent days.');
    }
    return readParts.join(' ');
}
function formatCounters(label, counters) {
    return [
        `**${label}**`,
        `- Update checks: ${counters.update_checks}`,
        `- Downloads: ${counters.downloads}`,
        `- Errors: ${counters.errors}`,
    ].join('\n');
}
function formatNullableValue(value) {
    if (value === undefined || value === null) {
        return 'unavailable';
    }
    return String(value);
}
function formatNullableNumber(value) {
    if (typeof value !== 'number') {
        return 'unavailable';
    }
    return String(value);
}
function formatReturnRate(value) {
    if (typeof value !== 'number') {
        return 'unavailable';
    }
    const percentage = value <= 1 ? value * 100 : value;
    return `${percentage.toFixed(1)}%`;
}
function formatTrafficSection(traffic) {
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
function formatTopList(heading, entries) {
    if (entries.length === 0) {
        return '';
    }
    return [heading, ...entries.map((entry) => `- ${entry}`)].join('\n');
}
function formatHumanTrafficSection(humanTraffic) {
    const topPathsBlock = formatTopList('Top Paths:', humanTraffic.last_7_days.top_paths.map((entry) => `${entry.path} (${entry.pageviews})`));
    const topReferrersBlock = formatTopList('Top Referrers:', humanTraffic.last_7_days.top_referrers.map((entry) => `${entry.referrer_domain} (${entry.pageviews})`));
    const topSourcesBlock = formatTopList('Top Sources:', humanTraffic.last_7_days.top_sources.map((entry) => `${entry.source} (${entry.pageviews})`));
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
function formatHumanObservabilitySection(humanTraffic) {
    return [
        '**Observability**',
        `- Accepted: ${humanTraffic.observability.accepted}`,
        `- Dropped (rate limited): ${humanTraffic.observability.dropped_rate_limited}`,
        `- Dropped (invalid): ${humanTraffic.observability.dropped_invalid}`,
        `- Last received: ${formatNullableValue(humanTraffic.observability.last_received_at)}`,
    ].join('\n');
}
function formatIdentitySection(identity) {
    const topReturningSources = identity.top_sources_by_returning_users.length > 0
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
function isTinyIdentitySignal(identity) {
    const todayReturning = identity.today?.returning_users;
    const sevenDayReturning = identity.last_7_days?.returning_users;
    const todayNewUsers = identity.today?.new_users;
    const sevenDayNewUsers = identity.last_7_days?.new_users;
    const knownValues = [todayReturning, sevenDayReturning, todayNewUsers, sevenDayNewUsers].filter((value) => typeof value === 'number');
    return knownValues.length > 0 && Math.max(...knownValues) <= 2;
}
function getIdentityReadLines(identity) {
    if (!identity) {
        return [];
    }
    const lines = [];
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
    const hasReturningUsersFromCounters = (typeof todayReturning === 'number' && todayReturning > 0) ||
        (typeof sevenDayReturning === 'number' && sevenDayReturning > 0);
    const hasReturningUsers = hasReturningUsersFromCounters || Boolean(returningSourceLeader);
    const hasAcquisitionOrActivity = (typeof todayNewUsers === 'number' && todayNewUsers > 0) ||
        (typeof sevenDayNewUsers === 'number' && sevenDayNewUsers > 0) ||
        (typeof todaySessions === 'number' && todaySessions > 0) ||
        (typeof sevenDaySessions === 'number' && sevenDaySessions > 0);
    if (hasReturningUsers) {
        if (isTinyIdentitySignal(identity)) {
            lines.push('A small but real anonymous return signal is present; repeat engagement is visible, though still too early for strong conclusions.');
        }
        else {
            lines.push('Anonymous return activity detected. Returning visitors are present in the 7-day window.');
        }
    }
    else if (hasKnownReturning && todayReturning === 0 && sevenDayReturning === 0) {
        if (hasAcquisitionOrActivity) {
            lines.push('Acquisition and activity are present, but no anonymous return activity is visible yet.');
        }
        else {
            lines.push('No returning anonymous visitors detected yet.');
        }
    }
    const sevenDayDistinctUsers = typeof sevenDayNewUsers === 'number' && typeof sevenDayReturning === 'number'
        ? sevenDayNewUsers + sevenDayReturning
        : null;
    if (typeof sevenDaySessions === 'number' &&
        typeof sevenDayDistinctUsers === 'number' &&
        sevenDayDistinctUsers > 0 &&
        sevenDaySessions > sevenDayDistinctUsers) {
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
function getHumanTrafficRead(humanTraffic, selected, windowLabel) {
    if (!humanTraffic) {
        return null;
    }
    const pageviewsInSelectedWindow = windowLabel === '7d' ? humanTraffic.last_7_days.pageviews : humanTraffic.today.pageviews;
    const humanSignalLine = humanTraffic.today.pageviews > 0
        ? `Human activity present with ${humanTraffic.today.pageviews} pageviews.`
        : 'Human traffic absent or very low.';
    let engagementLine = '';
    if (selected.downloads > 0 && pageviewsInSelectedWindow === 0) {
        engagementLine = 'Downloads present without pageviews (possible direct/binary access).';
    }
    else if (pageviewsInSelectedWindow > 0 && selected.downloads === 0) {
        engagementLine = 'Pageviews present without downloads (low conversion).';
    }
    else if (pageviewsInSelectedWindow > 0 && selected.downloads > 0) {
        engagementLine = 'Pageviews and downloads both present (active engagement).';
    }
    return [humanSignalLine, engagementLine].filter(Boolean).join(' ');
}
function formatFleetSiteLine(site) {
    const label = site.label || site.site_key;
    const supportClass = getSupportClass(site.site_key);
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
    return summaryLines.filter((line) => Boolean(line)).join('\n');
}
function formatSourceHealthSiteLine(site) {
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
function formatLegacyReport(report) {
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
        .filter((line) => Boolean(line))
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
function formatFleetReport(report) {
    const siteLines = report.sites.length > 0
        ? report.sites.map((site) => formatFleetSiteLine(site)).join('\n\n')
        : '- none';
    const recentSignalCount = report.sites.filter((site) => site.has_recent_signal === true).length;
    const staleSignalCount = report.sites.filter((site) => site.has_recent_signal === false).length;
    const unknownSignalCount = report.sites.filter((site) => typeof site.has_recent_signal !== 'boolean').length;
    const acceptedSignalValues = report.sites
        .map((site) => site.accepted_signal_7d)
        .filter((value) => typeof value === 'number');
    const totalAcceptedSignal = acceptedSignalValues.length > 0
        ? acceptedSignalValues.reduce((sum, value) => sum + value, 0)
        : null;
    const readLines = [];
    if (report.sites.length === 0) {
        readLines.push('No tracked sites were returned by Lighthouse.');
    }
    else {
        readLines.push(`${report.sites.length} tracked sites reported for the 7-day window.`);
        if (staleSignalCount > 0) {
            readLines.push(`${staleSignalCount} site(s) have stale signal state and may require telemetry checks.`);
        }
        if (typeof totalAcceptedSignal === 'number') {
            if (totalAcceptedSignal > 0) {
                readLines.push(`Accepted signal volume is active across the fleet (${totalAcceptedSignal} in 7d).`);
            }
            else {
                readLines.push('Accepted signal count is zero across reported sites in 7d.');
            }
        }
        else {
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
function formatSiteEventsTopList(heading, items) {
    if (!items || items.length === 0) {
        return '';
    }
    const entries = items.map((entry) => `${entry.name} (${entry.count})`);
    return [heading, ...entries.map((entry) => `  - ${entry}`)].join('\n');
}
function formatSiteEventsByName(byEventName) {
    if (!byEventName || Object.keys(byEventName).length === 0) {
        return '';
    }
    const entries = Object.entries(byEventName)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => `${name} (${count})`);
    return ['By Event Name:', ...entries.map((entry) => `  - ${entry}`)].join('\n');
}
function formatSiteTopPaths(topPaths) {
    if (!topPaths || topPaths.length === 0) {
        return '';
    }
    const entries = topPaths.map((entry) => {
        const count = typeof entry.pageviews === 'number'
            ? entry.pageviews
            : typeof entry.count === 'number'
                ? entry.count
                : undefined;
        return `${entry.path} (${formatNullableValue(count)})`;
    });
    return ['Top Paths:', ...entries.map((entry) => `  - ${entry}`)].join('\n');
}
function formatSiteReport(report) {
    const siteLabel = report.scope?.label || report.scope?.site_key || 'Site';
    const supportClass = getSupportClass(report.scope?.site_key);
    const isEventOnlySite = supportClass === 'event_only';
    const trafficEnabled = getSiteTrafficEnabled(report);
    const requests7d = report.summary?.requests_7d;
    const visits7d = report.summary?.visits_7d;
    const pageviews7d = report.summary?.pageviews_7d;
    const acceptedEvents7d = report.summary?.accepted_events_7d ?? report.events?.accepted_signal_7d;
    const droppedInvalid = report.health?.dropped_invalid;
    const droppedRateLimited = report.health?.dropped_rate_limited;
    const lastReceived = report.summary?.last_received_at ?? report.health?.last_received_at ?? report.events?.last_received_at;
    const recentSignal = report.summary?.has_recent_signal ?? report.events?.has_recent_signal;
    const byEventName = report.events?.by_event_name ?? undefined;
    const pageViewFromByName = byEventName && typeof byEventName.page_view === 'number'
        ? byEventName.page_view
        : undefined;
    const pageViewEvents7d = typeof pageviews7d === 'number' ? pageviews7d : pageViewFromByName;
    const eventRecord = report.events;
    const topPaths = Array.isArray(eventRecord?.top_paths)
        ? eventRecord.top_paths.filter((entry) => entry && typeof entry.path === 'string')
        : undefined;
    const trafficUnsupportedByDesign = isEventOnlySite &&
        trafficEnabled !== true &&
        !(typeof requests7d === 'number' && requests7d > 0) &&
        !(typeof visits7d === 'number' && visits7d > 0);
    const today = report.traffic?.latest_day;
    const todayHasData = Boolean(today &&
        (today.day !== undefined ||
            today.captured_at !== undefined ||
            today.requests !== undefined ||
            today.visits !== undefined));
    const todaySection = todayHasData
        ? [
            '**Today**',
            `- Day: ${formatNullableValue(today?.day)}`,
            `- Captured at: ${formatNullableValue(today?.captured_at)}`,
            `- Requests: ${formatNullableValue(today?.requests)}`,
            `- Visits: ${formatNullableValue(today?.visits)}`,
        ].join('\n')
        : [
            '**Today**',
            trafficUnsupportedByDesign
                ? '- Traffic layer is not enabled for this site, so today request/visit fields are unsupported.'
                : '- unavailable',
        ].join('\n');
    const eventsLines = ['**Event Telemetry**'];
    if (report.events) {
        eventsLines.push(`- page_view events 7d: ${formatNullableValue(pageViewEvents7d)}`);
        eventsLines.push(`- Accepted signal 7d: ${formatNullableValue(report.events.accepted_signal_7d)}`);
        eventsLines.push(`- Accepted events 7d: ${formatNullableValue(acceptedEvents7d)}`);
        eventsLines.push(`- Accepted events: ${formatNullableValue(report.events.accepted_events)}`);
        eventsLines.push(`- Unique paths: ${formatNullableValue(report.events.unique_paths)}`);
        eventsLines.push(`- Last signal received: ${formatNullableValue(report.events.last_received_at)}`);
        if (typeof report.events.has_recent_signal === 'boolean') {
            eventsLines.push(`- Signal state: ${report.events.has_recent_signal ? 'recent' : 'stale'}`);
        }
        const topPathsBlock = formatSiteTopPaths(topPaths);
        const topSourcesBlock = formatSiteEventsTopList('Top Sources:', report.events.top_sources);
        const topCampaignsBlock = formatSiteEventsTopList('Top Campaigns:', report.events.top_campaigns);
        const topReferrersBlock = formatSiteEventsTopList('Top Referrers:', report.events.top_referrers);
        const byEventNameBlock = formatSiteEventsByName(report.events.by_event_name);
        const missingAttribution = [];
        if (topPathsBlock) {
            eventsLines.push(topPathsBlock);
        }
        else {
            missingAttribution.push('top paths');
        }
        if (topSourcesBlock) {
            eventsLines.push(topSourcesBlock);
        }
        else {
            missingAttribution.push('top sources');
        }
        if (topCampaignsBlock) {
            eventsLines.push(topCampaignsBlock);
        }
        else {
            missingAttribution.push('top campaigns');
        }
        if (topReferrersBlock) {
            eventsLines.push(topReferrersBlock);
        }
        else {
            missingAttribution.push('top referrers');
        }
        if (missingAttribution.length === 4) {
            eventsLines.push('- Attribution lists were not provided in this Lighthouse payload (top paths/sources/campaigns/referrers).');
        }
        else if (missingAttribution.length > 0) {
            eventsLines.push(`- Missing attribution lists in payload: ${missingAttribution.join(', ')}.`);
        }
        if (byEventNameBlock) {
            eventsLines.push(byEventNameBlock);
        }
        else {
            eventsLines.push('- Event-name breakdown: unavailable');
        }
    }
    else {
        eventsLines.push('- unavailable');
    }
    const healthLines = ['**Observability**'];
    if (report.health) {
        healthLines.push(`- Dropped invalid: ${formatNullableValue(report.health.dropped_invalid)}`);
        healthLines.push(`- Dropped rate limited: ${formatNullableValue(report.health.dropped_rate_limited)}`);
        healthLines.push(`- Last received: ${formatNullableValue(report.health.last_received_at)}`);
        healthLines.push(`- Included events: ${formatNullableValue(report.health.included_events)}`);
        healthLines.push(`- Excluded test mode: ${formatNullableValue(report.health.excluded_test_mode)}`);
        healthLines.push(`- Excluded non-prod host: ${formatNullableValue(report.health.excluded_non_production_host)}`);
        healthLines.push(`- Cloudflare traffic enabled: ${formatNullableValue(report.health.cloudflare_traffic_enabled)}`);
        healthLines.push(`- Production only default: ${formatNullableValue(report.health.production_only_default)}`);
    }
    else {
        healthLines.push('- unavailable');
    }
    const identityBlock = [];
    if (report.identity) {
        identityBlock.push('**Identity**');
        identityBlock.push(`- New users (today): ${formatNullableNumber(report.identity.today?.new_users)}`);
        identityBlock.push(`- Returning users (today): ${formatNullableNumber(report.identity.today?.returning_users)}`);
        identityBlock.push(`- Sessions (today): ${formatNullableNumber(report.identity.today?.sessions)}`);
        identityBlock.push(`- New users (7d): ${formatNullableNumber(report.identity.last_7_days?.new_users)}`);
        identityBlock.push(`- Returning users (7d): ${formatNullableNumber(report.identity.last_7_days?.returning_users)}`);
        identityBlock.push(`- Sessions (7d): ${formatNullableNumber(report.identity.last_7_days?.sessions)}`);
        identityBlock.push(`- Return rate (7d): ${formatReturnRate(report.identity.last_7_days?.return_rate)}`);
        if (report.identity.top_sources_by_returning_users && report.identity.top_sources_by_returning_users.length > 0) {
            identityBlock.push('Top Sources by Returning Users:\n' +
                report.identity.top_sources_by_returning_users
                    .map((entry) => `  - ${entry.source} (${entry.users})`)
                    .join('\n'));
        }
    }
    const readLines = [];
    if (isEventOnlySite) {
        readLines.push('This site is event_only under current Lighthouse support-class rules.');
    }
    else if (supportClass === 'legacy_hybrid') {
        readLines.push('This site is legacy_hybrid under current Lighthouse support-class rules and may legitimately expose richer report sections.');
    }
    if (trafficUnsupportedByDesign) {
        readLines.push('Traffic and identity layers are unsupported by design for this event_only site.');
    }
    else if ((typeof requests7d === 'number' && requests7d > 0) ||
        (typeof visits7d === 'number' && visits7d > 0)) {
        readLines.push('Traffic layer is enabled and reporting request/visit metrics for this site.');
    }
    else if (trafficEnabled === true) {
        readLines.push('Traffic layer is enabled, but current request/visit totals are unavailable or zero.');
    }
    else if ((typeof pageviews7d === 'number' && pageviews7d > 0) ||
        (typeof acceptedEvents7d === 'number' && acceptedEvents7d > 0)) {
        readLines.push('Event telemetry is available even though traffic-layer metrics are not currently present.');
    }
    else {
        readLines.push('Traffic-layer metrics are unavailable in the current Lighthouse payload.');
    }
    if (typeof acceptedEvents7d === 'number') {
        if (acceptedEvents7d > 0) {
            readLines.push(`Event telemetry is active for this site (${acceptedEvents7d} accepted in 7d).`);
        }
        else {
            readLines.push('Event telemetry is present but currently zero in 7d.');
        }
    }
    else if (report.events) {
        readLines.push('Event telemetry is present in the current Lighthouse payload.');
    }
    if (hasEventAttribution(report)) {
        readLines.push('Path/source/referrer attribution is being reported from event telemetry.');
    }
    const positiveBreakdownEntries = byEventName
        ? Object.entries(byEventName).filter(([, count]) => typeof count === 'number' && count > 0)
        : [];
    const nonPageViewBreakdownEntries = positiveBreakdownEntries.filter(([name]) => name !== 'page_view');
    const hasAttributionLists = (report.events?.top_sources?.length ?? 0) > 0 ||
        (report.events?.top_campaigns?.length ?? 0) > 0 ||
        (report.events?.top_referrers?.length ?? 0) > 0 ||
        (topPaths?.length ?? 0) > 0;
    if (isEventOnlySite &&
        typeof pageViewEvents7d === 'number' &&
        pageViewEvents7d > 0 &&
        nonPageViewBreakdownEntries.length === 0 &&
        !hasAttributionLists) {
        readLines.push('Only page_view is currently reported; broader funnel events are not present in this payload.');
    }
    if ((typeof droppedInvalid === 'number' && droppedInvalid > 0) ||
        (typeof droppedRateLimited === 'number' && droppedRateLimited > 0)) {
        readLines.push('Dropped telemetry is present and should be reviewed in observability metrics.');
    }
    if (lastReceived) {
        readLines.push(`Last telemetry received: ${lastReceived}`);
    }
    if (typeof recentSignal === 'boolean') {
        readLines.push(`Signal state is ${recentSignal ? 'recent and healthy.' : 'stale; refresh may be needed.'}`);
    }
    if (!report.identity) {
        if (!isEventOnlySite) {
            readLines.push('Identity-layer telemetry is shown only when Lighthouse provides Layer 4 support for this site.');
        }
    }
    else {
        readLines.push('Identity-layer reporting is available for this site because Lighthouse provides Layer 4 support.');
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
        supportClass ? `- Support class: ${supportClass}` : undefined,
        `- Backend source: ${formatNullableValue(report.scope?.backend_source)}`,
        `- Cloudflare traffic enabled: ${formatNullableValue(report.scope?.cloudflare_traffic_enabled)}`,
        `- Requests 7d: ${formatNullableValue(report.summary?.requests_7d)}`,
        `- Visits 7d: ${formatNullableValue(report.summary?.visits_7d)}`,
        `- page_view events 7d: ${formatNullableValue(report.summary?.pageviews_7d)}`,
        `- Accepted events 7d: ${formatNullableValue(report.summary?.accepted_events_7d)}`,
        `- Last received: ${formatNullableValue(report.summary?.last_received_at)}`,
        report.summary?.has_recent_signal !== undefined
            ? `- Signal state: ${typeof report.summary.has_recent_signal === 'boolean' ? (report.summary.has_recent_signal ? 'recent' : 'stale') : 'unavailable'}`
            : undefined,
        '',
        eventsLines.join('\n'),
        '',
        healthLines.join('\n'),
        ...(!isEventOnlySite || todayHasData ? ['', todaySection] : []),
        ...(!isEventOnlySite ||
            todayHasData ||
            trafficEnabled === true ||
            Boolean(report.traffic) ||
            typeof requests7d === 'number' ||
            typeof visits7d === 'number'
            ? [
                '',
                '**Traffic**',
                trafficUnsupportedByDesign
                    ? '- Traffic and identity layers are unsupported by design for this event_only site.'
                    : trafficEnabled === true
                        ? '- Traffic layer is enabled for this site.'
                        : '- Traffic layer values reflect Lighthouse output when Layer 3 data is available.',
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
        '**Read**',
        ...readLines.map((line) => `- ${line}`),
    ]
        .filter((line) => line !== undefined)
        .join('\n');
}
function formatSourceHealthReport(report) {
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
export function formatLighthouseReport(report) {
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
