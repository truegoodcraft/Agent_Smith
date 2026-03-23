import { APIApplicationCommandInteraction, APIInteractionResponse, InteractionResponseType } from 'discord-api-types/v10';
import { Command, Env } from '../types';
import { getLighthouseReport, LighthouseError } from '../services/lighthouse';
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
  } catch (e) {
    // TODO: In the future, log the full error `e` to a real logging service.
    // The original error message is preserved in `e` but not shown to the user.
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: 'Could not retrieve the report at this time. Please try again later.',
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
