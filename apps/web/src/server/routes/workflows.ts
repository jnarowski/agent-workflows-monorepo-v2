import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createWorkflowExecution,
  getWorkflowExecutionById,
  getWorkflowExecutions,
  executeWorkflow,
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflow,
} from "@/server/domain/workflow/services";
import {
  createWorkflowExecutionSchema,
  workflowExecutionFiltersSchema,
} from "@/server/domain/workflow/schemas";
import { NotFoundError } from "@/server/utils/error";

// Params schema
const executionIdSchema = z.object({
  id: z.cuid(),
});

export async function workflowRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/workflow-executions
   * Create and start a workflow execution
   */
  fastify.post<{
    Body: z.infer<typeof createWorkflowExecutionSchema>;
  }>(
    "/api/workflow-executions",
    {
      preHandler: fastify.authenticate,
      schema: {
        body: createWorkflowExecutionSchema,
      },
    },
    async (request, reply) => {
      const userId = (request.user!.id as string);
      const body = request.body;

      fastify.log.info(
        { userId, workflowDefinitionId: body.workflow_definition_id },
        "Creating workflow execution"
      );

      const execution = await createWorkflowExecution({
        project_id: body.project_id,
        user_id: userId,
        workflow_definition_id: body.workflow_definition_id,
        name: body.name,
        args: body.args,
      });

      if (!execution) {
        throw new NotFoundError('Workflow definition not found');
      }

      // Start execution via orchestrator
      await executeWorkflow(execution.id, fastify.workflowOrchestrator);

      return reply.code(201).send({ data: execution });
    }
  );

  /**
   * GET /api/workflow-executions
   * List workflow executions for a project
   */
  fastify.get<{
    Querystring: z.infer<typeof workflowExecutionFiltersSchema>;
  }>(
    "/api/workflow-executions",
    {
      preHandler: fastify.authenticate,
      schema: {
        querystring: workflowExecutionFiltersSchema,
      },
    },
    async (request, reply) => {
      const userId = (request.user!.id as string);
      const { project_id, status } = request.query;

      if (!project_id) {
        return reply
          .code(400)
          .send({
            error: { message: "project_id is required", statusCode: 400 },
          });
      }

      fastify.log.info(
        { userId, projectId: project_id, status },
        "Fetching workflow executions"
      );

      const executions = await getWorkflowExecutions({
        project_id,
        user_id: userId,
        status,
      });

      return reply.send({ data: executions });
    }
  );

  /**
   * GET /api/workflow-executions/:id
   * Get detailed execution information
   */
  fastify.get<{
    Params: z.infer<typeof executionIdSchema>;
  }>(
    "/api/workflow-executions/:id",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: executionIdSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request.user!.id as string);

      fastify.log.info(
        { userId, executionId: id },
        "Fetching workflow execution"
      );

      const execution = await getWorkflowExecutionById(id);

      if (!execution) {
        throw new NotFoundError("Workflow execution not found");
      }

      // Verify user owns this execution
      if (execution.user_id !== userId) {
        return reply
          .code(403)
          .send({ error: { message: "Access denied", statusCode: 403 } });
      }

      return reply.send({ data: execution });
    }
  );

  /**
   * POST /api/workflow-executions/:id/pause
   * Pause a running workflow execution
   */
  fastify.post<{
    Params: z.infer<typeof executionIdSchema>;
  }>(
    "/api/workflow-executions/:id/pause",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: executionIdSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request.user!.id as string);

      fastify.log.info(
        { userId, executionId: id },
        "Pausing workflow execution"
      );

      const execution = await getWorkflowExecutionById(id);

      if (!execution) {
        throw new NotFoundError("Workflow execution not found");
      }

      if (execution.user_id !== userId) {
        return reply
          .code(403)
          .send({ error: { message: "Access denied", statusCode: 403 } });
      }

      if (execution.status !== "running") {
        return reply
          .code(400)
          .send({
            error: { message: "Execution is not running", statusCode: 400 },
          });
      }

      const updated = await pauseWorkflow(id);

      return reply.send({ data: updated });
    }
  );

  /**
   * POST /api/workflow-executions/:id/resume
   * Resume a paused workflow execution
   */
  fastify.post<{
    Params: z.infer<typeof executionIdSchema>;
  }>(
    "/api/workflow-executions/:id/resume",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: executionIdSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request.user!.id as string);

      fastify.log.info(
        { userId, executionId: id },
        "Resuming workflow execution"
      );

      const execution = await getWorkflowExecutionById(id);

      if (!execution) {
        throw new NotFoundError("Workflow execution not found");
      }

      if (execution.user_id !== userId) {
        return reply
          .code(403)
          .send({ error: { message: "Access denied", statusCode: 403 } });
      }

      if (execution.status !== "paused") {
        return reply
          .code(400)
          .send({
            error: { message: "Execution is not paused", statusCode: 400 },
          });
      }

      const updated = await resumeWorkflow(id, fastify.log);

      return reply.send({ data: updated });
    }
  );

  /**
   * POST /api/workflow-executions/:id/cancel
   * Cancel a workflow execution
   */
  fastify.post<{
    Params: z.infer<typeof executionIdSchema>;
  }>(
    "/api/workflow-executions/:id/cancel",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: executionIdSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request.user!.id as string);

      fastify.log.info(
        { userId, executionId: id },
        "Cancelling workflow execution"
      );

      const execution = await getWorkflowExecutionById(id);

      if (!execution) {
        throw new NotFoundError("Workflow execution not found");
      }

      if (execution.user_id !== userId) {
        return reply
          .code(403)
          .send({ error: { message: "Access denied", statusCode: 403 } });
      }

      const updated = await cancelWorkflow(id);

      return reply.send({ data: updated });
    }
  );
}
