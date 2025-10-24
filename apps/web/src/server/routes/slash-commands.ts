import type { FastifyInstance } from 'fastify';
import { getProjectSlashCommands } from '@/server/services/slashCommand';
import { slashCommandParamsSchema } from '@/server/schemas/slashCommand';
import { buildErrorResponse } from '@/server/utils/error';

/**
 * Slash Commands Routes
 * API endpoints for slash command functionality
 */
export async function slashCommandsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/projects/:id/slash-commands
   * Get custom slash commands for a project
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/api/projects/:id/slash-commands',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: slashCommandParamsSchema,
      },
    },
    async (request, reply) => {
      try {
        const commands = await getProjectSlashCommands(request.params.id);
        return reply.send({ data: commands });
      } catch (error) {
        const errorMessage = (error as Error).message;

        if (errorMessage === 'Project not found') {
          return reply.code(404).send(buildErrorResponse(404, 'Project not found'));
        }

        fastify.log.error({ error }, 'Error fetching slash commands');
        return reply.code(500).send(buildErrorResponse(500, 'Failed to fetch slash commands'));
      }
    }
  );
}
