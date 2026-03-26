import { report } from './report';
import { health } from './health';
export const commands = [health, report];
export const commandMap = new Map(commands.map(cmd => [cmd.name, cmd]));
