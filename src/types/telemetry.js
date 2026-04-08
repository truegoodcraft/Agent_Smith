function isRecord(data) {
    return Boolean(data) && typeof data === 'object' && !Array.isArray(data);
}
function isNullableNumber(data) {
    return typeof data === 'number' || data === null;
}
function isNullableString(data) {
    return typeof data === 'string' || data === null;
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
function isNullableNumberBoolean(data) {
    return typeof data === 'number' || typeof data === 'boolean' || data === null;
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
    return {
        site_key: data.site_key,
        label: isNullableString(data.label) ? data.label : undefined,
        backend_source: isNullableString(data.backend_source) ? data.backend_source : undefined,
        cloudflare_traffic_enabled: typeof data.cloudflare_traffic_enabled === 'boolean' || data.cloudflare_traffic_enabled === null
            ? data.cloudflare_traffic_enabled
            : undefined,
        pageviews_7d: isNullableNumber(data.pageviews_7d) ? data.pageviews_7d : undefined,
        requests_7d: isNullableNumber(data.requests_7d) ? data.requests_7d : undefined,
        visits_7d: isNullableNumber(data.visits_7d) ? data.visits_7d : undefined,
        accepted_signal_7d: isNullableNumberBoolean(data.accepted_signal_7d) ? data.accepted_signal_7d : undefined,
        has_recent_signal: typeof data.has_recent_signal === 'boolean' || data.has_recent_signal === null
            ? data.has_recent_signal
            : undefined,
        last_received_at: isNullableString(data.last_received_at) ? data.last_received_at : undefined,
    };
}
function normalizeSourceHealthSite(data) {
    if (!isRecord(data) || typeof data.site_key !== 'string') {
        return null;
    }
    return {
        site_key: data.site_key,
        label: isNullableString(data.label) ? data.label : undefined,
        accepted_signal_7d: isNullableNumberBoolean(data.accepted_signal_7d) ? data.accepted_signal_7d : undefined,
        has_recent_signal: typeof data.has_recent_signal === 'boolean' || data.has_recent_signal === null
            ? data.has_recent_signal
            : undefined,
        last_received_at: isNullableString(data.last_received_at) ? data.last_received_at : undefined,
        dropped_invalid: isNullableNumber(data.dropped_invalid) ? data.dropped_invalid : undefined,
        dropped_rate_limited: isNullableNumber(data.dropped_rate_limited) ? data.dropped_rate_limited : undefined,
        cloudflare_traffic_enabled: typeof data.cloudflare_traffic_enabled === 'boolean' || data.cloudflare_traffic_enabled === null
            ? data.cloudflare_traffic_enabled
            : undefined,
    };
}
function normalizeSiteReportScope(data) {
    if (data === null) {
        return null;
    }
    if (!isRecord(data)) {
        return null;
    }
    return {
        site_key: isNullableString(data.site_key) ? data.site_key : undefined,
        label: isNullableString(data.label) ? data.label : undefined,
        backend_source: isNullableString(data.backend_source) ? data.backend_source : undefined,
        cloudflare_traffic_enabled: typeof data.cloudflare_traffic_enabled === 'boolean' || data.cloudflare_traffic_enabled === null
            ? data.cloudflare_traffic_enabled
            : undefined,
    };
}
function normalizeSiteReportSummary(data) {
    if (data === null) {
        return null;
    }
    if (!isRecord(data)) {
        return null;
    }
    return {
        pageviews_7d: isNullableNumber(data.pageviews_7d) ? data.pageviews_7d : undefined,
        requests_7d: isNullableNumber(data.requests_7d) ? data.requests_7d : undefined,
        visits_7d: isNullableNumber(data.visits_7d) ? data.visits_7d : undefined,
    };
}
function normalizeSiteReportTraffic(data) {
    if (data === null) {
        return null;
    }
    if (!isRecord(data)) {
        return null;
    }
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
    return {
        accepted_signal_7d: isNullableNumberBoolean(data.accepted_signal_7d) ? data.accepted_signal_7d : undefined,
        has_recent_signal: typeof data.has_recent_signal === 'boolean' || data.has_recent_signal === null
            ? data.has_recent_signal
            : undefined,
        last_received_at: isNullableString(data.last_received_at) ? data.last_received_at : undefined,
    };
}
function normalizeSiteReportHealth(data) {
    if (data === null) {
        return null;
    }
    if (!isRecord(data)) {
        return null;
    }
    return {
        dropped_invalid: isNullableNumber(data.dropped_invalid) ? data.dropped_invalid : undefined,
        dropped_rate_limited: isNullableNumber(data.dropped_rate_limited) ? data.dropped_rate_limited : undefined,
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
