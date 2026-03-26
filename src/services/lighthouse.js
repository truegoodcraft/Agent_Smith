// src/services/lighthouse.ts
import { isLighthouseReport } from '../types/telemetry';
export class LighthouseError extends Error {
    constructor(message) {
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
export async function getLighthouseReport(env) {
    const url = env.LIGHTHOUSE_REPORT_URL;
    if (!url) {
        throw new LighthouseError('LIGHTHOUSE_REPORT_URL is not configured.');
    }
    let response;
    try {
        response = await fetch(url, {
            headers: {
                'X-Admin-Token': env.LIGHTHOUSE_ADMIN_TOKEN,
            },
            // In a real-world scenario, you'd add timeouts, etc.
            // For this packet, we keep it simple.
        });
    }
    catch {
        throw new LighthouseError('Failed to fetch from Lighthouse service.');
    }
    if (!response.ok) {
        throw new LighthouseError(`Lighthouse service returned an error: ${response.status} ${response.statusText}`);
    }
    console.log('[REPORT_FETCH_OK] Lighthouse HTTP 200 received');
    let data;
    try {
        data = await response.json();
    }
    catch (e) {
        console.error('[REPORT_JSON_FAIL] Failed to parse JSON from Lighthouse response', e);
        throw new LighthouseError('Lighthouse service returned invalid JSON.');
    }
    console.log('[REPORT_JSON_OK] Lighthouse response parsed successfully');
    if (data && typeof data === 'object') {
        const topLevelKeys = Object.keys(data).sort();
        console.log('[REPORT_TOP_LEVEL_KEYS]', topLevelKeys.join(', '));
    }
    const payloadValidationSucceeded = isLighthouseReport(data);
    if (!payloadValidationSucceeded) {
        console.error('[REPORT_VALIDATION_FAIL] Payload failed schema validation');
        throw new LighthouseError('Invalid or malformed payload received from Lighthouse service.');
    }
    console.log('[REPORT_VALIDATION_OK] Payload passed schema validation');
    return data;
}
