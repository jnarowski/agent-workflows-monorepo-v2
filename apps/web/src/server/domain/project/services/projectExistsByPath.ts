import { prisma } from "@/shared/prisma";

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
