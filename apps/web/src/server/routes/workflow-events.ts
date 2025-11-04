import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getWorkflowEvents } from '@/server/domain/workflow/services/getWorkflowEvents';
import { createWorkflowEventSchema, getWorkflowEventsQuerySchema } from '@/shared/schemas';
import { createWorkflowEvent } from '@/server/domain/workflow/services/createWorkflowEvent';

const executionIdSchema = z.object({
  id: z.string().cuid(),
});

export async function workflowEventRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/workflow-executions/:id/events
   * Create an event on a workflow or step
   */
  fastify.post<{
    Params: z.infer<typeof executionIdSchema>;
    Body: z.infer<typeof createWorkflowEventSchema>;
  }>(
    '/api/workflow-executions/:id/events',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: executionIdSchema,
        body: createWorkflowEventSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.id;
      const body = request.body;

      const event = await createWorkflowEvent({
        workflow_execution_id: id,
        workflow_execution_step_id: body.step_id,
        event_type: body.event_type || 'annotation_added',
        event_data: { text: body.text },
        created_by_user_id: userId,
        logger: fastify.log,
      });

      return reply.code(201).send({ data: event });
    }
  );

  /**
   * GET /api/workflow-executions/:id/events
   * List events for a workflow execution
   */
  fastify.get<{
    Params: z.infer<typeof executionIdSchema>;
    Querystring: z.infer<typeof getWorkflowEventsQuerySchema>;
  }>(
    '/api/workflow-executions/:id/events',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: executionIdSchema,
        querystring: getWorkflowEventsQuerySchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { step_id } = request.query;

      const events = await getWorkflowEvents(id, step_id);

      return reply.send({ data: events });
    }
  );
}
