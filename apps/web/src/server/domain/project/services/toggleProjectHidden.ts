import type { Project } from "@/shared/types/project.types";
import { updateProject } from "./updateProject";

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
