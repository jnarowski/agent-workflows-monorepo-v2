/**
 * Settings Routes
 * Provides application settings and feature flags
 */

import type { FastifyInstance } from "fastify";
import { exec } from "child_process";
import { promisify } from "util";
import { buildSuccessResponse } from "@/server/utils/response";
import { getCapabilities } from "@repo/agent-cli-sdk";
import { config } from "@/server/config/Configuration.js";

const execAsync = promisify(exec);

/**
 * Check if GitHub CLI (gh) is installed and accessible
 */
async function checkGhInstalled(): Promise<boolean> {
  try {
    await execAsync("gh --version");
    return true;
  } catch {
    return false;
  }
}

export async function settingsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/settings
   * Get application settings and feature flags
   * Requires authentication to prepare for user-specific configuration
   */
  fastify.get(
    "/api/settings",
    {
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const ghInstalled = await checkGhInstalled();

      fastify.log.info({ userId }, "Fetching settings");

      const settings = {
        features: {
          aiEnabled: !!config.get('apiKeys').anthropicApiKey,
          gitEnabled: true, // Git operations are always available
          ghCliEnabled: ghInstalled, // GitHub CLI for PR creation
        },
        agents: {
          claude: await getCapabilities("claude"),
          codex: await getCapabilities("codex"),
          cursor: await getCapabilities("cursor"),
          gemini: await getCapabilities("gemini"),
        },
        version: "0.1.0",
        // Future: Add user-specific preferences here
      };

      return reply.send(buildSuccessResponse(settings));
    }
  );
}
