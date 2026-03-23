import { APIApplicationCommandInteraction, APIInteractionResponse, InteractionResponseType } from 'discord-api-types/v10';
import { Command, Env } from '../types';
import { getLighthouseTraffic, LighthouseError } from '../services/lighthouse';
import { formatTraffic, selectTrafficWindow } from '../logic/traffic';

async function handle(interaction: APIApplicationCommandInteraction, env: Env): Promise<APIInteractionResponse> {
  try {
    const payload = await getLighthouseTraffic(env);
    const selected = selectTrafficWindow(payload);
    const content = formatTraffic(selected);

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content },
    };
  } catch (e) {
    const isNotConfigured = e instanceof LighthouseError && e.message.includes('not configured');
    const content = isNotConfigured
      ? 'Traffic endpoint is not yet configured. Set LIGHTHOUSE_TRAFFIC_URL to enable this command.'
      : 'Could not retrieve traffic data at this time.';

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content, flags: 64 },
    };
  }
}

export const traffic: Command = {
  name: 'traffic',
  handler: async (interaction, env, ctx) => {
      const responsePayload = await handle(interaction, env);
      return new Response(JSON.stringify(responsePayload), {
          headers: { 'Content-Type': 'application/json' }
      });
  }
};
