import type { Project } from "@/shared/types/project.types";
import { updateProject } from "./updateProject";

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
