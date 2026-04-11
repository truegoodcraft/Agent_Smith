function isRecord(data) {
    return Boolean(data) && typeof data === 'object' && !Array.isArray(data);
}
function isNullableNumber(data) {
    return typeof data === 'number' || data === null;
}
function isNullableString(data) {
    return typeof data === 'string' || data === null;
}
function getNullableNumberFromAliases(data, primaryKey, aliasKeys = []) {
    const keys = [primaryKey, ...aliasKeys];
    for (const key of keys) {
        if (!(key in data)) {
            continue;
        }
        const value = data[key];
        if (isNullableNumber(value)) {
            return value;
        }
    }
    return undefined;
}
function getNullableStringFromAliases(data, primaryKey, aliasKeys = []) {
    const keys = [primaryKey, ...aliasKeys];
    for (const key of keys) {
        if (!(key in data)) {
            continue;
        }
        const value = data[key];
        if (isNullableString(value)) {
            return value;
        }
    }
    return undefined;
}
function getNullableBooleanFromAliases(data, primaryKey, aliasKeys = []) {
    const keys = [primaryKey, ...aliasKeys];
    for (const key of keys) {
        if (!(key in data)) {
            continue;
        }
        const value = data[key];
        if (typeof value === 'boolean' || value === null) {
            return value;
        }
    }
    return undefined;
}
function isCoreReportWindow(data) {
    if (!isRecord(data)) {
        return false;
    }
    return (typeof data.update_checks === 'number' &&
        typeof data.downloads === 'number' &&
        typeof data.errors === 'number');
}
function isReportTrafficLatestDay(data) {
    if (!isRecord(data)) {
        return false;
    }
    return (isNullableString(data.day) &&
        isNullableNumber(data.visits) &&
        isNullableNumber(data.requests) &&
        isNullableString(data.captured_at));
}
function isReportTrafficLast7Days(data) {
    if (!isRecord(data)) {
        return false;
    }
    return (isNullableNumber(data.visits) &&
        isNullableNumber(data.requests) &&
        isNullableNumber(data.avg_daily_visits) &&
        isNullableNumber(data.avg_daily_requests) &&
        isNullableNumber(data.days_with_data));
}
function isReportTraffic(data) {
    if (!isRecord(data)) {
        return false;
    }
    return (isReportTrafficLatestDay(data.latest_day) &&
        isReportTrafficLast7Days(data.last_7_days));
}
function isReportHumanTopPath(data) {
    return isRecord(data) && typeof data.path === 'string' && typeof data.pageviews === 'number';
}
function isReportHumanTopReferrer(data) {
    return isRecord(data) && typeof data.referrer_domain === 'string' && typeof data.pageviews === 'number';
}
function isReportHumanTopSource(data) {
    return isRecord(data) && typeof data.source === 'string' && typeof data.pageviews === 'number';
}
function isReportHumanToday(data) {
    if (!isRecord(data)) {
        return false;
    }
    return typeof data.pageviews === 'number' && isNullableString(data.last_received_at);
}
function isReportHumanLast7Days(data) {
    if (!isRecord(data)) {
        return false;
    }
    return (typeof data.pageviews === 'number' &&
        typeof data.days_with_data === 'number' &&
        Array.isArray(data.top_paths) &&
        data.top_paths.every(isReportHumanTopPath) &&
        Array.isArray(data.top_referrers) &&
        data.top_referrers.every(isReportHumanTopReferrer) &&
        Array.isArray(data.top_sources) &&
        data.top_sources.every(isReportHumanTopSource));
}
function isReportHumanObservability(data) {
    if (!isRecord(data)) {
        return false;
    }
    return (typeof data.accepted === 'number' &&
        typeof data.dropped_rate_limited === 'number' &&
        typeof data.dropped_invalid === 'number' &&
        isNullableString(data.last_received_at));
}
function isReportHumanTraffic(data) {
    if (!isRecord(data)) {
        return false;
    }
    return (isReportHumanToday(data.today) &&
        isReportHumanLast7Days(data.last_7_days) &&
        isReportHumanObservability(data.observability));
}
function normalizeIdentityWindow(data) {
    if (!isRecord(data)) {
        return undefined;
    }
    return {
        new_users: typeof data.new_users === 'number' ? data.new_users : null,
        returning_users: typeof data.returning_users === 'number' ? data.returning_users : null,
        sessions: typeof data.sessions === 'number' ? data.sessions : null,
    };
}
function normalizeIdentityLast7Days(data) {
    if (!isRecord(data)) {
        return undefined;
    }
    return {
        new_users: typeof data.new_users === 'number' ? data.new_users : null,
        returning_users: typeof data.returning_users === 'number' ? data.returning_users : null,
        sessions: typeof data.sessions === 'number' ? data.sessions : null,
        return_rate: typeof data.return_rate === 'number' ? data.return_rate : null,
    };
}
function normalizeIdentityTopSources(data) {
    if (!Array.isArray(data)) {
        return [];
    }
    return data
        .filter((entry) => isRecord(entry))
        .filter((entry) => typeof entry.source === 'string' && typeof entry.users === 'number')
        .map((entry) => ({ source: entry.source, users: entry.users }));
}
function normalizeReportIdentity(data) {
    const record = isRecord(data) ? data : {};
    return {
        today: normalizeIdentityWindow(record.today),
        last_7_days: normalizeIdentityLast7Days(record.last_7_days),
        top_sources_by_returning_users: normalizeIdentityTopSources(record.top_sources_by_returning_users),
    };
}
export function normalizeLegacyLighthouseReport(data) {
    if (!isRecord(data) || !isCoreReportWindow(data.today)) {
        return null;
    }
    const normalized = {
        today: data.today,
        last_7_days: undefined,
        yesterday: undefined,
        month_to_date: undefined,
        traffic: undefined,
        human_traffic: undefined,
        identity: undefined,
        trends: undefined,
    };
    if ('last_7_days' in data) {
        if (isCoreReportWindow(data.last_7_days)) {
            normalized.last_7_days = data.last_7_days;
        }
        else {
            console.warn('[REPORT_VALIDATION_WARN] last_7_days present but invalid; sanitized to undefined');
        }
    }
    if ('yesterday' in data) {
        if (isCoreReportWindow(data.yesterday)) {
            normalized.yesterday = data.yesterday;
        }
        else {
            console.warn('[REPORT_VALIDATION_WARN] yesterday present but invalid; sanitized to undefined');
        }
    }
    if ('month_to_date' in data) {
        if (isCoreReportWindow(data.month_to_date)) {
            normalized.month_to_date = data.month_to_date;
        }
        else {
            console.warn('[REPORT_VALIDATION_WARN] month_to_date present but invalid; sanitized to undefined');
        }
    }
    if ('traffic' in data) {
        if (isReportTraffic(data.traffic)) {
            normalized.traffic = data.traffic;
        }
        else {
            console.warn('[REPORT_VALIDATION_WARN] traffic present but invalid; sanitized to undefined');
        }
    }
    if ('human_traffic' in data) {
        if (isReportHumanTraffic(data.human_traffic)) {
            normalized.human_traffic = data.human_traffic;
        }
        else {
            console.warn('[REPORT_VALIDATION_WARN] human_traffic present but invalid; sanitized to undefined');
        }
    }
    if ('identity' in data) {
        normalized.identity = normalizeReportIdentity(data.identity);
    }
    if ('trends' in data) {
        normalized.trends = data.trends;
    }
    return normalized;
}
function normalizeFleetSite(data) {
    if (!isRecord(data) || typeof data.site_key !== 'string') {
        return null;
    }
    const acceptedSignal7d = getNullableNumberFromAliases(data, 'accepted_signal_7d', [
        'accepted_events_7d',
    ]);
    const cloudflareTrafficEnabled = getNullableBooleanFromAliases(data, 'cloudflare_traffic_enabled', [
        'traffic_enabled',
    ]);
    const lastReceivedAt = getNullableStringFromAliases(data, 'last_received_at', ['last_received']);
    return {
        site_key: data.site_key,
        label: isNullableString(data.label) ? data.label : undefined,
        backend_source: isNullableString(data.backend_source) ? data.backend_source : undefined,
        cloudflare_traffic_enabled: cloudflareTrafficEnabled,
        pageviews_7d: isNullableNumber(data.pageviews_7d) ? data.pageviews_7d : undefined,
        requests_7d: isNullableNumber(data.requests_7d) ? data.requests_7d : undefined,
        visits_7d: isNullableNumber(data.visits_7d) ? data.visits_7d : undefined,
        accepted_signal_7d: acceptedSignal7d,
        has_recent_signal: typeof data.has_recent_signal === 'boolean' || data.has_recent_signal === null
            ? data.has_recent_signal
            : undefined,
        last_received_at: lastReceivedAt,
    };
}
function normalizeSourceHealthSite(data) {
    if (!isRecord(data) || typeof data.site_key !== 'string') {
        return null;
    }
    const acceptedSignal7d = getNullableNumberFromAliases(data, 'accepted_signal_7d', [
        'accepted_events_7d',
    ]);
    const cloudflareTrafficEnabled = getNullableBooleanFromAliases(data, 'cloudflare_traffic_enabled', [
        'traffic_enabled',
    ]);
    const lastReceivedAt = getNullableStringFromAliases(data, 'last_received_at', ['last_received']);
    return {
        site_key: data.site_key,
        label: isNullableString(data.label) ? data.label : undefined,
        accepted_signal_7d: acceptedSignal7d,
        has_recent_signal: typeof data.has_recent_signal === 'boolean' || data.has_recent_signal === null
            ? data.has_recent_signal
            : undefined,
        last_received_at: lastReceivedAt,
        dropped_invalid: isNullableNumber(data.dropped_invalid) ? data.dropped_invalid : undefined,
        dropped_rate_limited: isNullableNumber(data.dropped_rate_limited) ? data.dropped_rate_limited : undefined,
        cloudflare_traffic_enabled: cloudflareTrafficEnabled,
    };
}
function normalizeSiteReportScope(data) {
    if (data === null) {
        return null;
    }
    if (!isRecord(data)) {
        return null;
    }
    const cloudflareTrafficEnabled = getNullableBooleanFromAliases(data, 'cloudflare_traffic_enabled', [
        'traffic_enabled',
    ]);
    const sectionAvailability = isRecord(data.section_availability)
        ? Object.fromEntries(Object.entries(data.section_availability)
            .filter(([, value]) => typeof value === 'boolean' || value === null)
            .map(([key, value]) => [key, value]))
        : undefined;
    return {
        site_key: isNullableString(data.site_key) ? data.site_key : undefined,
        label: isNullableString(data.label) ? data.label : undefined,
        backend_source: isNullableString(data.backend_source) ? data.backend_source : undefined,
        cloudflare_traffic_enabled: cloudflareTrafficEnabled,
        production_only: typeof data.production_only === 'boolean' || data.production_only === null
            ? data.production_only
            : undefined,
        section_availability: sectionAvailability && Object.keys(sectionAvailability).length > 0 ? sectionAvailability : undefined,
    };
}
function normalizeSiteReportSummary(data) {
    if (data === null) {
        return null;
    }
    if (!isRecord(data)) {
        return null;
    }
    const acceptedSignal7d = getNullableNumberFromAliases(data, 'accepted_signal_7d', [
        'accepted_events_7d',
    ]);
    const lastReceivedAt = getNullableStringFromAliases(data, 'last_received_at', ['last_received']);
    return {
        pageviews_7d: isNullableNumber(data.pageviews_7d) ? data.pageviews_7d : undefined,
        requests_7d: isNullableNumber(data.requests_7d) ? data.requests_7d : undefined,
        visits_7d: isNullableNumber(data.visits_7d) ? data.visits_7d : undefined,
        accepted_events_7d: acceptedSignal7d,
        last_received_at: lastReceivedAt,
        has_recent_signal: typeof data.has_recent_signal === 'boolean' || data.has_recent_signal === null
            ? data.has_recent_signal
            : undefined,
    };
}
function normalizeSiteReportTraffic(data) {
    if (data === null) {
        return null;
    }
    if (!isRecord(data)) {
        return null;
    }
    const cloudflareTrafficEnabled = getNullableBooleanFromAliases(data, 'cloudflare_traffic_enabled', [
        'traffic_enabled',
    ]);
    const latestDay = isRecord(data.latest_day)
        ? {
            day: isNullableString(data.latest_day.day) ? data.latest_day.day : undefined,
            visits: isNullableNumber(data.latest_day.visits) ? data.latest_day.visits : undefined,
            requests: isNullableNumber(data.latest_day.requests) ? data.latest_day.requests : undefined,
            captured_at: isNullableString(data.latest_day.captured_at)
                ? data.latest_day.captured_at
                : undefined,
        }
        : data.latest_day === null
            ? null
            : undefined;
    const last7Days = isRecord(data.last_7_days)
        ? {
            visits: isNullableNumber(data.last_7_days.visits) ? data.last_7_days.visits : undefined,
            requests: isNullableNumber(data.last_7_days.requests) ? data.last_7_days.requests : undefined,
            avg_daily_visits: isNullableNumber(data.last_7_days.avg_daily_visits)
                ? data.last_7_days.avg_daily_visits
                : undefined,
            avg_daily_requests: isNullableNumber(data.last_7_days.avg_daily_requests)
                ? data.last_7_days.avg_daily_requests
                : undefined,
            days_with_data: isNullableNumber(data.last_7_days.days_with_data)
                ? data.last_7_days.days_with_data
                : undefined,
        }
        : data.last_7_days === null
            ? null
            : undefined;
    return {
        cloudflare_traffic_enabled: cloudflareTrafficEnabled,
        latest_day: latestDay,
        last_7_days: last7Days,
    };
}
function normalizeSiteReportEvents(data) {
    if (data === null) {
        return null;
    }
    if (!isRecord(data)) {
        return null;
    }
    const acceptedSignal7d = getNullableNumberFromAliases(data, 'accepted_signal_7d', [
        'accepted_events_7d',
    ]);
    const lastReceivedAt = getNullableStringFromAliases(data, 'last_received_at', ['last_received']);
    const byEventName = isRecord(data.by_event_name)
        ? Object.fromEntries(Object.entries(data.by_event_name).filter(([, value]) => typeof value === 'number'))
        : undefined;
    const normalizeTopPaths = (items) => {
        if (!Array.isArray(items)) {
            return undefined;
        }
        const normalized = items
            .filter((item) => isRecord(item))
            .filter((item) => typeof item.path === 'string')
            .map((item) => ({
            path: item.path,
            pageviews: isNullableNumber(item.pageviews) ? item.pageviews : undefined,
            count: isNullableNumber(item.count) ? item.count : undefined,
        }));
        return normalized;
    };
    const normalizeEventTopItems = (items, labelKeys = ['name']) => {
        if (!Array.isArray(items)) {
            return undefined;
        }
        const normalized = items
            .filter((item) => isRecord(item))
            .map((item) => {
            const label = labelKeys
                .map((key) => item[key])
                .find((value) => typeof value === 'string');
            const count = typeof item.count === 'number'
                ? item.count
                : typeof item.pageviews === 'number'
                    ? item.pageviews
                    : undefined;
            if (!label || typeof count !== 'number') {
                return null;
            }
            return { name: label, count };
        })
            .filter((item) => item !== null);
        return normalized;
    };
    const normalizedTopPaths = normalizeTopPaths(data.top_paths);
    const normalizedTopSources = normalizeEventTopItems(data.top_sources, ['name', 'source']);
    const normalizedTopCampaigns = normalizeEventTopItems(data.top_campaigns, ['name', 'campaign']);
    const normalizedTopReferrers = normalizeEventTopItems(data.top_referrers, ['name', 'referrer_domain']);
    const normalizedTopContents = normalizeEventTopItems(data.top_contents, ['name', 'content']);
    const result = {};
    if (acceptedSignal7d !== undefined) {
        result.accepted_signal_7d = acceptedSignal7d;
    }
    if (isNullableNumber(data.accepted_events)) {
        result.accepted_events = data.accepted_events;
    }
    if (typeof data.has_recent_signal === 'boolean' || data.has_recent_signal === null) {
        result.has_recent_signal = data.has_recent_signal;
    }
    if (lastReceivedAt !== undefined) {
        result.last_received_at = lastReceivedAt;
    }
    if (isNullableNumber(data.unique_paths)) {
        result.unique_paths = data.unique_paths;
    }
    if (Array.isArray(data.top_paths)) {
        result.top_paths = normalizedTopPaths ?? [];
    }
    if (isRecord(data.by_event_name)) {
        result.by_event_name = byEventName ?? {};
    }
    if (Array.isArray(data.top_sources)) {
        result.top_sources = normalizedTopSources ?? [];
    }
    if (Array.isArray(data.top_campaigns)) {
        result.top_campaigns = normalizedTopCampaigns ?? [];
    }
    if (Array.isArray(data.top_referrers)) {
        result.top_referrers = normalizedTopReferrers ?? [];
    }
    if (Array.isArray(data.top_contents)) {
        result.top_contents = normalizedTopContents ?? [];
    }
    return result;
}
function normalizeSiteReportHealth(data) {
    if (data === null) {
        return null;
    }
    if (!isRecord(data)) {
        return null;
    }
    const cloudflareTrafficEnabled = getNullableBooleanFromAliases(data, 'cloudflare_traffic_enabled', [
        'traffic_enabled',
    ]);
    const lastReceivedAt = getNullableStringFromAliases(data, 'last_received_at', ['last_received']);
    return {
        dropped_invalid: isNullableNumber(data.dropped_invalid) ? data.dropped_invalid : undefined,
        dropped_rate_limited: isNullableNumber(data.dropped_rate_limited) ? data.dropped_rate_limited : undefined,
        last_received_at: lastReceivedAt,
        included_events: isNullableNumber(data.included_events) ? data.included_events : undefined,
        excluded_test_mode: isNullableNumber(data.excluded_test_mode) ? data.excluded_test_mode : undefined,
        excluded_non_production_host: isNullableNumber(data.excluded_non_production_host)
            ? data.excluded_non_production_host
            : undefined,
        cloudflare_traffic_enabled: cloudflareTrafficEnabled,
        production_only_default: typeof data.production_only_default === 'boolean' || data.production_only_default === null
            ? data.production_only_default
            : undefined,
    };
}
function normalizeSiteReportIdentity(data) {
    if (data === null || data === undefined) {
        return undefined;
    }
    if (!isRecord(data)) {
        return undefined;
    }
    const normalizeWindow = (window) => {
        if (!isRecord(window)) {
            return undefined;
        }
        return {
            new_users: typeof window.new_users === 'number' || window.new_users === null ? window.new_users : undefined,
            returning_users: typeof window.returning_users === 'number' || window.returning_users === null ? window.returning_users : undefined,
            sessions: typeof window.sessions === 'number' || window.sessions === null ? window.sessions : undefined,
        };
    };
    const normalizeLast7Days = (window) => {
        if (!isRecord(window)) {
            return undefined;
        }
        return {
            new_users: typeof window.new_users === 'number' || window.new_users === null ? window.new_users : undefined,
            returning_users: typeof window.returning_users === 'number' || window.returning_users === null ? window.returning_users : undefined,
            sessions: typeof window.sessions === 'number' || window.sessions === null ? window.sessions : undefined,
            return_rate: typeof window.return_rate === 'number' || window.return_rate === null ? window.return_rate : undefined,
        };
    };
    const normalizeTopSources = (sources) => {
        if (!Array.isArray(sources)) {
            return undefined;
        }
        const normalized = sources
            .filter((entry) => isRecord(entry))
            .filter((entry) => typeof entry.source === 'string' && typeof entry.users === 'number')
            .map((entry) => ({ source: entry.source, users: entry.users }));
        return normalized.length > 0 ? normalized : undefined;
    };
    return {
        today: normalizeWindow(data.today),
        last_7_days: normalizeLast7Days(data.last_7_days),
        top_sources_by_returning_users: normalizeTopSources(data.top_sources_by_returning_users),
    };
}
export function normalizeFleetLighthouseReport(data) {
    if (!isRecord(data) || data.view !== 'fleet' || !Array.isArray(data.sites)) {
        return null;
    }
    const sites = data.sites
        .map((site) => normalizeFleetSite(site))
        .filter((site) => site !== null);
    return {
        view: 'fleet',
        generated_at: isNullableString(data.generated_at) ? data.generated_at : null,
        sites,
    };
}
export function normalizeSiteLighthouseReport(data) {
    if (!isRecord(data) || data.view !== 'site') {
        return null;
    }
    return {
        view: 'site',
        generated_at: isNullableString(data.generated_at) ? data.generated_at : null,
        scope: normalizeSiteReportScope(data.scope),
        summary: normalizeSiteReportSummary(data.summary),
        traffic: normalizeSiteReportTraffic(data.traffic),
        events: normalizeSiteReportEvents(data.events),
        health: normalizeSiteReportHealth(data.health),
        identity: normalizeSiteReportIdentity(data.identity),
    };
}
export function normalizeSourceHealthLighthouseReport(data) {
    if (!isRecord(data) || data.view !== 'source_health' || !Array.isArray(data.sites)) {
        return null;
    }
    const sites = data.sites
        .map((site) => normalizeSourceHealthSite(site))
        .filter((site) => site !== null);
    return {
        view: 'source_health',
        generated_at: isNullableString(data.generated_at) ? data.generated_at : null,
        sites,
    };
}
export function isLighthouseErrorPayload(data) {
    if (!isRecord(data)) {
        return false;
    }
    return (data.ok === false &&
        (data.error === 'invalid_view' ||
            data.error === 'missing_site_key' ||
            data.error === 'invalid_site_key'));
}
export function normalizeLighthousePayload(data, request) {
    if (request.view === 'legacy') {
        return normalizeLegacyLighthouseReport(data);
    }
    if (request.view === 'fleet') {
        return normalizeFleetLighthouseReport(data);
    }
    if (request.view === 'site') {
        return normalizeSiteLighthouseReport(data);
    }
    return normalizeSourceHealthLighthouseReport(data);
}
export function isLighthouseReport(data) {
    return normalizeLegacyLighthouseReport(data) !== null;
}
export function normalizeLighthouseReport(data) {
    return normalizeLegacyLighthouseReport(data);
}
