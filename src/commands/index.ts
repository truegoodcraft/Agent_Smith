import { report } from './report';
import { health } from './health';
import { Command } from '../types';

export const commands: Command[] = [health, report];

export const commandMap = new Map<string, Command>(
  commands.map(cmd => [cmd.name, cmd])
);
