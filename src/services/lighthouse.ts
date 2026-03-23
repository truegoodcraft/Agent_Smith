// src/services/lighthouse.ts

import { Env } from '../types';
import { LighthouseReport, isLighthouseReport } from '../types/telemetry';

export class LighthouseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LighthouseError';
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

  if (!url) {
    throw new LighthouseError('LIGHTHOUSE_REPORT_URL is not configured.');
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
    throw new LighthouseError('Failed to fetch from Lighthouse service.');
  }

  if (!response.ok) {
    throw new LighthouseError(
      `Lighthouse service returned an error: ${response.status} ${response.statusText}`,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new LighthouseError('Lighthouse service returned invalid JSON.');
  }

  const payloadValidationSucceeded = isLighthouseReport(data);

  if (!payloadValidationSucceeded) {
    throw new LighthouseError('Invalid or malformed payload received from Lighthouse service.');
  }

  return data as LighthouseReport;
}
