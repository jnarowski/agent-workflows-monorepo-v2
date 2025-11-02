import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createComment, getComments } from '@/server/domain/workflow/services';
import { createCommentSchema, getCommentsQuerySchema } from '@/server/domain/workflow/schemas';
import { NotFoundError } from '@/server/utils/error';

const executionIdSchema = z.object({
  id: z.string().cuid(),
});

export async function workflowCommentRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/workflow-executions/:id/comments
   * Create a comment on a workflow or step
   */
  fastify.post<{
    Params: z.infer<typeof executionIdSchema>;
    Body: z.infer<typeof createCommentSchema>;
  }>(
    '/api/workflow-executions/:id/comments',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: executionIdSchema,
        body: createCommentSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.id;
      const body = request.body;

      const comment = await createComment({
        workflow_execution_id: id,
        workflow_execution_step_id: body.step_id,
        text: body.text,
        comment_type: body.comment_type,
        created_by: userId,
      });

      if (!comment) {
        throw new NotFoundError('Workflow execution or step not found');
      }

      return reply.code(201).send({ data: comment });
    }
  );

  /**
   * GET /api/workflow-executions/:id/comments
   * List comments for a workflow execution
   */
  fastify.get<{
    Params: z.infer<typeof executionIdSchema>;
    Querystring: z.infer<typeof getCommentsQuerySchema>;
  }>(
    '/api/workflow-executions/:id/comments',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: executionIdSchema,
        querystring: getCommentsQuerySchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { step_id } = request.query;

      const comments = await getComments(id, step_id);

      return reply.send({ data: comments });
    }
  );
}
