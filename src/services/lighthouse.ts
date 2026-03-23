// src/services/lighthouse.ts

import { Env } from '../types';
import { LighthouseReport, isLighthouseReport } from '../types/telemetry';

export class LighthouseError extends Error {
  code: string;

  constructor(message: string, code = 'REPORT_FETCH_FAILED') {
    super(message);
    this.name = 'LighthouseError';
    this.code = code;
  }
}

/**
 * Fetches and validates the report from the Lighthouse service.
 * @param env The worker environment containing secrets and variables.
 * @returns A validated LighthouseReport object.
 * @throws {LighthouseError} If the fetch fails, the response is not OK, or the payload is invalid.
 */
export async function getLighthouseReport(env: Env): Promise<LighthouseReport> {
  const url = env.LIGHTHOUSE_REPORT_URL;
  const hasReportUrl = Boolean(url);
  const hasAdminToken = Boolean(env.LIGHTHOUSE_ADMIN_TOKEN);

  let safeReportUrl: string | null = null;
  if (url) {
    try {
      const parsed = new URL(url);
      safeReportUrl = `${parsed.origin}${parsed.pathname}`;
    } catch {
      safeReportUrl = 'INVALID_URL';
    }
  }

  console.log('[report-debug] config', {
    hasReportUrl,
    reportUrlOriginPath: safeReportUrl,
    hasAdminToken,
  });

  if (!url) {
    console.log('[report-debug] outcome', {
      debugCode: 'REPORT_URL_MISSING',
      statusCode: null,
      statusText: null,
      jsonParsingSucceeded: false,
      payloadValidationSucceeded: false,
    });
    throw new LighthouseError('LIGHTHOUSE_REPORT_URL is not configured.', 'REPORT_URL_MISSING');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'X-Admin-Token': env.LIGHTHOUSE_ADMIN_TOKEN,
      },
      // In a real-world scenario, you'd add timeouts, etc.
      // For this packet, we keep it simple.
    });
  } catch {
    console.log('[report-debug] outcome', {
      debugCode: 'REPORT_FETCH_FAILED',
      statusCode: null,
      statusText: null,
      jsonParsingSucceeded: false,
      payloadValidationSucceeded: false,
    });
    throw new LighthouseError('Failed to fetch from Lighthouse service.', 'REPORT_FETCH_FAILED');
  }

  if (!response.ok) {
    const debugCode = response.status === 401 ? 'REPORT_401' : 'REPORT_FETCH_FAILED';
    console.log('[report-debug] outcome', {
      debugCode,
      statusCode: response.status,
      statusText: response.statusText,
      jsonParsingSucceeded: false,
      payloadValidationSucceeded: false,
    });
    throw new LighthouseError(
      `Lighthouse service returned an error: ${response.status} ${response.statusText}`,
      debugCode,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    console.log('[report-debug] outcome', {
      debugCode: 'REPORT_INVALID_JSON',
      statusCode: response.status,
      statusText: response.statusText,
      jsonParsingSucceeded: false,
      payloadValidationSucceeded: false,
    });
    throw new LighthouseError('Lighthouse service returned invalid JSON.', 'REPORT_INVALID_JSON');
  }

  const payloadValidationSucceeded = isLighthouseReport(data);
  console.log('[report-debug] outcome', {
    debugCode: payloadValidationSucceeded ? 'REPORT_OK' : 'REPORT_INVALID_PAYLOAD',
    statusCode: response.status,
    statusText: response.statusText,
    jsonParsingSucceeded: true,
    payloadValidationSucceeded,
  });

  if (!payloadValidationSucceeded) {
    throw new LighthouseError('Invalid or malformed payload received from Lighthouse service.', 'REPORT_INVALID_PAYLOAD');
  }

  return data as LighthouseReport;
}
