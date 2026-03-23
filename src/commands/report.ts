import { APIApplicationCommandInteraction, APIInteractionResponse, InteractionResponseType } from 'discord-api-types/v10';
import { Command, Env } from '../types';
import { getLighthouseReport } from '../services/lighthouse';
import { formatReport, selectReportWindow } from '../logic/report';

async function handle(interaction: APIApplicationCommandInteraction, env: Env): Promise<APIInteractionResponse> {
  try {
    const lighthouseData = await getLighthouseReport(env);
    const selectedReport = selectReportWindow(lighthouseData);
    const reportContent = formatReport(selectedReport);

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: reportContent,
      },
    };
  } catch {
    // TODO: In the future, log the full error to a real logging service.
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: 'Could not retrieve the report at this time.',
        flags: 64, // Ephemeral
      },
    };
  }
}

export const report: Command = {
  name: 'report',
  handler: async (interaction, env, ctx) => {
    const responsePayload = await handle(interaction, env);
    return new Response(JSON.stringify(responsePayload), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
