/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/prisma";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "@/server/schemas/project";
import type { Project } from "@/shared/types/project.types";
import { getCurrentBranch } from "@/server/services/git.service";

/**
 * Transform Prisma project to API project format
 * @param prismaProject - Raw project from Prisma
 * @param currentBranch - Optional git branch name
 */
function transformProject(
  prismaProject: any,
  currentBranch?: string | null
): Project {
  return {
    id: prismaProject.id,
    name: prismaProject.name,
    path: prismaProject.path,
    is_hidden: prismaProject.is_hidden,
    created_at: prismaProject.created_at,
    updated_at: prismaProject.updated_at,
    ...(currentBranch !== null && { currentBranch }),
  };
}

/**
 * Get all projects
 * @returns Array of all projects ordered by creation date (newest first)
 */
export async function getAllProjects(): Promise<Project[]> {
  const projects = await prisma.project.findMany({
    orderBy: {
      created_at: "desc",
    },
  });

  // Fetch git branch for each project
  const projectsWithBranch = await Promise.all(
    projects.map(async (p) => {
      const branch = await getCurrentBranch(p.path);
      return transformProject(p, branch);
    })
  );

  return projectsWithBranch;
}

/**
 * Get a single project by ID
 * @param id - Project ID
 * @returns Project or null if not found
 */
export async function getProjectById(id: string): Promise<Project | null> {
  console.log("🔍 [getProjectById] Called for ID:", id);
  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    console.log("❌ [getProjectById] Project not found");
    return null;
  }

  console.log("📁 [getProjectById] Fetching branch for:", project.path);
  // Fetch git branch
  const branch = await getCurrentBranch(project.path);
  console.log("✅ [getProjectById] Branch result:", branch);
  const result = transformProject(project, branch);
  console.log(
    "📦 [getProjectById] Returning project with branch:",
    result.currentBranch
  );
  return result;
}

/**
 * Create a new project
 * @param data - Project creation data
 * @returns Created project
 */
export async function createProject(
  data: CreateProjectInput
): Promise<Project> {
  const project = await prisma.project.create({
    data: {
      name: data.name,
      path: data.path,
    },
  });
  return transformProject(project);
}

/**
 * Update an existing project
 * @param id - Project ID
 * @param data - Project update data
 * @returns Updated project or null if not found
 */
export async function updateProject(
  id: string,
  data: UpdateProjectInput
): Promise<Project | null> {
  try {
    const project = await prisma.project.update({
      where: { id },
      data,
    });
    return transformProject(project);
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
export async function deleteProject(id: string): Promise<Project | null> {
  try {
    const project = await prisma.project.delete({
      where: { id },
    });
    return transformProject(project);
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
 * Toggle the hidden state of a project
 * @param projectId - Project ID
 * @param is_hidden - Whether the project should be hidden
 * @returns Updated project or null if not found
 */
export async function toggleProjectHidden(
  projectId: string,
  is_hidden: boolean
): Promise<Project | null> {
  return await updateProject(projectId, { is_hidden });
}

/**
 * Check if a project exists by path
 * @param path - Project path
 * @returns True if project exists
 */
export async function projectExistsByPath(path: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { path },
  });
  return project !== null;
}

/**
 * Get a project by its path
 * @param path - Project path (case-sensitive match)
 * @returns Project or null if not found
 */
export async function getProjectByPath(path: string): Promise<Project | null> {
  const project = await prisma.project.findFirst({
    where: { path },
  });
  return project ? transformProject(project) : null;
}

/**
 * Create a new project or update an existing one by path
 * Uses upsert to ensure atomic operation and prevent race conditions
 * @param name - Project display name
 * @param path - Project filesystem path
 * @returns Created or updated project
 */
export async function createOrUpdateProject(
  name: string,
  path: string
): Promise<Project> {
  const project = await prisma.project.upsert({
    where: { path },
    update: {
      name,
      updated_at: new Date(),
    },
    create: {
      name,
      path,
    },
  });
  return transformProject(project);
}
