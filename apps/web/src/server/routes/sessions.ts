import type { FastifyInstance } from 'fastify';
import { agentSessionService } from '../services/agent-session.service';
import {
  createSessionSchema,
  sessionIdSchema,
  projectIdSchema,
} from '../schemas/session.schema';
import { errorResponse } from '../schemas/response.schema';
import type { CreateSessionRequest } from '../../shared/types/agent-session.types';

export async function sessionRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/projects/:id/sessions
   * Get all sessions for a project
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/api/projects/:id/sessions',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                },
              },
            },
          },
          401: errorResponse,
        },
      },
    },
    async (request, reply) => {
      // Get userId from JWT token
      const userId = request.user?.userId;
      if (!userId) {
        return reply.code(401).send({
          error: {
            message: 'Unauthorized',
            statusCode: 401,
          },
        });
      }

      const sessions = await agentSessionService.getSessionsByProject(
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
    '/api/projects/:id/sessions/:sessionId/messages',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            sessionId: { type: 'string', format: 'uuid' },
          },
          required: ['id', 'sessionId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                },
              },
            },
          },
          401: errorResponse,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.code(401).send({
          error: {
            message: 'Unauthorized',
            statusCode: 401,
          },
        });
      }

      try {
        const messages = await agentSessionService.getSessionMessages(
          request.params.sessionId,
          userId
        );

        return reply.send({ data: messages });
      } catch (error: any) {
        if (
          error.message === 'Session not found' ||
          error.message === 'Session file not found'
        ) {
          return reply.code(404).send({
            error: {
              message: error.message,
              statusCode: 404,
            },
          });
        }

        if (error.message === 'Unauthorized access to session') {
          return reply.code(401).send({
            error: {
              message: 'Unauthorized access to session',
              statusCode: 401,
            },
          });
        }

        throw error;
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
    '/api/projects/:id/sessions',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        body: createSessionSchema,
        response: {
          201: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
              },
            },
          },
          401: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.code(401).send({
          error: {
            message: 'Unauthorized',
            statusCode: 401,
          },
        });
      }

      const session = await agentSessionService.createSession(
        request.params.id,
        userId,
        request.body.sessionId
      );

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
    '/api/projects/:id/sessions/sync',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  synced: { type: 'number' },
                  created: { type: 'number' },
                  updated: { type: 'number' },
                },
              },
            },
          },
          401: errorResponse,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.code(401).send({
          error: {
            message: 'Unauthorized',
            statusCode: 401,
          },
        });
      }

      try {
        const result = await agentSessionService.syncProjectSessions(
          request.params.id,
          userId
        );

        return reply.send({ data: result });
      } catch (error: any) {
        if (error.message.includes('Project not found')) {
          return reply.code(404).send({
            error: {
              message: 'Project not found',
              statusCode: 404,
            },
          });
        }

        throw error;
      }
    }
  );
}
