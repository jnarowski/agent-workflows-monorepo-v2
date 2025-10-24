/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import type { FastifyInstance } from "fastify";
import {
  getSessionsByProject,
  getSessionMessages,
  createSession,
  syncProjectSessions,
} from "@/server/services/agentSession";
import {
  createSessionSchema,
  sessionIdSchema,
  projectIdSchema,
} from "@/server/schemas/session";
import { errorResponse } from "@/server/schemas/response";
import type { CreateSessionRequest } from "@/shared/types/agent-session.types";
import { buildErrorResponse } from "@/server/utils/error";

export async function sessionRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/projects/:id/sessions
   * Get all sessions for a project
   */
  fastify.get<{
    Params: { id: string };
  }>(
    "/api/projects/:id/sessions",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
      },
    },
    async (request, reply) => {
      // Get userId from JWT token
      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      const sessions = await getSessionsByProject(
        request.params.id,
        userId
      );

      return reply.send({ data: sessions });
    }
  );

  /**
   * GET /api/projects/:id/sessions/:sessionId/messages
   * Get messages for a specific session
   */
  fastify.get<{
    Params: { id: string; sessionId: string };
  }>(
    "/api/projects/:id/sessions/:sessionId/messages",
    {
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      try {
        const messages = await getSessionMessages(
          request.params.sessionId,
          userId
        );

        return reply.send({ data: messages });
      } catch (error: any) {
        fastify.log.error({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          sessionId: request.params.sessionId,
          projectId: request.params.id,
          userId
        }, 'Error fetching session messages');

        if (
          error.message === "Session not found" ||
          error.message === "Session file not found"
        ) {
          return reply.code(404).send(buildErrorResponse(404, error.message));
        }

        if (error.message === "Unauthorized access to session") {
          return reply.code(401).send(buildErrorResponse(401, "Unauthorized access to session"));
        }

        // Catch all other errors
        return reply.code(500).send(buildErrorResponse(500, error.message || 'Internal server error'));
      }
    }
  );

  /**
   * POST /api/projects/:id/sessions
   * Create a new session
   */
  fastify.post<{
    Params: { id: string };
    Body: CreateSessionRequest;
  }>(
    "/api/projects/:id/sessions",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        body: createSessionSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      fastify.log.info({
        projectId: request.params.id,
        userId,
        sessionId: request.body.sessionId,
      }, 'Creating session');

      const session = await createSession(
        request.params.id,
        userId,
        request.body.sessionId
      );

      fastify.log.info({ sessionId: session.id }, 'Session created successfully');

      return reply.code(201).send({ data: session });
    }
  );

  /**
   * POST /api/projects/:id/sessions/sync
   * Sync sessions from filesystem for a project
   */
  fastify.post<{
    Params: { id: string };
  }>(
    "/api/projects/:id/sessions/sync",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      try {
        const result = await syncProjectSessions(
          request.params.id,
          userId
        );

        return reply.send({ data: result });
      } catch (error: any) {
        if (error.message.includes("Project not found")) {
          return reply.code(404).send(buildErrorResponse(404, "Project not found"));
        }

        throw error;
      }
    }
  );
}
