export type ReportView = 'legacy' | 'fleet' | 'site' | 'source_health';

export type SiteKey = 'buscore' | 'tgc_site' | 'star_map_generator';

export interface LighthouseReportRequest {
  view: ReportView;
  siteKey?: string;
}

export interface LighthouseErrorPayload {
  ok: false;
  error: 'invalid_view' | 'missing_site_key' | 'invalid_site_key';
}

export interface ReportWindow {
  update_checks: number;
  downloads: number;
  errors: number;
}

export interface ReportTrafficLatestDay {
  day: string | null;
  visits: number | null;
  requests: number | null;
  captured_at: string | null;
}

export interface ReportTrafficLast7Days {
  visits: number | null;
  requests: number | null;
  avg_daily_visits: number | null;
  avg_daily_requests: number | null;
  days_with_data: number | null;
}

export interface ReportTraffic {
  latest_day: ReportTrafficLatestDay;
  last_7_days: ReportTrafficLast7Days;
}

export interface ReportHumanTopPath {
  path: string;
  pageviews: number;
}

export interface ReportHumanTopReferrer {
  referrer_domain: string;
  pageviews: number;
}

export interface ReportHumanTopSource {
  source: string;
  pageviews: number;
}

export interface ReportHumanToday {
  pageviews: number;
  last_received_at: string | null;
}

export interface ReportHumanLast7Days {
  pageviews: number;
  days_with_data: number;
  top_paths: ReportHumanTopPath[];
  top_referrers: ReportHumanTopReferrer[];
  top_sources: ReportHumanTopSource[];
}

export interface ReportHumanObservability {
  accepted: number;
  dropped_rate_limited: number;
  dropped_invalid: number;
  last_received_at: string | null;
}

export interface ReportHumanTraffic {
  today: ReportHumanToday;
  last_7_days: ReportHumanLast7Days;
  observability: ReportHumanObservability;
}

export interface ReportIdentityWindow {
  new_users: number | null;
  returning_users: number | null;
  sessions: number | null;
}

export interface ReportIdentityLast7Days {
  new_users: number | null;
  returning_users: number | null;
  sessions: number | null;
  return_rate: number | null;
}

export interface ReportIdentityTopSource {
  source: string;
  users: number;
}

export interface ReportIdentity {
  today?: ReportIdentityWindow;
  last_7_days?: ReportIdentityLast7Days;
  top_sources_by_returning_users: ReportIdentityTopSource[];
}

export interface LegacyLighthouseReport {
  today: ReportWindow;
  yesterday?: ReportWindow;
  last_7_days?: ReportWindow;
  month_to_date?: ReportWindow;
  traffic?: ReportTraffic;
  human_traffic?: ReportHumanTraffic;
  identity?: ReportIdentity;
  trends?: unknown;
}

export interface FleetReportSite {
  site_key: string;
  label?: string | null;
  backend_source?: string | null;
  cloudflare_traffic_enabled?: boolean | null;
  pageviews_7d?: number | null;
  requests_7d?: number | null;
  visits_7d?: number | null;
  accepted_signal_7d?: number | boolean | null;
  has_recent_signal?: boolean | null;
  last_received_at?: string | null;
}

export interface FleetLighthouseReport {
  view: 'fleet';
  generated_at: string | null;
  sites: FleetReportSite[];
}

export interface SiteReportScope {
  site_key?: string | null;
  label?: string | null;
  backend_source?: string | null;
  cloudflare_traffic_enabled?: boolean | null;
}

export interface SiteReportSummary {
  pageviews_7d?: number | null;
  requests_7d?: number | null;
  visits_7d?: number | null;
}

export interface SiteReportTraffic {
  latest_day?: {
    day?: string | null;
    visits?: number | null;
    requests?: number | null;
    captured_at?: string | null;
  } | null;
  last_7_days?: {
    visits?: number | null;
    requests?: number | null;
    avg_daily_visits?: number | null;
    avg_daily_requests?: number | null;
    days_with_data?: number | null;
  } | null;
}

export interface SiteReportEvents {
  accepted_signal_7d?: number | boolean | null;
  has_recent_signal?: boolean | null;
  last_received_at?: string | null;
}

export interface SiteReportHealth {
  dropped_invalid?: number | null;
  dropped_rate_limited?: number | null;
}

