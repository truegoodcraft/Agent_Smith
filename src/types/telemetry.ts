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
  referrer_summary: unknown | null;
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

/**
 * The expected structure of the JSON payload from the Lighthouse /report endpoint.
 */
export interface LighthouseReport {
  today: ReportWindow;
  yesterday?: ReportWindow;
  last_7_days?: ReportWindow;
  month_to_date?: ReportWindow;
  traffic?: ReportTraffic;
  trends?: unknown;
  // Other fields from the API can be added here but are not used by the /report command.
}

/**
 * A type guard to validate if an object conforms to the LighthouseReport structure.
 * It checks for the presence and types of the required fields.
 */
export function isLighthouseReport(data: any): data is LighthouseReport {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const hasToday = 'today' in data && isReportWindow(data.today);
  if (!hasToday) {
    return false;
  }

  const hasOptionalYesterday = !('yesterday' in data) || isReportWindow(data.yesterday);
  const hasOptionalLast7Days = !('last_7_days' in data) || isReportWindow(data.last_7_days);
  const hasOptionalMonthToDate = !('month_to_date' in data) || isReportWindow(data.month_to_date);
  const hasOptionalTraffic = !('traffic' in data) || isReportTraffic(data.traffic);

  return hasOptionalYesterday && hasOptionalLast7Days && hasOptionalMonthToDate && hasOptionalTraffic;
}

/**
 * A type guard to validate if an object conforms to the ReportWindow structure.
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
    isNullableString(data.captured_at) &&
    'referrer_summary' in data
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

/**
 * The selected, canonical data used for generating a report.
 */
export interface SelectedReport {
  windowLabel: '7d' | 'today';
  selected: ReportWindow;
  today: ReportWindow;
  yesterday?: ReportWindow;
  traffic?: ReportTraffic;
}
