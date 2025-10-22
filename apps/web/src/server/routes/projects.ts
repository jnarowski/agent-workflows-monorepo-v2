import type { FastifyInstance } from "fastify";
import { projectService } from "../services/project.service";
import { projectSyncService } from "../services/project-sync.service";
import { FileService } from "../services/file.service";
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdSchema,
  fileContentQuerySchema,
  fileContentBodySchema,
} from "../schemas/project.schema";
import {
  projectsResponseSchema,
  projectResponseSchema,
  errorResponse,
  fileTreeResponseSchema,
  fileContentResponseSchema,
  fileContentSaveResponseSchema,
  projectSyncResponseSchema,
} from "../schemas/response.schema";
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
} from "../../shared/types/project.types";

export async function projectRoutes(fastify: FastifyInstance) {
  // Create file service with logger
  const fileService = new FileService(fastify.log);

  /**
   * GET /api/projects
   * Get all projects
   */
  fastify.get(
    "/api/projects",
    {
      preHandler: fastify.authenticate,
      schema: {
        response: {
          200: projectsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const projects = await projectService.getAllProjects();
      return reply.send({ data: projects });
    }
  );

  /**
   * POST /api/projects/sync
   * Sync projects from ~/.claude/projects/ directory
   */
  fastify.post(
    "/api/projects/sync",
    {
      preHandler: fastify.authenticate,
      schema: {
        response: {
          200: projectSyncResponseSchema,
          401: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user?.id;

        if (!userId) {
          return reply.code(401).send({
            error: {
              message: "Unauthorized",
              statusCode: 401,
            },
          });
        }

        const syncResults = await projectSyncService.syncFromClaudeProjects(
          userId
        );

        return reply.send({ data: syncResults });
      } catch (error) {
        fastify.log.error({ error }, "Error syncing projects");
        return reply.code(500).send({
          error: {
            message: "Failed to sync projects",
            statusCode: 500,
          },
        });
      }
    }
  );

  /**
   * GET /api/projects/:id
   * Get a single project by ID
   */
  fastify.get<{
    Params: { id: string };
  }>(
    "/api/projects/:id",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        response: {
          200: projectResponseSchema,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const project = await projectService.getProjectById(request.params.id);

      if (!project) {
        return reply.code(404).send({
          error: {
            message: "Project not found",
            statusCode: 404,
          },
        });
      }

      return reply.send({ data: project });
    }
  );

  /**
   * POST /api/projects
   * Create a new project
   */
  fastify.post<{
    Body: CreateProjectRequest;
  }>(
    "/api/projects",
    {
      preHandler: fastify.authenticate,
      schema: {
        body: createProjectSchema,
        response: {
          201: projectResponseSchema,
          409: errorResponse,
        },
      },
    },
    async (request, reply) => {
      // Check if project with same path already exists
      const exists = await projectService.projectExistsByPath(request.body.path);
      if (exists) {
        return reply.code(409).send({
          error: {
            message: "A project with this path already exists",
            code: "PROJECT_EXISTS",
            statusCode: 409,
          },
        });
      }

      const project = await projectService.createProject(request.body);
      return reply.code(201).send({ data: project });
    }
  );

  /**
   * PATCH /api/projects/:id
   * Update an existing project
   */
  fastify.patch<{
    Params: { id: string };
    Body: UpdateProjectRequest;
  }>(
    "/api/projects/:id",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        body: updateProjectSchema,
        response: {
          200: projectResponseSchema,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      // Check if body is empty
      if (Object.keys(request.body).length === 0) {
        return reply.code(400).send({
          error: {
            message: "At least one field must be provided for update",
            code: "VALIDATION_ERROR",
            statusCode: 400,
          },
        });
      }

      const project = await projectService.updateProject(
        request.params.id,
        request.body
      );

      if (!project) {
        return reply.code(404).send({
          error: {
            message: "Project not found",
            statusCode: 404,
          },
        });
      }

      return reply.send({ data: project });
    }
  );

  /**
   * DELETE /api/projects/:id
   * Delete a project
   */
  fastify.delete<{
    Params: { id: string };
  }>(
    "/api/projects/:id",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        response: {
          200: projectResponseSchema,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const project = await projectService.deleteProject(request.params.id);

      if (!project) {
        return reply.code(404).send({
          error: {
            message: "Project not found",
            statusCode: 404,
          },
        });
      }

      return reply.send({ data: project });
    }
  );

  /**
   * GET /api/projects/:id/files
   * Get file tree for a project
   */
  fastify.get<{
    Params: { id: string };
  }>(
    "/api/projects/:id/files",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        response: {
          200: fileTreeResponseSchema,
          403: errorResponse,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const files = await fileService.getProjectFiles(request.params.id);
        return reply.send({ data: files });
      } catch (error) {
        // Handle specific error messages
        const errorMessage = (error as Error).message;
        if (errorMessage === 'Project not found') {
          return reply.code(404).send({
            error: {
              message: "Project not found",
              statusCode: 404,
            },
          });
        }
        if (errorMessage === 'Project path is not accessible') {
          return reply.code(403).send({
            error: {
              message: "Project path is not accessible",
              statusCode: 403,
            },
          });
        }

        throw error;
      }
    }
  );

  /**
   * GET /api/projects/:id/files/content
   * Get file content
   */
  fastify.get<{
    Params: { id: string };
    Querystring: { path: string };
  }>(
    "/api/projects/:id/files/content",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        querystring: fileContentQuerySchema,
        response: {
          200: fileContentResponseSchema,
          403: errorResponse,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const content = await fileService.readFile(
          request.params.id,
          request.query.path
        );
        return reply.send({ content });
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (errorMessage === "Project not found") {
          return reply.code(404).send({
            error: {
              message: "Project not found",
              statusCode: 404,
            },
          });
        }
        if (
          errorMessage === "File not found or not accessible" ||
          errorMessage === "Access denied: File is outside project directory"
        ) {
          return reply.code(403).send({
            error: {
              message: errorMessage,
              statusCode: 403,
            },
          });
        }

        throw error;
      }
    }
  );

  /**
   * POST /api/projects/:id/files/content
   * Save file content
   */
  fastify.post<{
    Params: { id: string };
    Body: { path: string; content: string };
  }>(
    "/api/projects/:id/files/content",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        body: fileContentBodySchema,
        response: {
          200: fileContentSaveResponseSchema,
          403: errorResponse,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        await fileService.writeFile(
          request.params.id,
          request.body.path,
          request.body.content
        );
        return reply.send({ success: true });
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (errorMessage === "Project not found") {
          return reply.code(404).send({
            error: {
              message: "Project not found",
              statusCode: 404,
            },
          });
        }
        if (errorMessage === "Access denied: File is outside project directory") {
          return reply.code(403).send({
            error: {
              message: errorMessage,
              statusCode: 403,
            },
          });
        }

        throw error;
      }
    }
  );
}
