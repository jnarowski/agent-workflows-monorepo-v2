import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { prisma } from "@/shared/prisma";
import { Channels } from "@/shared/websocket/channels";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import type { RuntimeContext } from "../../types";
import type { ArtifactStepConfig, ArtifactStepResult } from "@sourceborn/workflow-sdk";
import { executeStep } from "./helpers";

/**
 * Create artifact step factory function
 * Uploads files, directories, or text content as workflow artifacts
 */
export function createArtifactStep(context: RuntimeContext) {
  return async function artifact(
    name: string,
    config: ArtifactStepConfig
  ): Promise<ArtifactStepResult> {
    return executeStep(context, name, async () => {
      const { executionId, projectId, logger } = context;
      const artifactIds: string[] = [];
      let totalSize = 0;

      // Get step ID for linking
      const step = await prisma.workflowExecutionStep.findFirst({
        where: {
          workflow_execution_id: executionId,
          name,
        },
      });

      if (!step) {
        throw new Error(`Step not found: ${name}`);
      }

      switch (config.type) {
        case "text": {
          if (!config.content) {
            throw new Error("Content is required for text artifact");
          }
          const artifact = await prisma.workflowArtifact.create({
            data: {
              workflow_execution_step_id: step.id,
              name: config.name,
              file_type: "text",
              file_path: null,
              content: config.content,
              size: Buffer.byteLength(config.content, "utf8"),
            },
          });
          artifactIds.push(artifact.id);
          totalSize += artifact.size;
          break;
        }

        case "file":
        case "image": {
          if (!config.file) {
            throw new Error("File path is required for file/image artifact");
          }
          const content = await readFile(config.file);
          const fileStats = await stat(config.file);
          const artifact = await prisma.workflowArtifact.create({
            data: {
              workflow_execution_step_id: step.id,
              name: config.name,
              file_type: config.type,
              file_path: config.file,
              content: content.toString("base64"),
              size: fileStats.size,
            },
          });
          artifactIds.push(artifact.id);
          totalSize += artifact.size;
          break;
        }

        case "directory": {
          if (!config.directory) {
            throw new Error("Directory path is required for directory artifact");
          }
          const files = await collectFilesRecursively(
            config.directory,
            config.pattern ?? "**/*"
          );
          for (const file of files) {
            const content = await readFile(file);
            const fileStats = await stat(file);
            const relativePath = relative(config.directory, file);
            const artifact = await prisma.workflowArtifact.create({
              data: {
                workflow_execution_step_id: step.id,
                name: `${config.name}/${relativePath}`,
                file_type: "file",
                file_path: file,
                content: content.toString("base64"),
                size: fileStats.size,
              },
            });
            artifactIds.push(artifact.id);
            totalSize += artifact.size;
          }
          break;
        }
      }

      // Broadcast artifact uploaded event
      broadcast(Channels.project(projectId), {
        type: "workflow:artifact:uploaded",
        data: {
          executionId,
          stepId: step.id,
          artifactIds,
          count: artifactIds.length,
          totalSize,
          timestamp: new Date().toISOString(),
        },
      });

      logger.info(
        { executionId, stepId: step.id, count: artifactIds.length, totalSize },
        "Artifacts uploaded"
      );

      return {
        count: artifactIds.length,
        artifactIds,
        totalSize,
      };
    });
  };
}

async function collectFilesRecursively(
  dir: string,
  pattern: string
): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFilesRecursively(fullPath, pattern)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}
