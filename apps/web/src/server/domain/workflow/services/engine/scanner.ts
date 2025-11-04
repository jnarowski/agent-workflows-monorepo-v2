import { prisma } from "@/shared/prisma";
import { loadProjectWorkflows } from "./loader";
import type { WorkflowRuntime } from "@repo/workflow-sdk";
import type { FastifyBaseLogger } from "fastify";
import type { FastifyInstance } from "fastify";

/**
 * Scan result for workflow discovery
 */
export interface ScanResult {
  /** Number of projects scanned */
  scanned: number;
  /** Number of workflows discovered */
  discovered: number;
  /** Errors encountered during scanning */
  errors: Array<{ projectId: string; error: string }>;
}

/**
 * Scan a single project for workflows and create/update WorkflowDefinition records
 *
 * @param projectId - Project ID
 * @param projectPath - Project filesystem path
 * @param runtime - Workflow runtime adapter
 * @param logger - Logger instance
 * @returns Number of workflows discovered
 */
export async function scanProjectWorkflows(
  projectId: string,
  projectPath: string,
  runtime: WorkflowRuntime,
  logger: FastifyBaseLogger
): Promise<number> {
  logger.info({ projectId, projectPath }, "Scanning project for workflows");

  // Load workflows from project
  const workflows = await loadProjectWorkflows(projectPath, runtime, logger);

  // Create or update WorkflowDefinition records
  for (const { definition, filePath } of workflows) {
    const { config } = definition;

    await prisma.workflowDefinition.upsert({
      where: {
        project_id_identifier: {
          project_id: projectId,
          identifier: config.id,
        },
      },
      create: {
        project_id: projectId,
        identifier: config.id,
        name: config.name ?? config.id, // Use display name or fallback to identifier
        description: config.description ?? null,
        type: "code",
        path: filePath,
        phases: config.phases ?? [],
      },
      update: {
        name: config.name ?? config.id,
        description: config.description ?? null,
        path: filePath,
        phases: config.phases ?? [],
        updated_at: new Date(),
      },
    });

    logger.info(
      { projectId, workflowId: config.id, filePath },
      "Created/updated workflow definition"
    );
  }

  return workflows.length;
}

/**
 * Scan all projects for workflows
 *
 * @param fastify - Fastify instance (for accessing workflowClient)
 * @returns Scan result summary
 */
export async function scanAllProjectWorkflows(
  fastify: FastifyInstance
): Promise<ScanResult> {
  const logger = fastify.log;
  const runtime = fastify.workflowRuntime;

  if (!runtime) {
    throw new Error("Workflow runtime not initialized");
  }

  logger.info("Scanning all projects for workflows");

  // Load all projects from database
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      path: true,
      name: true,
    },
  });

  const result: ScanResult = {
    scanned: 0,
    discovered: 0,
    errors: [],
  };

  // Scan each project
  for (const project of projects) {
    try {
      const count = await scanProjectWorkflows(
        project.id,
        project.path,
        runtime,
        logger
      );
      result.scanned++;
      result.discovered += count;
    } catch (error) {
      logger.error(
        {
          projectId: project.id,
          projectName: project.name,
          error: (error as Error).message,
        },
        "Failed to scan project"
      );
      result.errors.push({
        projectId: project.id,
        error: (error as Error).message,
      });
    }
  }

  logger.info(result, "Completed workflow scanning");

  return result;
}
