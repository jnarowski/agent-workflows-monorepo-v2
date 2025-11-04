import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { WorkflowDefinition } from "@repo/workflow-sdk";
import type { WorkflowRuntime } from "@repo/workflow-sdk";
import type { InngestFunction } from "inngest";
import type { FastifyBaseLogger } from "fastify";

/**
 * Find all workflow files in a directory (recursive)
 * @param dir - Directory to search
 * @returns Array of file paths
 */
export async function findWorkflowFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recurse into subdirectories
        files.push(...(await findWorkflowFiles(fullPath)));
      } else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) {
        // Include .ts and .js files
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or not readable
    return [];
  }

  return files;
}

/**
 * Extract workflow definition from a module
 * Supports multiple export patterns:
 * - export default defineWorkflow(...)
 * - export const workflow = defineWorkflow(...)
 * - export const createWorkflow = defineWorkflow(...)
 *
 * @param module - Imported module
 * @returns WorkflowDefinition or null
 */
export function extractWorkflowDefinition(
  module: Record<string, unknown>
): WorkflowDefinition | null {
  // Check default export
  if (module.default && isWorkflowDefinition(module.default)) {
    return module.default;
  }

  // Check named exports
  for (const key of Object.keys(module)) {
    if (isWorkflowDefinition(module[key])) {
      return module[key];
    }
  }

  return null;
}

/**
 * Check if an object is a workflow definition
 */
function isWorkflowDefinition(obj: unknown): obj is WorkflowDefinition {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "__type" in obj &&
    obj.__type === "workflow" &&
    "createInngestFunction" in obj &&
    typeof obj.createInngestFunction === "function"
  );
}

/**
 * Load workflows from a project's .agent/workflows/definitions/ directory
 *
 * @param projectPath - Project filesystem path
 * @param runtime - Workflow runtime adapter
 * @param logger - Logger instance
 * @returns Array of Inngest functions
 */
export async function loadProjectWorkflows(
  projectPath: string,
  runtime: WorkflowRuntime,
  logger: FastifyBaseLogger
): Promise<
  Array<{
    definition: WorkflowDefinition;
    inngestFunction: InngestFunction<Record<string, unknown>, Record<string, unknown>>;
    filePath: string;
  }>
> {
  const workflowsDir = join(projectPath, ".agent/workflows/definitions");
  const results: Array<{
    definition: WorkflowDefinition;
    inngestFunction: InngestFunction<Record<string, unknown>, Record<string, unknown>>;
    filePath: string;
  }> = [];

  // Check if .agent/workflows/definitions directory exists
  try {
    const dirStat = await stat(workflowsDir);
    if (!dirStat.isDirectory()) {
      logger.debug(
        { projectPath },
        "No .agent/workflows/definitions directory found"
      );
      return results;
    }
  } catch {
    // Directory doesn't exist
    logger.debug(
      { projectPath },
      "No .agent/workflows/definitions directory found"
    );
    return results;
  }

  // Find all workflow files
  const files = await findWorkflowFiles(workflowsDir);
  logger.debug(
    { projectPath, filesFound: files.length },
    "Found workflow files"
  );

  // Load each file
  for (const file of files) {
    try {
      // Dynamic import with file URL
      const fileUrl = pathToFileURL(file).href;
      const module = await import(fileUrl);

      // Extract workflow definition
      const definition = extractWorkflowDefinition(module);

      if (definition) {
        // Create Inngest function with runtime
        const inngestFunction = definition.createInngestFunction(runtime);

        results.push({
          definition,
          inngestFunction,
          filePath: file,
        });

        logger.info(
          { file, workflowId: definition.config.id },
          "Loaded workflow"
        );
      } else {
        logger.warn(
          { file },
          "File does not export a valid workflow definition"
        );
      }
    } catch (error) {
      logger.error(
        { file, error: (error as Error).message },
        "Failed to load workflow file"
      );
    }
  }

  return results;
}
