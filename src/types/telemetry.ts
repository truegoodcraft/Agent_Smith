// src/types/telemetry.ts

/**
 * Represents the data for a single reporting window (e.g., "today" or "last_7_days").
 */
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
  last_received_at: string;
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
  last_received_at: string;
}

export interface ReportHumanTraffic {
  today: ReportHumanToday;
  last_7_days: ReportHumanLast7Days;
  observability: ReportHumanObservability;
}

/**
 * The expected structure of the JSON payload from the Lighthouse /report endpoint.
 */
export interface LighthouseReport {
  today: ReportWindow;
  yesterday?: ReportWindow;
  last_7_days?: ReportWindow;
  month_to_date?: ReportWindow;
  traffic?: ReportTraffic;
  human_traffic?: ReportHumanTraffic;
  trends?: unknown;
  // Other fields from the API can be added here but are not used by the /report command.
}

export interface SelectedReport {
  windowLabel: 'today' | '7d';
  selected: ReportWindow;
  today: ReportWindow;
  yesterday?: ReportWindow;
  traffic?: ReportTraffic;
  human_traffic?: ReportHumanTraffic;
}

/**
 * A type guard to validate if an object conforms to the LighthouseReport structure.
 * LENIENT validation: Only requires core fields (today.{update_checks, downloads, errors} and optionally last_7_days with same fields).
 * All other sections are optional and ignored if malformed.
 * Unknown top-level keys are tolerated.
 */
export function isLighthouseReport(data: any): data is LighthouseReport {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // REQUIRED: today with the three core metric fields
  const hasToday = 'today' in data && isCoreReportWindow(data.today);
  if (!hasToday) {
    console.warn('[REPORT_VALIDATION_WARN] Missing or invalid today section with core fields (update_checks, downloads, errors)');
    return false;
  }

  // OPTIONAL: last_7_days, but if present must have the three core metric fields
  const hasOptionalLast7Days = !('last_7_days' in data) || isCoreReportWindow(data.last_7_days);
  if (!hasOptionalLast7Days) {
    console.warn('[REPORT_VALIDATION_WARN] Skipping last_7_days; present but missing core fields (update_checks, downloads, errors)');
  }

  // OPTIONAL: yesterday - only validate if present
  if ('yesterday' in data && !isCoreReportWindow(data.yesterday)) {
    console.warn('[REPORT_VALIDATION_WARN] yesterday present but not a valid ReportWindow; will be skipped');
  }

  // OPTIONAL: month_to_date - only validate if present
  if ('month_to_date' in data && !isCoreReportWindow(data.month_to_date)) {
    console.warn('[REPORT_VALIDATION_WARN] month_to_date present but not a valid ReportWindow; will be skipped');
  }

  // OPTIONAL: traffic - only validate narrowly if present
  if ('traffic' in data && !isReportTrafficNarrow(data.traffic)) {
    console.warn('[REPORT_VALIDATION_WARN] traffic present but does not match expected structure; will be skipped');
  }

  // OPTIONAL: human_traffic - only validate narrowly if present
  if ('human_traffic' in data && !isReportHumanTrafficNarrow(data.human_traffic)) {
    console.warn('[REPORT_VALIDATION_WARN] human_traffic present but does not match expected structure; will be skipped');
  }

  // OPTIONAL: trends - ignored
  // OPTIONAL: observability - ignored
  // OPTIONAL: any unknown top-level keys - ignored

  // Success: We have the required today section with core fields, and optional sections don't fail us
  return hasOptionalLast7Days;
}

/**
 * Core metric fields validator (narrow): checks only for update_checks, downloads, errors.
 * Used for required and core-optional sections.
 */
function isCoreReportWindow(data: any): data is ReportWindow {
  if (!data || typeof data !== 'object') {
    return false;
  }
  return (
    typeof data.update_checks === 'number' &&
    typeof data.downloads === 'number' &&
    typeof data.errors === 'number'
  );
}

/**
 * A type guard to validate if an object conforms to the ReportWindow structure.
 * Checks for all three fields: update_checks, downloads, errors.
 * NOTE: See isCoreReportWindow for the lenient version used in validation.
 */
