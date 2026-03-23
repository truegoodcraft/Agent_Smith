// src/logic/report.ts

import { LighthouseReport, ReportWindow, SelectedReport } from '../types/telemetry';

/**
 * Selects the canonical report window based on fixed rules.
 * Prefers `last_7_days` if present, otherwise falls back to `today`.
 */
export function selectReportWindow(payload: LighthouseReport): SelectedReport {
  if (payload.last_7_days) {
    return {
      windowLabel: '7d',
      selected: payload.last_7_days,
      today: payload.today,
      yesterday: payload.yesterday,
      selectedAveragePerDay: {
        update_checks: payload.last_7_days.update_checks / 7,
        downloads: payload.last_7_days.downloads / 7,
        errors: payload.last_7_days.errors / 7,
      },
    };
  }
  return {
    windowLabel: 'today',
    selected: payload.today,
    today: payload.today,
    yesterday: payload.yesterday,
  };
}

/**
 * Generates deterministic read lines from selected-window counters.
 */
export function getDeterministicRead(counters: ReportWindow): string[] {
  const { update_checks, downloads, errors } = counters;
  const totalActivity = update_checks + downloads + errors;

  const activityLine = totalActivity > 0 ? 'Activity present this week' : 'No activity recorded this week';
  const errorLine = errors > 0 ? 'Errors recorded' : 'No errors recorded';

  let volumeLine = 'Downloads equal updater checks';
  if (downloads > update_checks) {
    volumeLine = 'Downloads exceed updater checks';
  } else if (downloads < update_checks) {
    volumeLine = 'Updater checks exceed downloads';
  }

  return [activityLine, errorLine, volumeLine];
}

function compareTotalActivity(a: ReportWindow, b: ReportWindow): 'above' | 'below' | 'equal' {
  const totalA = a.update_checks + a.downloads + a.errors;
  const totalB = b.update_checks + b.downloads + b.errors;

  if (totalA > totalB) {
    return 'above';
  }
  if (totalA < totalB) {
    return 'below';
  }
  return 'equal';
}

/**
 * Generates deterministic trend lines using available comparative windows.
 */
export function getDeterministicTrend(report: SelectedReport): string[] {
  const trendLines: string[] = [];

  if (report.windowLabel === '7d' && report.selectedAveragePerDay) {
    const averageComparison = compareTotalActivity(report.today, report.selectedAveragePerDay);
    if (averageComparison === 'above') {
      trendLines.push('Today is above the 7-day average');
    } else if (averageComparison === 'below') {
      trendLines.push('Today is lighter than the 7-day average');
    } else {
      trendLines.push('Today matches the 7-day average');
    }
  } else {
    trendLines.push('7-day average comparison not available');
  }

  if (report.yesterday) {
    const yesterdayComparison = compareTotalActivity(report.today, report.yesterday);
    if (yesterdayComparison === 'above') {
      trendLines.push('Today is above yesterday');
    } else if (yesterdayComparison === 'below') {
      trendLines.push('Today is below yesterday');
    } else {
      trendLines.push('Today matches yesterday');
    }
  } else {
    trendLines.push('Yesterday comparison not available');
  }

  return trendLines;
}

function formatCounters(label: string, counters: ReportWindow): string {
  return [
    `**${label}**`,
    `- Update checks: ${counters.update_checks}`,
    `- Downloads: ${counters.downloads}`,
    `- Errors: ${counters.errors}`,
  ].join('\n');
}

/**
 * Formats the final report string to be sent to Discord.
 */
export function formatReport(report: SelectedReport): string {
  const statusLine = report.windowLabel === '7d'
    ? 'Report · OK · 7d'
    : 'Report · OK · today';

  const selectedLabel = report.windowLabel === '7d' ? 'Selected window (7d)' : 'Selected window (today)';
  const selectedBlock = formatCounters(selectedLabel, report.selected);
  const todayBlock = formatCounters('Today', report.today);

  const deterministicRead = getDeterministicRead(report.selected)
    .map((line) => `- ${line}`)
    .join('\n');

  const deterministicTrend = getDeterministicTrend(report)
    .map((line) => `- ${line}`)
    .join('\n');

  return [
    `**${statusLine}**`,
    '',
    selectedBlock,
    '',
    todayBlock,
    '',
    '**Read**',
    deterministicRead,
    '',
    '**Trend**',
    deterministicTrend,
  ].join('\n');
}
