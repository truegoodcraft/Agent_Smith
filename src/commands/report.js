import { InteractionResponseType } from 'discord-api-types/v10';
import { LighthouseError, getLighthouseReport } from '../services/lighthouse';
import { formatLighthouseReport } from '../logic/report';
function getStringOption(interaction, optionName) {
    const data = interaction.data;
    if (!('options' in data)) {
        return undefined;
    }
    const options = data.options;
    if (!options || !Array.isArray(options)) {
        return undefined;
    }
    const match = options.find((option) => option.name === optionName);
    if (!match || !('value' in match) || typeof match.value !== 'string') {
        return undefined;
    }
    return match.value;
}
function toView(input) {
    if (input === 'fleet' || input === 'site' || input === 'source_health' || input === 'legacy') {
        return input;
    }
    return 'legacy';
}
function toSiteKey(input) {
    if (input === 'buscore' || input === 'tgc_site' || input === 'star_map_generator') {
        return input;
    }
    return undefined;
}
function usesLegacyRichSiteRoute(site) {
    return site === 'buscore';
}
function parseReportRequest(interaction) {
    const site = toSiteKey(getStringOption(interaction, 'site'));
    const rawView = getStringOption(interaction, 'view');
    const view = toView(rawView);
    if (site) {
        if (usesLegacyRichSiteRoute(site)) {
            return {
                view: 'legacy',
            };
        }
        return {
            view: 'site',
            siteKey: site,
        };
    }
    if (view === 'site') {
        return {
            view,
        };
    }
    if (rawView && (view === 'legacy' || view === 'source_health' || view === 'fleet')) {
        return {
            view,
        };
    }
    return {
        view: 'fleet',
    };
}
function deterministicErrorResponse(content) {
    return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
            content,
            flags: 64,
        },
    };
}
async function handle(interaction, env) {
    const request = parseReportRequest(interaction);
    if (request.view === 'site' && !request.siteKey) {
        return deterministicErrorResponse('Could not retrieve site report: missing required site key.');
    }
    try {
        const lighthouseData = await getLighthouseReport(env, request);
        let reportContent;
        try {
            reportContent = formatLighthouseReport(lighthouseData);
        }
        catch (formatError) {
            console.error('[REPORT_FORMAT_FAIL] Failed to format report', formatError);
            throw formatError;
        }
        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                content: reportContent,
            },
        };
    }
    catch (error) {
        if (error instanceof LighthouseError && error.code === 'missing_site_key') {
            return deterministicErrorResponse('Could not retrieve site report: missing required site key.');
        }
        if (error instanceof LighthouseError && error.code === 'invalid_site_key') {
            return deterministicErrorResponse('Could not retrieve report: invalid site key.');
        }
        if (error instanceof LighthouseError && error.code === 'invalid_view') {
            return deterministicErrorResponse('Could not retrieve report: invalid view.');
        }
        // TODO: In the future, log the full error to a real logging service.
        let debugCode = '';
        if (error instanceof Error) {
            if (error.message.includes('JSON')) {
                debugCode = ' (REPORT_JSON_FAIL)';
            }
            else if (error.message.includes('Invalid or malformed')) {
                debugCode = ' (REPORT_VALIDATION_FAIL)';
            }
            else if (error.message.includes('format')) {
                debugCode = ' (REPORT_FORMAT_FAIL)';
            }
        }
        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                content: `Could not retrieve the report at this time.${debugCode}`,
                flags: 64, // Ephemeral
            },
        };
    }
}
export const report = {
    name: 'report',
    definition: {
        name: 'report',
        description: 'Operator report for all tracked sites or one selected site',
        type: 1,
        options: [
            {
                name: 'site',
                description: 'Optional site key for detailed single-site report',
                type: 3,
                required: false,
                choices: [
                    { name: 'buscore', value: 'buscore' },
                    { name: 'tgc_site', value: 'tgc_site' },
                    { name: 'star_map_generator', value: 'star_map_generator' },
                ],
            },
            {
                name: 'view',
                description: 'Advanced compatibility view override',
                type: 3,
                required: false,
                choices: [
                    { name: 'fleet', value: 'fleet' },
                    { name: 'legacy', value: 'legacy' },
                    { name: 'source_health', value: 'source_health' },
                    { name: 'site (requires site)', value: 'site' },
                ],
            },
        ],
    },
    handler: async (interaction, env, ctx) => {
        const responsePayload = await handle(interaction, env);
        return new Response(JSON.stringify(responsePayload), {
            headers: { 'Content-Type': 'application/json' },
        });
    },
};
