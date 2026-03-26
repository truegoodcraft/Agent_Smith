import { InteractionType, } from 'discord-api-types/v10';
/**
 * Type guard to check if an interaction is a PING from Discord.
 */
export function isPingInteraction(interaction) {
    return (!!interaction &&
        typeof interaction === 'object' &&
        'type' in interaction &&
        interaction.type === InteractionType.Ping);
}
/**
 * Type guard to check if an interaction is an Application Command (slash command).
 */
export function isApplicationCommandInteraction(interaction) {
    return (!!interaction &&
        typeof interaction === 'object' &&
        'type' in interaction &&
        interaction.type === InteractionType.ApplicationCommand);
}