function isReportWindow(data: any): data is ReportWindow {
    if (!data || typeof data !== 'object') {
        return false;
    }
    return (
        typeof data.update_checks === 'number' &&
        typeof data.downloads === 'number' &&
        typeof data.errors === 'number'
    );
}

/**
 * Narrow validator for the traffic section (optional).
 * Only validates the structure that /report actually uses:
 * latest_day.day, latest_day.captured_at, latest_day.requests, latest_day.visits
 * last_7_days.requests, last_7_days.visits, last_7_days.avg_daily_requests, last_7_days.avg_daily_visits, last_7_days.days_with_data
 * If any of these critical fields are missing or malformed, returns false and traffic will be skipped.
 */
function isReportTrafficNarrow(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check latest_day section minimally
  if ('latest_day' in data) {
    const ld = data.latest_day;
    if (!ld || typeof ld !== 'object') return false;
    // latest_day is used in formatting, check it has expected shape
    if (!('day' in ld && 'visits' in ld && 'requests' in ld && 'captured_at' in ld)) return false;
  }

  // Check last_7_days section minimally
  if ('last_7_days' in data) {
    const l7d = data.last_7_days;
    if (!l7d || typeof l7d !== 'object') return false;
    // last_7_days must have the fields /report uses
    if (!('visits' in l7d && 'requests' in l7d && 'avg_daily_visits' in l7d && 'avg_daily_requests' in l7d && 'days_with_data' in l7d)) {
      return false;
    }
  }

  return true;
}

/**
 * Narrow validator for the human_traffic section (optional).
 * Validates only the fields /report formatting consumes.
 */
function isReportHumanTrafficNarrow(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  if ('today' in data) {
    const today = data.today;
    if (!today || typeof today !== 'object') return false;
    if (typeof today.pageviews !== 'number') return false;
    if (typeof today.last_received_at !== 'string') return false;
  }

  if ('last_7_days' in data) {
    const l7 = data.last_7_days;
    if (!l7 || typeof l7 !== 'object') return false;
    if (typeof l7.pageviews !== 'number') return false;
    if (typeof l7.days_with_data !== 'number') return false;
    if (!Array.isArray(l7.top_paths) || !Array.isArray(l7.top_referrers) || !Array.isArray(l7.top_sources)) {
      return false;
    }
  }

  if ('observability' in data) {
    const o = data.observability;
    if (!o || typeof o !== 'object') return false;
    if (typeof o.accepted !== 'number') return false;
    if (typeof o.dropped_rate_limited !== 'number') return false;
    if (typeof o.dropped_invalid !== 'number') return false;
    if (typeof o.last_received_at !== 'string') return false;
  }

  return true;
}

/**
 * Normalizes an unknown Lighthouse payload into a safe, formatter-ready LighthouseReport.
 * Required core: today.update_checks, today.downloads, today.errors.
 * Optional sections are sanitized: invalid/malformed optional blocks become undefined.
 * Unknown top-level keys are ignored.
 */
export function normalizeLighthouseReport(data: unknown): LighthouseReport | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;

  // REQUIRED CORE: today with the three required metrics.
  if (!isCoreReportWindow(record.today)) {
    return null;
  }

  const normalized: LighthouseReport = {
    today: record.today,
    last_7_days: undefined,
    yesterday: undefined,
    month_to_date: undefined,
    traffic: undefined,
    human_traffic: undefined,
    trends: undefined,
  };

  // OPTIONAL: last_7_days
  if ('last_7_days' in record) {
    if (isCoreReportWindow(record.last_7_days)) {
      normalized.last_7_days = record.last_7_days;
    } else {
      console.warn('[REPORT_VALIDATION_WARN] last_7_days present but invalid; sanitized to undefined');
    }
  }

  // OPTIONAL: yesterday
  if ('yesterday' in record) {
    if (isCoreReportWindow(record.yesterday)) {
      normalized.yesterday = record.yesterday;
    } else {
      console.warn('[REPORT_VALIDATION_WARN] yesterday present but invalid; sanitized to undefined');
    }
  }

  // OPTIONAL: month_to_date
  if ('month_to_date' in record) {
    if (isCoreReportWindow(record.month_to_date)) {
      normalized.month_to_date = record.month_to_date;
    } else {
      console.warn('[REPORT_VALIDATION_WARN] month_to_date present but invalid; sanitized to undefined');
    }
  }

  // OPTIONAL: traffic
  if ('traffic' in record) {
    if (isReportTrafficNarrow(record.traffic)) {
      normalized.traffic = record.traffic as ReportTraffic;
    } else {
      console.warn('[REPORT_VALIDATION_WARN] traffic present but invalid; sanitized to undefined');
    }
  }

  // OPTIONAL: human_traffic
  if ('human_traffic' in record) {
    if (isReportHumanTrafficNarrow(record.human_traffic)) {
      normalized.human_traffic = record.human_traffic as ReportHumanTraffic;
    } else {
      console.warn('[REPORT_VALIDATION_WARN] human_traffic present but invalid; sanitized to undefined');
    }
  }

  // OPTIONAL: trends (opaque, accepted as-is when present)
  if ('trends' in record) {
    normalized.trends = record.trends;
  }

  return normalized;
}
function isNullableNumber(data: unknown): data is number | null {
  return typeof data === 'number' || data === null;
}

