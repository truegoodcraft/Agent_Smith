import { APIApplicationCommandInteraction, APIInteractionResponse, InteractionResponseType } from 'discord-api-types/v10';
import { Command, Env } from '../types';
import { LighthouseError, getLighthouseReport } from '../services/lighthouse';
import { formatLighthouseReport } from '../logic/report';
import { LighthouseReportRequest, ReportView, SiteKey } from '../types/telemetry';

function getStringOption(
  interaction: APIApplicationCommandInteraction,
  optionName: string,
): string | undefined {
  const data = interaction.data;
  if (!('options' in data)) {
    return undefined;
  }

  const options = data.options;

  if (!options || !Array.isArray(options)) {
    return undefined;
  }

  const match = options.find((option) => option.name === optionName);
  if (!match || !('value' in match) || typeof match.value !== 'string') {
    return undefined;
  }

  return match.value;
}

function toView(input?: string): ReportView {
  if (input === 'fleet' || input === 'site' || input === 'source_health' || input === 'legacy') {
    return input;
  }

  return 'legacy';
}

function toSiteKey(input?: string): SiteKey | undefined {
  if (input === 'buscore' || input === 'tgc_site' || input === 'star_map_generator') {
    return input;
  }

  return undefined;
}

function parseReportRequest(interaction: APIApplicationCommandInteraction): LighthouseReportRequest {
  const view = toView(getStringOption(interaction, 'view'));
  const site = toSiteKey(getStringOption(interaction, 'site'));

  if (view === 'site') {
    return {
      view,
      siteKey: site,
    };
  }

  return {
    view,
  };
}

function deterministicErrorResponse(content: string): APIInteractionResponse {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content,
      flags: 64,
    },
  };
}

async function handle(interaction: APIApplicationCommandInteraction, env: Env): Promise<APIInteractionResponse> {
  const request = parseReportRequest(interaction);

  if (request.view === 'site' && !request.siteKey) {
    return deterministicErrorResponse('Could not retrieve site report: missing required site key.');
  }

  try {
    const lighthouseData = await getLighthouseReport(env, request);
    let reportContent: string;
    try {
      reportContent = formatLighthouseReport(lighthouseData);
    } catch (formatError) {
      console.error('[REPORT_FORMAT_FAIL] Failed to format report', formatError);
      throw formatError;
    }

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: reportContent,
      },
    };
  } catch (error) {
    if (error instanceof LighthouseError && error.code === 'missing_site_key') {
      return deterministicErrorResponse('Could not retrieve site report: missing required site key.');
    }

    if (error instanceof LighthouseError && error.code === 'invalid_site_key') {
      return deterministicErrorResponse('Could not retrieve report: invalid site key.');
    }

    if (error instanceof LighthouseError && error.code === 'invalid_view') {
      return deterministicErrorResponse('Could not retrieve report: invalid view.');
    }

    // TODO: In the future, log the full error to a real logging service.
    let debugCode = '';
    if (error instanceof Error) {
      if (error.message.includes('JSON')) {
        debugCode = ' (REPORT_JSON_FAIL)';
      } else if (error.message.includes('Invalid or malformed')) {
        debugCode = ' (REPORT_VALIDATION_FAIL)';
      } else if (error.message.includes('format')) {
        debugCode = ' (REPORT_FORMAT_FAIL)';
      }
    }
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `Could not retrieve the report at this time.${debugCode}`,
        flags: 64, // Ephemeral
      },
    };
  }
}

export const report: Command = {
  name: 'report',
  definition: {
    name: 'report',
    description: 'Fetch Lighthouse report views',
    type: 1,
    options: [
      {
        name: 'view',
        description: 'Report view',
        type: 3,
        required: false,
        choices: [
          { name: 'legacy', value: 'legacy' },
          { name: 'fleet', value: 'fleet' },
          { name: 'site', value: 'site' },
          { name: 'source_health', value: 'source_health' },
        ],
      },
      {
        name: 'site',
        description: 'Site key for site view',
        type: 3,
        required: false,
        choices: [
          { name: 'buscore', value: 'buscore' },
          { name: 'tgc_site', value: 'tgc_site' },
          { name: 'star_map_generator', value: 'star_map_generator' },
        ],
      },
    ],
  },
  handler: async (interaction, env, ctx) => {
    const responsePayload = await handle(interaction, env);
    return new Response(JSON.stringify(responsePayload), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
