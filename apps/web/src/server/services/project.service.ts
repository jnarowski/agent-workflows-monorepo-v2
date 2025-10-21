import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "../schemas/project.schema";
import type { Project } from "../../shared/types/project.types";

/**
 * Project Service
 * Handles all business logic and database operations for projects
 */
export class ProjectService {
  /**
   * Get all projects
   * @returns Array of all projects ordered by creation date (newest first)
   */
  async getAllProjects(): Promise<Project[]> {
    return await prisma.project.findMany({
      orderBy: {
        created_at: "desc",
      },
    });
  }

  /**
   * Get a single project by ID
   * @param id - Project ID
   * @returns Project or null if not found
   */
  async getProjectById(id: string): Promise<Project | null> {
    return await prisma.project.findUnique({
      where: { id },
    });
  }

  /**
   * Create a new project
   * @param data - Project creation data
   * @returns Created project
   */
  async createProject(data: CreateProjectInput): Promise<Project> {
    return await prisma.project.create({
      data: {
        name: data.name,
        path: data.path,
      },
    });
  }

  /**
   * Update an existing project
   * @param id - Project ID
   * @param data - Project update data
   * @returns Updated project or null if not found
   */
  async updateProject(
    id: string,
    data: UpdateProjectInput
  ): Promise<Project | null> {
    try {
      return await prisma.project.update({
        where: { id },
        data,
      });
    } catch (error) {
      // Return null if project not found
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return null;
        }
      }
      throw error;
    }
  }

  /**
   * Delete a project
   * @param id - Project ID
   * @returns Deleted project or null if not found
   */
  async deleteProject(id: string): Promise<Project | null> {
    try {
      return await prisma.project.delete({
        where: { id },
      });
    } catch (error) {
      // Return null if project not found
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return null;
        }
      }
      throw error;
    }
  }

  /**
   * Check if a project exists by path
   * @param path - Project path
   * @returns True if project exists
   */
  async projectExistsByPath(path: string): Promise<boolean> {
    const project = await prisma.project.findFirst({
      where: { path },
    });
    return project !== null;
  }
}

// Export a singleton instance
export const projectService = new ProjectService();
