import {
  APIApplicationCommandInteraction,
  APIPingInteraction,
  InteractionType,
} from 'discord-api-types/v10';

/**
 * Environment variables and bindings available to the Worker.
 * Declared in wrangler.toml and configured in the Cloudflare dashboard.
 */
export interface Env {
  // Durable Object binding
  AGENT_SMITH_DO: DurableObjectNamespace;

  // Secrets
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID: string;
  DISCORD_BOT_TOKEN: string;
  LIGHTHOUSE_ADMIN_TOKEN: string;

  // Lighthouse endpoint URLs (configured via wrangler.toml [vars] or .dev.vars)
  LIGHTHOUSE_REPORT_URL?: string;
}

/**
 * The structure of a slash command handler.
 */
export interface Command {
  name: string;
  handler: (interaction: APIApplicationCommandInteraction, env: Env, ctx: ExecutionContext) => Promise<Response>;
}

/**
 * Type guard to check if an interaction is a PING from Discord.
 */
export function isPingInteraction(
  interaction: unknown
): interaction is APIPingInteraction {
  return (
    !!interaction &&
    typeof interaction === 'object' &&
    'type' in interaction &&
    interaction.type === InteractionType.Ping
  );
}

/**
 * Type guard to check if an interaction is an Application Command (slash command).
 */
export function isApplicationCommandInteraction(
  interaction: unknown
): interaction is APIApplicationCommandInteraction {
  return (
    !!interaction &&
    typeof interaction === 'object' &&
    'type' in interaction &&
    interaction.type === InteractionType.ApplicationCommand
  );
}
