import { APIApplicationCommandInteraction, APIInteractionResponse, InteractionResponseType } from 'discord-api-types/v10';
import { Command, Env } from '../types';
import { getLighthouseErrors, LighthouseError } from '../services/lighthouse';
import { formatErrors, selectErrorsWindow } from '../logic/errors';

async function handle(interaction: APIApplicationCommandInteraction, env: Env): Promise<APIInteractionResponse> {
  try {
    const payload = await getLighthouseErrors(env);
    const selected = selectErrorsWindow(payload);
    const content = formatErrors(selected);

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content },
    };
  } catch (e) {
    const isNotConfigured = e instanceof LighthouseError && e.message.includes('not configured');
    const content = isNotConfigured
      ? 'Errors endpoint is not yet configured. Set LIGHTHOUSE_ERRORS_URL to enable this command.'
      : 'Could not retrieve error data at this time.';

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content, flags: 64 },
    };
  }
}

export const errors: Command = {
  name: 'errors',
  handler: async (interaction, env, ctx) => {
      const responsePayload = await handle(interaction, env);
      return new Response(JSON.stringify(responsePayload), {
          headers: { 'Content-Type': 'application/json' }
      });
  }
};