export interface SiteLighthouseReport {
  view: 'site';
  generated_at: string | null;
  scope: SiteReportScope | null;
  summary: SiteReportSummary | null;
  traffic: SiteReportTraffic | null;
  events: SiteReportEvents | null;
  health: SiteReportHealth | null;
}

export interface SourceHealthSite {
  site_key: string;
  label?: string | null;
  accepted_signal_7d?: number | boolean | null;
  has_recent_signal?: boolean | null;
  last_received_at?: string | null;
  dropped_invalid?: number | null;
  dropped_rate_limited?: number | null;
  cloudflare_traffic_enabled?: boolean | null;
}

export interface SourceHealthLighthouseReport {
  view: 'source_health';
  generated_at: string | null;
  sites: SourceHealthSite[];
}

export type LighthouseReportPayload =
  | LegacyLighthouseReport
  | FleetLighthouseReport
  | SiteLighthouseReport
  | SourceHealthLighthouseReport;

export interface SelectedLegacyReport {
  windowLabel: 'today' | '7d';
  selected: ReportWindow;
  today: ReportWindow;
  yesterday?: ReportWindow;
  traffic?: ReportTraffic;
  human_traffic?: ReportHumanTraffic;
  identity?: ReportIdentity;
}

function isRecord(data: unknown): data is Record<string, unknown> {
  return Boolean(data) && typeof data === 'object' && !Array.isArray(data);
}

function isNullableNumber(data: unknown): data is number | null {
  return typeof data === 'number' || data === null;
}

function isNullableString(data: unknown): data is string | null {
  return typeof data === 'string' || data === null;
}

function isCoreReportWindow(data: unknown): data is ReportWindow {
  if (!isRecord(data)) {
    return false;
  }

  return (
    typeof data.update_checks === 'number' &&
    typeof data.downloads === 'number' &&
    typeof data.errors === 'number'
  );
}

function isReportTrafficLatestDay(data: unknown): data is ReportTrafficLatestDay {
  if (!isRecord(data)) {
    return false;
  }

  return (
    isNullableString(data.day) &&
    isNullableNumber(data.visits) &&
    isNullableNumber(data.requests) &&
    isNullableString(data.captured_at)
  );
}

function isReportTrafficLast7Days(data: unknown): data is ReportTrafficLast7Days {
  if (!isRecord(data)) {
    return false;
  }

  return (
    isNullableNumber(data.visits) &&
    isNullableNumber(data.requests) &&
    isNullableNumber(data.avg_daily_visits) &&
    isNullableNumber(data.avg_daily_requests) &&
    isNullableNumber(data.days_with_data)
  );
}

function isReportTraffic(data: unknown): data is ReportTraffic {
  if (!isRecord(data)) {
    return false;
  }

  return (
    isReportTrafficLatestDay(data.latest_day) &&
    isReportTrafficLast7Days(data.last_7_days)
  );
}

function isReportHumanTopPath(data: unknown): data is ReportHumanTopPath {
  return isRecord(data) && typeof data.path === 'string' && typeof data.pageviews === 'number';
}

function isReportHumanTopReferrer(data: unknown): data is ReportHumanTopReferrer {
  return isRecord(data) && typeof data.referrer_domain === 'string' && typeof data.pageviews === 'number';
}

function isReportHumanTopSource(data: unknown): data is ReportHumanTopSource {
  return isRecord(data) && typeof data.source === 'string' && typeof data.pageviews === 'number';
}

function isReportHumanToday(data: unknown): data is ReportHumanToday {
  if (!isRecord(data)) {
    return false;
  }

  return typeof data.pageviews === 'number' && isNullableString(data.last_received_at);
}

function isReportHumanLast7Days(data: unknown): data is ReportHumanLast7Days {
  if (!isRecord(data)) {
    return false;
  }

  return (
    typeof data.pageviews === 'number' &&
    typeof data.days_with_data === 'number' &&
    Array.isArray(data.top_paths) &&
    data.top_paths.every(isReportHumanTopPath) &&
    Array.isArray(data.top_referrers) &&
    data.top_referrers.every(isReportHumanTopReferrer) &&
    Array.isArray(data.top_sources) &&
    data.top_sources.every(isReportHumanTopSource)
  );
}

