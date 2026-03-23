import { APIApplicationCommandInteraction } from 'discord-api-types/v10';
import { commandMap } from '../commands';
import { Env } from '../types';

/**
 * Agent Smith's Durable Object.
 *
 * This DO is used as a single-threaded "command brain" to orchestrate execution
 * and ensure that only one command is processed at a time. It calls the relevant
 * command handler, but the core deterministic logic lives in the command modules
 * themselves (e.g., in `src/commands/report.ts`), not in this class.
 *
 * In v1, it does not persist any state itself. It is purely an execution controller.
 */
export class SmithDO {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const interaction = await request.json<APIApplicationCommandInteraction>();
    const command = commandMap.get(interaction.data.name);

    if (!command) {
      // This should ideally not be reached if the worker validates commands first
      return new Response(JSON.stringify({ error: 'Unknown command' }), { status: 400 });
    }

    // Execute the command handler
    const executionContext = {
      waitUntil: (promise: Promise<any>) => this.state.waitUntil(promise),
      passThroughOnException: () => {},
    } as ExecutionContext;


    return command.handler(interaction, this.env, executionContext);
  }
}
