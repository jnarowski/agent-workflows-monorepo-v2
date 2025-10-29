/**
 * Settings Routes
 * Provides application settings and feature flags
 */

import type { FastifyInstance } from "fastify";
import { exec } from "child_process";
import { promisify } from "util";
import { buildSuccessResponse } from "@/server/utils/response";
import { getCapabilities } from "@repo/agent-cli-sdk";

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

      // TEMPORARY DEBUG: Hard-coded capabilities to test different installation states
      // Comment out this block and uncomment the real implementation below to restore normal behavior
      // const settings = {
      //   features: {
      //     aiEnabled: !!process.env.ANTHROPIC_API_KEY,
      //     gitEnabled: true, // Git operations are always available
      //     ghCliEnabled: ghInstalled, // GitHub CLI for PR creation
      //   },
      //   agents: {
      //     // Claude: Installed (to test working agent)
      //     claude: {
      //       supportsSlashCommands: true,
      //       supportsModels: true,
      //       models: [
      //         { id: "claude-sonnet-4-5-20250929", name: "Sonnet 4.5" },
      //         { id: "claude-opus-4-20250514", name: "Opus 4.1" },
      //       ],
      //       installed: true,
      //       cliPath: "/usr/local/bin/claude",
      //     },
      //     // Codex: NOT installed (to test installation instructions)
      //     codex: {
      //       supportsSlashCommands: false,
      //       supportsModels: true,
      //       models: [
      //         { id: "gpt-5-codex", name: "GPT-5 Codex" },
      //         { id: "gpt-5", name: "GPT-5" },
      //       ],
      //       installed: true,
      //       cliPath: undefined,
      //     },
      //     // Cursor: NOT installed (to test "coming soon" message)
      //     cursor: {
      //       supportsSlashCommands: false,
      //       supportsModels: false,
      //       models: [],
      //       installed: false,
      //       cliPath: undefined,
      //     },
      //     // Gemini: NOT installed (to test "coming soon" message)
      //     gemini: {
      //       supportsSlashCommands: false,
      //       supportsModels: false,
      //       models: [],
      //       installed: false,
      //       cliPath: undefined,
      //     },
      //   },
      //   version: "0.1.0",
      //   // Future: Add user-specific preferences here
      // };

      const settings = {
        features: {
          aiEnabled: !!process.env.ANTHROPIC_API_KEY,
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
