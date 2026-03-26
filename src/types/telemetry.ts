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
 * Validates the structure minimally: today.pageviews, last_7_days.pageviews, observability.accepted.
 * If any of these critical fields are missing or malformed, returns false and human_traffic will be skipped.
 */
function isReportHumanTrafficNarrow(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check today minimally
  if ('today' in data) {
    const today = data.today;
    if (!today || typeof today !== 'object') return false;
    if (typeof today.pageviews !== 'number') return false;
  }

  // Check last_7_days minimally
  if ('last_7_days' in data) {
    const l7d = data.last_7_days;
    if (!l7d || typeof l7d !== 'object') return false;
    if (typeof l7d.pageviews !== 'number' || typeof l7d.days_with_data !== 'number') return false;
    if (!Array.isArray(l7d.top_paths) || !Array.isArray(l7d.top_referrers) || !Array.isArray(l7d.top_sources)) return false;
  }

  // Check observability minimally
  if ('observability' in data) {
    const obs = data.observability;
    if (!obs || typeof obs !== 'object') return false;
    if (typeof obs.accepted !== 'number' || typeof obs.dropped_rate_limited !== 'number' || typeof obs.dropped_invalid !== 'number') {
      return false;
    }
  }

  return true;
}

function isNullableNumber(data: unknown): data is number | null {
  return typeof data === 'number' || data === null;
}

function isNullableString(data: unknown): data is string | null {
  return typeof data === 'string' || data === null;
}

function isReportTrafficLatestDay(data: any): data is ReportTrafficLatestDay {
  if (!data || typeof data !== 'object') {
    return false;
  }

  return (
    'day' in data &&
    isNullableString(data.day) &&
    'visits' in data &&
    isNullableNumber(data.visits) &&
    'requests' in data &&
    isNullableNumber(data.requests) &&
    'captured_at' in data &&
    isNullableString(data.captured_at)
  );
}

function isReportTrafficLast7Days(data: any): data is ReportTrafficLast7Days {
  if (!data || typeof data !== 'object') {
    return false;
  }

  return (
    'visits' in data &&
    isNullableNumber(data.visits) &&
    'requests' in data &&
    isNullableNumber(data.requests) &&
    'avg_daily_visits' in data &&
    isNullableNumber(data.avg_daily_visits) &&
    'avg_daily_requests' in data &&
    isNullableNumber(data.avg_daily_requests) &&
    'days_with_data' in data &&
    isNullableNumber(data.days_with_data)
  );
}

function isReportTraffic(data: any): data is ReportTraffic {
  if (!data || typeof data !== 'object') {
    return false;
  }

  return (
    'latest_day' in data &&
    isReportTrafficLatestDay(data.latest_day) &&
    'last_7_days' in data &&
    isReportTrafficLast7Days(data.last_7_days)
  );
}

function isReportHumanTopPath(data: any): data is ReportHumanTopPath {
  if (!data || typeof data !== 'object') {
    return false;
  }

  return typeof data.path === 'string' && typeof data.pageviews === 'number';
}

function isReportHumanTopReferrer(data: any): data is ReportHumanTopReferrer {
  if (!data || typeof data !== 'object') {
    return false;
  }

  return typeof data.referrer_domain === 'string' && typeof data.pageviews === 'number';
}

function isReportHumanTopSource(data: any): data is ReportHumanTopSource {
  if (!data || typeof data !== 'object') {
    return false;
  }

  return typeof data.source === 'string' && typeof data.pageviews === 'number';
}

function isReportHumanToday(data: any): data is ReportHumanToday {
  if (!data || typeof data !== 'object') {
    return false;
  }

  return typeof data.pageviews === 'number' && typeof data.last_received_at === 'string';
}

function isReportHumanLast7Days(data: any): data is ReportHumanLast7Days {
  if (!data || typeof data !== 'object') {
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

function isReportHumanObservability(data: any): data is ReportHumanObservability {
  if (!data || typeof data !== 'object') {
    return false;
  }

  return (
    typeof data.accepted === 'number' &&
    typeof data.dropped_rate_limited === 'number' &&
    typeof data.dropped_invalid === 'number' &&
    typeof data.last_received_at === 'string'
  );
}

function isReportHumanTraffic(data: any): data is ReportHumanTraffic {
  if (!data || typeof data !== 'object') {
    return false;
  }

  return (
    'today' in data &&
    isReportHumanToday(data.today) &&
    'last_7_days' in data &&
    isReportHumanLast7Days(data.last_7_days) &&
    'observability' in data &&
    isReportHumanObservability(data.observability)
  );
}

/**
 * The selected, canonical data used for generating a report.
 */
export interface SelectedReport {
  windowLabel: '7d' | 'today';
  selected: ReportWindow;
  today: ReportWindow;
  yesterday?: ReportWindow;
  traffic?: ReportTraffic;
  human_traffic?: ReportHumanTraffic;
}
