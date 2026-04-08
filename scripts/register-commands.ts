import { commandDefinitions } from '../src/commands';

const applicationId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
const dryRun = process.argv.includes('--dry-run');

const url = applicationId
  ? `https://discord.com/api/v10/applications/${applicationId}/commands`
  : '';

async function main(): Promise<void> {
  if (dryRun) {
    console.log('[register-commands] Dry run enabled. No request sent to Discord.');
    console.log(JSON.stringify(commandDefinitions, null, 2));
    return;
  }

  if (!applicationId || !botToken) {
    console.error('Missing required environment variables: DISCORD_APPLICATION_ID and/or DISCORD_BOT_TOKEN.');
    process.exit(1);
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commandDefinitions),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[register-commands] Discord command registration failed: ${response.status} ${response.statusText}`);
    console.error(body);
    process.exit(1);
  }

  console.log('[register-commands] Discord slash commands registered successfully.');
}

void main();