function isNullableString(data: unknown): data is string | null {
  return typeof data === 'string' || data === null;
}

function isReportTrafficLatestDay(data: unknown): data is ReportTrafficLatestDay {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const record = data as Record<string, unknown>;
  return (
    isNullableString(record.day) &&
    isNullableNumber(record.visits) &&
    isNullableNumber(record.requests) &&
    isNullableString(record.captured_at)
  );
}

function isReportTrafficLast7Days(data: unknown): data is ReportTrafficLast7Days {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const record = data as Record<string, unknown>;
    return (
      isNullableNumber(record.visits) &&
      isNullableNumber(record.requests) &&
      isNullableNumber(record.avg_daily_visits) &&
      isNullableNumber(record.avg_daily_requests) &&
      isNullableNumber(record.days_with_data)
    );
}

function isReportTraffic(data: unknown): data is ReportTraffic {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const record = data as Record<string, unknown>;
    return (
      isReportTrafficLatestDay(record.latest_day) &&
      isReportTrafficLast7Days(record.last_7_days)
    );
}

function isReportHumanTopPath(data: unknown): data is ReportHumanTopPath {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const record = data as Record<string, unknown>;
    return typeof record.path === 'string' && typeof record.pageviews === 'number';
}

function isReportHumanTopReferrer(data: unknown): data is ReportHumanTopReferrer {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const record = data as Record<string, unknown>;
    return typeof record.referrer_domain === 'string' && typeof record.pageviews === 'number';
}

function isReportHumanTopSource(data: unknown): data is ReportHumanTopSource {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const record = data as Record<string, unknown>;
    return typeof record.source === 'string' && typeof record.pageviews === 'number';
}

function isReportHumanToday(data: unknown): data is ReportHumanToday {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const record = data as Record<string, unknown>;
    return typeof record.pageviews === 'number' && typeof record.last_received_at === 'string';
}

function isReportHumanLast7Days(data: unknown): data is ReportHumanLast7Days {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const record = data as Record<string, unknown>;
    return (
      typeof record.pageviews === 'number' &&
      typeof record.days_with_data === 'number' &&
      Array.isArray(record.top_paths) &&
      record.top_paths.every(isReportHumanTopPath) &&
      Array.isArray(record.top_referrers) &&
      record.top_referrers.every(isReportHumanTopReferrer) &&
      Array.isArray(record.top_sources) &&
      record.top_sources.every(isReportHumanTopSource)
    );
}

function isReportHumanObservability(data: unknown): data is ReportHumanObservability {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const record = data as Record<string, unknown>;
    return (
      typeof record.accepted === 'number' &&
      typeof record.dropped_rate_limited === 'number' &&
      typeof record.dropped_invalid === 'number' &&
      typeof record.last_received_at === 'string'
    );
}

function isReportHumanTraffic(data: unknown): data is ReportHumanTraffic {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const record = data as Record<string, unknown>;
    return (
      isReportHumanToday(record.today) &&
      isReportHumanLast7Days(record.last_7_days) &&
      isReportHumanObservability(record.observability)
    );
}
