/**
 * Settings Routes
 * Provides application settings and feature flags
 */

import type { FastifyInstance } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import { buildSuccessResponse } from '@/server/utils/response';
import { getCapabilities } from '@repo/agent-cli-sdk';

const execAsync = promisify(exec);

/**
 * Check if GitHub CLI (gh) is installed and accessible
 */
async function checkGhInstalled(): Promise<boolean> {
  try {
    await execAsync('gh --version');
    return true;
  } catch {
    return false;
  }
}

export async function settingsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/settings
   * Get application settings and feature flags
   */
  fastify.get('/api/settings', async (request, reply) => {
    const ghInstalled = await checkGhInstalled();

    const settings = {
      features: {
        aiEnabled: !!process.env.ANTHROPIC_API_KEY,
        gitEnabled: true, // Git operations are always available
        ghCliEnabled: ghInstalled, // GitHub CLI for PR creation
      },
      agents: {
        claude: getCapabilities('claude'),
        codex: getCapabilities('codex'),
        cursor: getCapabilities('cursor'),
        gemini: getCapabilities('gemini'),
      },
      version: '0.1.0',
    };

    return reply.send(buildSuccessResponse(settings));
  });
}
