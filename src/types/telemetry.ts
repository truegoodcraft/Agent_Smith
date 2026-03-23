// src/types/telemetry.ts

/**
 * Represents the data for a single reporting window (e.g., "today" or "last_7_days").
 */
export interface ReportWindow {
  update_checks: number;
  downloads: number;
  errors: number;
}

/**
 * The expected structure of the JSON payload from the Lighthouse /report endpoint.
 */
export interface LighthouseReport {
  today: ReportWindow;
  yesterday?: ReportWindow;
  last_7_days?: ReportWindow;
  month_to_date?: ReportWindow;
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

  return hasOptionalYesterday && hasOptionalLast7Days && hasOptionalMonthToDate;
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

/**
 * The selected, canonical data used for generating a report.
 */
export interface SelectedReport {
  windowLabel: '7d' | 'today';
  selected: ReportWindow;
  today: ReportWindow;
  yesterday?: ReportWindow;
  selectedAveragePerDay?: ReportWindow;
}
