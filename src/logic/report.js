// src/logic/report.ts
/**
 * Selects the canonical report window based on fixed rules.
 * Prefers `last_7_days` if present, otherwise falls back to `today`.
 */
export function selectReportWindow(payload) {
    if (payload.last_7_days) {
        return {
            windowLabel: '7d',
            selected: payload.last_7_days,
            today: payload.today,
            yesterday: payload.yesterday,
            traffic: payload.traffic,
            human_traffic: payload.human_traffic,
        };
    }
    return {
        windowLabel: 'today',
        selected: payload.today,
        today: payload.today,
        yesterday: payload.yesterday,
        traffic: payload.traffic,
        human_traffic: payload.human_traffic,
    };
}
/**
 * Generates deterministic read line from selected-window counters.
 */
export function getCoreRead(counters) {
    if (counters.errors > 0) {
        return 'Recent error activity present; investigation recommended.';
    }
    if (counters.downloads > 0 || counters.update_checks > 0) {
        return 'Normal activity present with no recent errors.';
    }
    return 'No core activity recorded in the selected window.';
}
function formatCounters(label, counters) {
    return [
        `**${label}**`,
        `- Update checks: ${counters.update_checks}`,
        `- Downloads: ${counters.downloads}`,
        `- Errors: ${counters.errors}`,
    ].join('\n');
}
export function getTrafficRead(traffic) {
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
    }
    else if (typeof traffic.last_7_days.days_with_data === 'number' &&
        traffic.last_7_days.days_with_data > 0 &&
        typeof traffic.last_7_days.avg_daily_requests === 'number' &&
        traffic.last_7_days.avg_daily_requests > 0) {
        readParts.push('Traffic history is available for recent days.');
    }
    return readParts.join(' ');
}
function formatNullableValue(value) {
    if (value === null) {
        return 'unavailable';
    }
    return String(value);
}
function formatTrafficSection(traffic) {
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
    ].join('\n');
}
export function getHumanTrafficRead(humanTraffic, selected, windowLabel) {
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
    }
    else if (pageviewsInSelectedWindow > 0 && selected.downloads === 0) {
        engagementLine = 'Pageviews present without downloads (low conversion).';
    }
    else if (pageviewsInSelectedWindow > 0 && selected.downloads > 0) {
        engagementLine = 'Pageviews and downloads both present (active engagement).';
    }
    return [humanSignalLine, engagementLine].filter(Boolean).join(' ');
}
/**
 * Formats the final report string to be sent to Discord.
 */
export function formatReport(report) {
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
        const deterministicRead = [
            getCoreRead(report.selected),
            getTrafficRead(report.traffic),
            getHumanTrafficRead(report.human_traffic, report.selected, report.windowLabel),
        ]
            .filter((line) => Boolean(line))
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
            sections.push('', humanTrafficBlock, '', humanObservabilityBlock);
        }
        sections.push('', '**Read**', deterministicRead);
        const formatted = sections.join('\n');
        console.log('[REPORT_FORMAT_OK] Report formatted successfully');
        return formatted;
    }
    catch (e) {
        console.error('[REPORT_FORMAT_FAIL] Exception during formatting', e);
        throw e;
    }
}
