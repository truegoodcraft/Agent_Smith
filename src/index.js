import { InteractionResponseType, } from 'discord-api-types/v10';
import { verifyDiscordRequest } from './discord';
import { isApplicationCommandInteraction, isPingInteraction } from './types';
import { commandMap } from './commands';
import { SmithDO } from './durable/SmithDO';
export default {
    async fetch(request, env, ctx) {
        if (!request.headers.get('x-signature-ed25519')) {
            // Non-Discord requests can be routed here.
            // For now, just returning a simple message.
            return new Response('Hello, world! This is Agent Smith.');
        }
        const isValid = await verifyDiscordRequest(request, env.DISCORD_PUBLIC_KEY);
        if (!isValid) {
            return new Response('Invalid request signature.', { status: 401 });
        }
        try {
            const interaction = await request.json();
            if (isPingInteraction(interaction)) {
                return new Response(JSON.stringify({ type: InteractionResponseType.Pong }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (isApplicationCommandInteraction(interaction)) {
                const command = commandMap.get(interaction.data.name);
                if (!command) {
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.ChannelMessageWithSource,
                        data: { content: `Unknown command: ${interaction.data.name}` },
                    }), { headers: { "Content-Type": "application/json" }, status: 400 });
                }
                // Get a handle to the Durable Object.
                // The ID is static to ensure we always use the same DO instance.
                const doId = env.AGENT_SMITH_DO.idFromName('singleton');
                const stub = env.AGENT_SMITH_DO.get(doId);
                // Forward the request to the Durable Object.
                // This ensures single-threaded execution of commands.
                // We pass the original request body to the DO.
                const doRequest = new Request(request.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(interaction),
                });
                return stub.fetch(doRequest);
            }
            return new Response(JSON.stringify({
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: 'Error: Unsupported interaction type.',
                    flags: 64, // Ephemeral
                }
            }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            // TODO: In the future, log the error `errorMessage` to a real logging service.
            return new Response(JSON.stringify({
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: 'An unexpected error occurred while processing your command.',
                    flags: 64, // Ephemeral
                }
            }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    },
};
// Export the Durable Object class
export { SmithDO };
