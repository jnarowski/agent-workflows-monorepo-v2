import { readdir, stat, writeFile, mkdir, copyFile } from "node:fs/promises";
import { join, relative, extname, dirname } from "node:path";
import { Channels } from "@/shared/websocket/channels";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import type { RuntimeContext } from "../../../types/engine.types";
import type {
  ArtifactStepConfig,
  ArtifactStepResult,
} from "@repo/workflow-sdk";
import { executeStep } from "./executeStep";
import { findWorkflowStepByName } from "../../steps/findWorkflowStepByName";
import { createWorkflowArtifact } from "../../artifacts/createWorkflowArtifact";

/**
 * Get MIME type from file extension
 */
function getMimeType(
  filename: string,
  defaultType = "application/octet-stream"
): string {
  const ext = extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".json": "application/json",
    ".js": "text/javascript",
    ".ts": "text/typescript",
    ".html": "text/html",
    ".css": "text/css",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
  };
  return mimeTypes[ext] || defaultType;
}

/**
 * Create artifact step factory function
 * Uploads files, directories, or text content as workflow artifacts
 * Artifacts are stored in: {projectPath}/.agent/workflows/executions/{executionId}/artifacts
 */
export function createArtifactStep(context: RuntimeContext) {
  return async function artifact(
    name: string,
    config: ArtifactStepConfig
  ): Promise<ArtifactStepResult> {
    return executeStep(context, name, async () => {
      const { executionId, projectId, projectPath, currentPhase, logger } = context;
      const artifactIds: string[] = [];
      let totalSize = 0;

      // Get step ID for linking using domain service
      const step = await findWorkflowStepByName(executionId, name, undefined, logger);

      if (!step) {
        throw new Error(`Step not found: ${name}`);
      }

      // Create artifacts directory: {projectPath}/.agent/workflows/executions/{executionId}/artifacts
      const artifactsDir = join(
        projectPath,
        ".agent",
        "workflows",
        "executions",
        executionId,
        "artifacts"
      );
      await mkdir(artifactsDir, { recursive: true });

      switch (config.type) {
        case "text": {
          if (!config.content) {
            throw new Error("Content is required for text artifact");
          }
          // Write text content to artifacts directory
          const artifactPath = join(artifactsDir, config.name);
          await mkdir(dirname(artifactPath), { recursive: true });
          await writeFile(artifactPath, config.content, "utf8");

          const sizeBytes = Buffer.byteLength(config.content, "utf8");
          const relativePath = relative(projectPath, artifactPath);

          // Create artifact using domain service
          const artifact = await createWorkflowArtifact(
            step.id,
            {
              name: config.name,
              file_type: "text",
              file_path: relativePath, // Relative to project root
              mime_type: getMimeType(config.name, "text/plain"),
              size_bytes: sizeBytes,
              phase: currentPhase,
            },
            logger
          );
          artifactIds.push(artifact.id);
          totalSize += sizeBytes;
          break;
        }

        case "file":
        case "image": {
          if (!config.file) {
            throw new Error("File path is required for file/image artifact");
          }
          // Copy file to artifacts directory
          const artifactPath = join(artifactsDir, config.name);
          await mkdir(dirname(artifactPath), { recursive: true });
          await copyFile(config.file, artifactPath);

          const fileStats = await stat(artifactPath);
          const relativePath = relative(projectPath, artifactPath);

          // Create artifact using domain service
          const artifact = await createWorkflowArtifact(
            step.id,
            {
              name: config.name,
              file_type: config.type,
              file_path: relativePath, // Relative to project root
              mime_type: getMimeType(config.file),
              size_bytes: fileStats.size,
              phase: currentPhase,
            },
            logger
          );
          artifactIds.push(artifact.id);
          totalSize += fileStats.size;
          break;
        }

        case "directory": {
          if (!config.directory) {
            throw new Error(
              "Directory path is required for directory artifact"
            );
          }
          const files = await collectFilesRecursively(
            config.directory,
            config.pattern ?? "**/*"
          );

          // Copy all files to artifacts directory preserving structure
          for (const file of files) {
            const relativeToSource = relative(config.directory, file);
            const artifactPath = join(
              artifactsDir,
              config.name,
              relativeToSource
            );
            await mkdir(dirname(artifactPath), { recursive: true });
            await copyFile(file, artifactPath);

            const fileStats = await stat(artifactPath);
            const relativeToProject = relative(projectPath, artifactPath);

            // Create artifact using domain service
            const artifact = await createWorkflowArtifact(
              step.id,
              {
                name: `${config.name}/${relativeToSource}`,
                file_type: "file",
                file_path: relativeToProject, // Relative to project root
                mime_type: getMimeType(file),
                size_bytes: fileStats.size,
                phase: currentPhase,
              },
              logger
            );
            artifactIds.push(artifact.id);
            totalSize += fileStats.size;
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
