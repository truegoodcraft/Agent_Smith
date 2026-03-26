import { InteractionResponseType } from 'discord-api-types/v10';
import { getLighthouseReport } from '../services/lighthouse';
import { formatReport, selectReportWindow } from '../logic/report';
async function handle(interaction, env) {
    try {
        const lighthouseData = await getLighthouseReport(env);
        const selectedReport = selectReportWindow(lighthouseData);
        let reportContent;
        try {
            reportContent = formatReport(selectedReport);
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
    handler: async (interaction, env, ctx) => {
        const responsePayload = await handle(interaction, env);
        return new Response(JSON.stringify(responsePayload), {
            headers: { 'Content-Type': 'application/json' },
        });
    },
};