function isReportHumanObservability(data: unknown): data is ReportHumanObservability {
  if (!isRecord(data)) {
    return false;
  }

  return (
    typeof data.accepted === 'number' &&
    typeof data.dropped_rate_limited === 'number' &&
    typeof data.dropped_invalid === 'number' &&
    isNullableString(data.last_received_at)
  );
}

function isReportHumanTraffic(data: unknown): data is ReportHumanTraffic {
  if (!isRecord(data)) {
    return false;
  }

  return (
    isReportHumanToday(data.today) &&
    isReportHumanLast7Days(data.last_7_days) &&
    isReportHumanObservability(data.observability)
  );
}

function isNullableNumberBoolean(data: unknown): data is number | boolean | null {
  return typeof data === 'number' || typeof data === 'boolean' || data === null;
}

function normalizeIdentityWindow(data: unknown): ReportIdentityWindow | undefined {
  if (!isRecord(data)) {
    return undefined;
  }

  return {
    new_users: typeof data.new_users === 'number' ? data.new_users : null,
    returning_users: typeof data.returning_users === 'number' ? data.returning_users : null,
    sessions: typeof data.sessions === 'number' ? data.sessions : null,
  };
}

function normalizeIdentityLast7Days(data: unknown): ReportIdentityLast7Days | undefined {
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

function normalizeIdentityTopSources(data: unknown): ReportIdentityTopSource[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .filter((entry) => typeof entry.source === 'string' && typeof entry.users === 'number')
    .map((entry) => ({ source: entry.source as string, users: entry.users as number }));
}

function normalizeReportIdentity(data: unknown): ReportIdentity {
  const record = isRecord(data) ? data : {};
  return {
    today: normalizeIdentityWindow(record.today),
    last_7_days: normalizeIdentityLast7Days(record.last_7_days),
    top_sources_by_returning_users: normalizeIdentityTopSources(record.top_sources_by_returning_users),
  };
}

export function normalizeLegacyLighthouseReport(data: unknown): LegacyLighthouseReport | null {
  if (!isRecord(data) || !isCoreReportWindow(data.today)) {
    return null;
  }

  const normalized: LegacyLighthouseReport = {
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
    } else {
      console.warn('[REPORT_VALIDATION_WARN] last_7_days present but invalid; sanitized to undefined');
    }
  }

  if ('yesterday' in data) {
    if (isCoreReportWindow(data.yesterday)) {
      normalized.yesterday = data.yesterday;
    } else {
      console.warn('[REPORT_VALIDATION_WARN] yesterday present but invalid; sanitized to undefined');
    }
  }

  if ('month_to_date' in data) {
    if (isCoreReportWindow(data.month_to_date)) {
      normalized.month_to_date = data.month_to_date;
    } else {
      console.warn('[REPORT_VALIDATION_WARN] month_to_date present but invalid; sanitized to undefined');
    }
  }

  if ('traffic' in data) {
    if (isReportTraffic(data.traffic)) {
      normalized.traffic = data.traffic;
    } else {
      console.warn('[REPORT_VALIDATION_WARN] traffic present but invalid; sanitized to undefined');
    }
  }

  if ('human_traffic' in data) {
    if (isReportHumanTraffic(data.human_traffic)) {
      normalized.human_traffic = data.human_traffic;
    } else {
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

function normalizeFleetSite(data: unknown): FleetReportSite | null {
  if (!isRecord(data) || typeof data.site_key !== 'string') {
    return null;
  }

  return {
    site_key: data.site_key,
    label: isNullableString(data.label) ? data.label : undefined,
    backend_source: isNullableString(data.backend_source) ? data.backend_source : undefined,
    cloudflare_traffic_enabled:
      typeof data.cloudflare_traffic_enabled === 'boolean' || data.cloudflare_traffic_enabled === null
        ? data.cloudflare_traffic_enabled
        : undefined,
    pageviews_7d: isNullableNumber(data.pageviews_7d) ? data.pageviews_7d : undefined,
    requests_7d: isNullableNumber(data.requests_7d) ? data.requests_7d : undefined,
    visits_7d: isNullableNumber(data.visits_7d) ? data.visits_7d : undefined,
    accepted_signal_7d: isNullableNumberBoolean(data.accepted_signal_7d) ? data.accepted_signal_7d : undefined,
    has_recent_signal:
      typeof data.has_recent_signal === 'boolean' || data.has_recent_signal === null
        ? data.has_recent_signal
        : undefined,
    last_received_at: isNullableString(data.last_received_at) ? data.last_received_at : undefined,
  };
}

function normalizeSourceHealthSite(data: unknown): SourceHealthSite | null {
  if (!isRecord(data) || typeof data.site_key !== 'string') {
    return null;
  }

  return {
    site_key: data.site_key,
    label: isNullableString(data.label) ? data.label : undefined,
    accepted_signal_7d: isNullableNumberBoolean(data.accepted_signal_7d) ? data.accepted_signal_7d : undefined,
    has_recent_signal:
      typeof data.has_recent_signal === 'boolean' || data.has_recent_signal === null
        ? data.has_recent_signal
        : undefined,
    last_received_at: isNullableString(data.last_received_at) ? data.last_received_at : undefined,
    dropped_invalid: isNullableNumber(data.dropped_invalid) ? data.dropped_invalid : undefined,
    dropped_rate_limited: isNullableNumber(data.dropped_rate_limited) ? data.dropped_rate_limited : undefined,
    cloudflare_traffic_enabled:
      typeof data.cloudflare_traffic_enabled === 'boolean' || data.cloudflare_traffic_enabled === null
        ? data.cloudflare_traffic_enabled
        : undefined,
  };
}

function normalizeSiteReportScope(data: unknown): SiteReportScope | null {
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
    cloudflare_traffic_enabled:
      typeof data.cloudflare_traffic_enabled === 'boolean' || data.cloudflare_traffic_enabled === null
        ? data.cloudflare_traffic_enabled
        : undefined,
  };
}

function normalizeSiteReportSummary(data: unknown): SiteReportSummary | null {
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

function normalizeSiteReportTraffic(data: unknown): SiteReportTraffic | null {
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

function normalizeSiteReportEvents(data: unknown): SiteReportEvents | null {
  if (data === null) {
    return null;
  }
  if (!isRecord(data)) {
    return null;
  }

  return {
    accepted_signal_7d: isNullableNumberBoolean(data.accepted_signal_7d) ? data.accepted_signal_7d : undefined,
    has_recent_signal:
      typeof data.has_recent_signal === 'boolean' || data.has_recent_signal === null
        ? data.has_recent_signal
        : undefined,
    last_received_at: isNullableString(data.last_received_at) ? data.last_received_at : undefined,
  };
}

function normalizeSiteReportHealth(data: unknown): SiteReportHealth | null {
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

export function normalizeFleetLighthouseReport(data: unknown): FleetLighthouseReport | null {
  if (!isRecord(data) || data.view !== 'fleet' || !Array.isArray(data.sites)) {
    return null;
  }

  const sites = data.sites
    .map((site) => normalizeFleetSite(site))
    .filter((site): site is FleetReportSite => site !== null);

  return {
    view: 'fleet',
    generated_at: isNullableString(data.generated_at) ? data.generated_at : null,
    sites,
  };
}

export function normalizeSiteLighthouseReport(data: unknown): SiteLighthouseReport | null {
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

export function normalizeSourceHealthLighthouseReport(data: unknown): SourceHealthLighthouseReport | null {
  if (!isRecord(data) || data.view !== 'source_health' || !Array.isArray(data.sites)) {
    return null;
  }

  const sites = data.sites
    .map((site) => normalizeSourceHealthSite(site))
    .filter((site): site is SourceHealthSite => site !== null);

  return {
    view: 'source_health',
    generated_at: isNullableString(data.generated_at) ? data.generated_at : null,
    sites,
  };
}

export function isLighthouseErrorPayload(data: unknown): data is LighthouseErrorPayload {
  if (!isRecord(data)) {
    return false;
  }

  return (
    data.ok === false &&
    (data.error === 'invalid_view' ||
      data.error === 'missing_site_key' ||
      data.error === 'invalid_site_key')
  );
}

export function normalizeLighthousePayload(
  data: unknown,
  request: LighthouseReportRequest,
): LighthouseReportPayload | null {
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

export function isLighthouseReport(data: unknown): data is LegacyLighthouseReport {
  return normalizeLegacyLighthouseReport(data) !== null;
}

export function normalizeLighthouseReport(data: unknown): LegacyLighthouseReport | null {
  return normalizeLegacyLighthouseReport(data);
}
