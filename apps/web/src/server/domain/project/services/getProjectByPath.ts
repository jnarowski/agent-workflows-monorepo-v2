/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/shared/prisma";
import type { Project } from "@/shared/types/project.types";
import { getCurrentBranch } from "@/server/domain/git/services/getCurrentBranch";

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
  const currentBranch = await getCurrentBranch({ projectPath: project.path });
  return transformProject(project, currentBranch);
}
