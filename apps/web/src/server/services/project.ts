/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/prisma";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "@/server/schemas/project";
import type {
  Project,
  ProjectWithSessions,
} from "@/shared/types/project.types";
import type { SessionResponse } from "@/shared/types/agent-session.types";
import { getCurrentBranch } from "@/server/services/git.service";

/**
 * Transform Prisma session to API session format
 * @param prismaSession - Raw session from Prisma
 */
function transformSession(prismaSession: any): SessionResponse {
  return {
    id: prismaSession.id,
    projectId: prismaSession.projectId,
    userId: prismaSession.userId,
    name: prismaSession.name,
    agent: prismaSession.agent,
    cli_session_id: prismaSession.cli_session_id,
    session_path: prismaSession.session_path,
    metadata: prismaSession.metadata,
    created_at: prismaSession.created_at,
    updated_at: prismaSession.updated_at,
  };
}

/**
 * Transform Prisma project to API project format
 * @param prismaProject - Raw project from Prisma
 * @param currentBranch - Optional git branch (fetched separately)
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
    is_starred: prismaProject.is_starred,
    created_at: prismaProject.created_at,
    updated_at: prismaProject.updated_at,
    current_branch: currentBranch ?? undefined,
  };
}

/**
 * Transform Prisma project with sessions to API format
 * @param prismaProject - Raw project from Prisma with sessions
 * @param currentBranch - Optional git branch (fetched separately)
 */
function transformProjectWithSessions(
  prismaProject: any,
  currentBranch?: string | null
): ProjectWithSessions {
  return {
    ...transformProject(prismaProject, currentBranch),
    sessions: prismaProject.sessions
      ? prismaProject.sessions.map(transformSession)
      : [],
  };
}

/**
 * Get all projects (with optional sessions)
 * @param options - Options for fetching projects
 * @param options.includeSessions - Whether to include sessions
 * @param options.sessionLimit - Maximum number of sessions per project (default: 20)
 * @returns Array of all projects ordered by creation date (newest first)
 */
export async function getAllProjects(options?: {
  includeSessions?: boolean;
  sessionLimit?: number;
}): Promise<Project[] | ProjectWithSessions[]> {
  const { includeSessions = false, sessionLimit = 20 } = options || {};

  const projects = await prisma.project.findMany({
    orderBy: {
      created_at: "desc",
    },
    take: 500,
    ...(includeSessions && {
      include: {
        sessions: {
          orderBy: {
            created_at: "desc",
          },
          take: sessionLimit,
          select: {
            id: true,
            projectId: true,
            userId: true,
            name: true,
            agent: true,
            cli_session_id: true,
            session_path: true,
            metadata: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    }),
  });

  // Fetch current branch for each project
  const projectsWithBranches = await Promise.all(
    projects.map(async (project) => {
      const currentBranch = await getCurrentBranch(project.path);
      return { project, currentBranch };
    })
  );

  if (includeSessions) {
    return projectsWithBranches.map(({ project, currentBranch }) =>
      transformProjectWithSessions(project, currentBranch)
    );
  }

  return projectsWithBranches.map(({ project, currentBranch }) =>
    transformProject(project, currentBranch)
  );
}

/**
 * Get a single project by ID
 * @param id - Project ID
 * @returns Project or null if not found
 */
export async function getProjectById(id: string): Promise<Project | null> {
  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    return null;
  }

  const currentBranch = await getCurrentBranch(project.path);
  return transformProject(project, currentBranch);
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
  const currentBranch = await getCurrentBranch(project.path);
  return transformProject(project, currentBranch);
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
    const currentBranch = await getCurrentBranch(project.path);
    return transformProject(project, currentBranch);
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
    const currentBranch = await getCurrentBranch(project.path);
    return transformProject(project, currentBranch);
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
 * Toggle the starred state of a project
 * @param projectId - Project ID
 * @param is_starred - Whether the project should be starred
 * @returns Updated project or null if not found
 */
export async function toggleProjectStarred(
  projectId: string,
  is_starred: boolean
): Promise<Project | null> {
  return await updateProject(projectId, { is_starred });
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
  if (!project) {
    return null;
  }
  const currentBranch = await getCurrentBranch(project.path);
  return transformProject(project, currentBranch);
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
  const currentBranch = await getCurrentBranch(project.path);
  return transformProject(project, currentBranch);
}
