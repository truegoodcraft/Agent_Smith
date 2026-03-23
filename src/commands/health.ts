import { APIApplicationCommandInteraction, APIInteractionResponse, InteractionResponseType } from 'discord-api-types/v10';
import { Command, Env } from '../types';

async function handle(interaction: APIApplicationCommandInteraction, env: Env): Promise<APIInteractionResponse> {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: 'Smith operational. Worker and Durable Object responding.',
    },
  };
}

export const health: Command = {
  name: 'health',
  handler: async (interaction, env, ctx) => {
      const responsePayload = await handle(interaction, env);
      return new Response(JSON.stringify(responsePayload), {
          headers: { 'Content-Type': 'application/json' }
      });
  }
};
