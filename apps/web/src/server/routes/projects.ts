import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { projectService } from "../services/project.service";
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdSchema,
} from "../schemas/project.schema";
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
} from "../../shared/types/project.types";

// Authentication middleware (imported from auth routes pattern)
async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.code(401).send({ error: "Invalid or missing token" });
  }
}

export async function projectRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/projects
   * Get all projects
   */
  fastify.get(
    "/api/projects",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        const projects = await projectService.getAllProjects();
        return reply.send({ data: projects });
      } catch (error) {
        fastify.log.error("Error fetching projects:", error);
        return reply
          .code(500)
          .send({ error: "Failed to fetch projects" });
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
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        // Validate project ID
        const validation = projectIdSchema.safeParse(request.params);
        if (!validation.success) {
          return reply.code(400).send({
            error: "Invalid project ID",
            message: validation.error.issues[0].message,
          });
        }

        const project = await projectService.getProjectById(request.params.id);

        if (!project) {
          return reply.code(404).send({ error: "Project not found" });
        }

        return reply.send({ data: project });
      } catch (error) {
        fastify.log.error("Error fetching project:", error);
        return reply.code(500).send({ error: "Failed to fetch project" });
      }
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
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        // Validate request body
        const validation = createProjectSchema.safeParse(request.body);
        if (!validation.success) {
          return reply.code(400).send({
            error: "Validation error",
            message: validation.error.issues[0].message,
          });
        }

        // Check if project with same path already exists
        const exists = await projectService.projectExistsByPath(
          validation.data.path
        );
        if (exists) {
          return reply.code(409).send({
            error: "Project already exists",
            message: "A project with this path already exists",
          });
        }

        const project = await projectService.createProject(validation.data);

        return reply.code(201).send({ data: project });
      } catch (error) {
        fastify.log.error("Error creating project:", error);
        return reply.code(500).send({ error: "Failed to create project" });
      }
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
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        // Validate project ID
        const idValidation = projectIdSchema.safeParse(request.params);
        if (!idValidation.success) {
          return reply.code(400).send({
            error: "Invalid project ID",
            message: idValidation.error.issues[0].message,
          });
        }

        // Validate request body
        const bodyValidation = updateProjectSchema.safeParse(request.body);
        if (!bodyValidation.success) {
          return reply.code(400).send({
            error: "Validation error",
            message: bodyValidation.error.issues[0].message,
          });
        }

        // Check if body is empty
        if (Object.keys(bodyValidation.data).length === 0) {
          return reply.code(400).send({
            error: "Validation error",
            message: "At least one field must be provided for update",
          });
        }

        const project = await projectService.updateProject(
          request.params.id,
          bodyValidation.data
        );

        if (!project) {
          return reply.code(404).send({ error: "Project not found" });
        }

        return reply.send({ data: project });
      } catch (error) {
        fastify.log.error("Error updating project:", error);
        return reply.code(500).send({ error: "Failed to update project" });
      }
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
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        // Validate project ID
        const validation = projectIdSchema.safeParse(request.params);
        if (!validation.success) {
          return reply.code(400).send({
            error: "Invalid project ID",
            message: validation.error.issues[0].message,
          });
        }

        const project = await projectService.deleteProject(request.params.id);

        if (!project) {
          return reply.code(404).send({ error: "Project not found" });
        }

        return reply.send({ data: project });
      } catch (error) {
        fastify.log.error("Error deleting project:", error);
        return reply.code(500).send({ error: "Failed to delete project" });
      }
    }
  );
}
