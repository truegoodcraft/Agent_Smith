import { InteractionResponseType } from 'discord-api-types/v10';
async function handle(interaction, env) {
    return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
            content: 'Smith operational. Worker and Durable Object responding.',
        },
    };
}
export const health = {
    name: 'health',
    handler: async (interaction, env, ctx) => {
        const responsePayload = await handle(interaction, env);
        return new Response(JSON.stringify(responsePayload), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
