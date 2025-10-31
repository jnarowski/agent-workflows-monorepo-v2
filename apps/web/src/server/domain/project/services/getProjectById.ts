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
