import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@/shared/prisma";
import { getWorkflowEvents } from "@/server/domain/workflow/services/events/getWorkflowEvents";
import {
  createWorkflowEventSchema,
  getWorkflowEventsQuerySchema,
} from "@/shared/schemas/workflow.schemas";
import { createWorkflowEvent } from "@/server/domain/workflow/services/events/createWorkflowEvent";
import '@/server/plugins/auth';

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
    "/api/workflow-executions/:id/events",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: executionIdSchema,
        body: createWorkflowEventSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request.user! as { id: string }).id;
      const body = request.body;

      // Get execution to extract current phase
      const execution = await prisma.workflowExecution.findUnique({
        where: { id },
        select: { current_phase: true },
      });

      const event = await createWorkflowEvent({
        workflow_execution_id: id,
        event_type: "annotation_added" as const,
        event_data: { title: "Annotation", body: body.text },
        phase: execution?.current_phase,
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
    "/api/workflow-executions/:id/events",
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
