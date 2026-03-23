// src/logic/report.ts

import { LighthouseReport, ReportWindow, SelectedReport } from '../types/telemetry';

/**
 * Selects the canonical report window based on fixed rules.
 * Prefers `last_7_days` if present, otherwise falls back to `today`.
 */
export function selectReportWindow(payload: LighthouseReport): SelectedReport {
  if (payload.last_7_days) {
    return { windowLabel: '7d', data: payload.last_7_days };
  }
  return { windowLabel: 'today', data: payload.today };
}

/**
 * Generates a compact, deterministic interpretation line based on report data.
 */
export function getDeterministicInterpretation(counters: ReportWindow): string {
  const { update_checks, downloads, errors } = counters;

  if (errors > 0) {
    return 'Recent error activity present; investigation recommended.';
  }
  if (downloads > 0) {
      if (downloads > update_checks) {
        return 'Download activity exceeds updater traffic; likely fresh installs or direct download activity.';
      }
    return 'Normal activity: downloads present with no errors.';
  }
  if (update_checks > 0) {
    return 'Update check activity present but no downloads recorded.';
  }
  return 'Telemetry is thin; all counters are zero in this window.';
}

/**
 * Formats the final report string to be sent to Discord.
 */
export function formatReport(report: SelectedReport): string {
  const { windowLabel, data } = report;
  const interpretation = getDeterministicInterpretation(data);

  const summary = [
    `* Update checks: ${data.update_checks} (${windowLabel})`,
    `* Downloads: ${data.downloads} (${windowLabel})`,
    `* Errors: ${data.errors} (${windowLabel})`,
  ].join('\n');

  return `**Summary**
${summary}

**Interpretation**
${interpretation}`;
}
