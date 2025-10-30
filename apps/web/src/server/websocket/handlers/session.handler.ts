import type { WebSocket } from "@fastify/websocket";
import type { FastifyInstance, FastifyBaseLogger } from "fastify";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/shared/prisma";
import { generateSessionName } from "@/server/utils/generateSessionName";
import type { SessionSendMessageData } from "../types.js";
import { sendMessage } from "../utils/send-message.js";
import { extractId } from "../utils/extract-id.js";
import { cleanupTempDir } from "../utils/cleanup.js";
import { activeSessions } from "../utils/active-sessions.js";
import { validateSessionOwnership } from "../services/session-validator.js";
import { extractUsageFromEvents } from "../services/usage-extractor.js";
import { executeAgentCommand, type AgentExecuteResult } from "../services/agent-executor.js";

// ============================================================================
// Types
// ============================================================================

interface ExecutionConfig {
  resume: boolean;
  permissionMode: "default" | "acceptEdits" | "bypassPermissions" | undefined;
  model: string | undefined;
}

interface ImageProcessingResult {
  imagePaths: string[];
  tempImageDir?: string;
}

// ============================================================================
// Public API - Session Event Handlers
// ============================================================================

/**
 * Handle session send_message event
 *
 * Main entry point for processing user messages sent to an agent session.
 * Orchestrates the entire message handling flow including image uploads,
 * agent execution, and post-processing tasks.
 */
export async function handleSessionSendMessage(
  socket: WebSocket,
  sessionId: string,
  data: SessionSendMessageData,
  userId: string,
  fastify: FastifyInstance
): Promise<void> {
  // Verify user owns session
  const session = await validateSessionOwnership(sessionId, userId);
  const projectPath = session.project.path;

  // Get or create session data for temp image tracking
  const sessionData = activeSessions.getOrCreate(sessionId, {
    projectPath,
    userId,
  });

  // Process image uploads
  const { imagePaths } = await processImageUploads(
    data.images,
    sessionData.projectPath,
    sessionId
  );

  // Validate agent is supported
  if (!isAgentSupported(session.agent)) {
    sendMessage(socket, `session.${sessionId}.error`, {
      error: `Agent type '${session.agent}' is not yet implemented`,
      code: "UNSUPPORTED_AGENT",
    });
    await cleanupSessionImages(sessionId, fastify.log);
    return;
  }

  // Parse execution configuration
  const config = parseExecutionConfig(data.config);

  // Determine session ID to use (CLI session ID or database ID)
  const cliSessionId = session.cli_session_id || sessionId;

  fastify.log.info(
    { sessionId, cliSessionId, resume: config.resume },
    "[WebSocket] Executing with session ID"
  );

  // Set session state to working
  await prisma.agentSession.update({
    where: { id: sessionId },
    data: {
      state: 'working',
      error_message: null, // Clear any previous error
    },
  });

  // Execute agent command
  const result = await executeAgentCommand({
    agent: session.agent as "claude" | "codex",
    prompt: data.message,
    workingDir: projectPath,
    sessionId: cliSessionId,
    resume: config.resume,
    permissionMode: config.permissionMode,
    model: config.model,
    images:
      imagePaths.length > 0
        ? imagePaths.map((path) => ({ path }))
        : undefined,
    onEvent: ({ message }) => {
      if (message && typeof message === "object" && message !== null) {
        sendMessage(socket, `session.${sessionId}.stream_output`, {
          message,
        });
      }
    },
    logger: fastify.log,
  });

  // Handle execution failure
  if (!result.success) {
    await handleExecutionFailure(socket, sessionId, result, fastify);
    await cleanupSessionImages(sessionId, fastify.log);
    return;
  }

  // Post-processing: Store CLI session ID, generate name, extract usage
  await performPostProcessingTasks(
    sessionId,
    session.name,
    data.message,
    result,
    fastify
  );

  // Set session state to idle (successful completion)
  await prisma.agentSession.update({
    where: { id: sessionId },
    data: {
      state: 'idle',
      error_message: null,
    },
  });

  // Cleanup and complete
  await cleanupSessionImages(sessionId, fastify.log);
  sendMessage(socket, `session.${sessionId}.message_complete`, {});
}

/**
 * Handle session cancel event
 *
 * Placeholder for future session cancellation functionality.
 * Currently returns an error indicating the feature is not yet implemented.
 */
export async function handleSessionCancel(
  socket: WebSocket,
  sessionId: string,
  _data: unknown,
  _userId: string,
  fastify: FastifyInstance
): Promise<void> {
  fastify.log.info({ sessionId }, "[WebSocket] Session cancel requested");
  sendMessage(socket, `session.${sessionId}.error`, {
    error: "Cancel functionality not implemented",
    message: "Session cancellation is not yet implemented",
  });
}

/**
 * Route session events to appropriate handler
 *
 * Main router for session-related WebSocket events. Extracts the session ID
 * from the event type and delegates to specific handlers based on the action.
 */
export async function handleSessionEvent(
  socket: WebSocket,
  type: string,
  data: unknown,
  userId: string,
  fastify: FastifyInstance
): Promise<void> {
  const sessionId = extractId(type, "session");
  if (!sessionId) {
    sendMessage(socket, "global.error", {
      error: "Invalid session event type",
      message: `Expected format: session.{id}.action, got: ${type}`,
    });
    return;
  }

  try {
    if (type.endsWith(".send_message")) {
      await handleSessionSendMessage(
        socket,
        sessionId,
        data as SessionSendMessageData,
        userId,
        fastify
      );
    } else if (type.endsWith(".cancel")) {
      await handleSessionCancel(socket, sessionId, data, userId, fastify);
    } else {
      // Unknown session action
      sendMessage(socket, `session.${sessionId}.error`, {
        error: "Unknown session action",
        message: `Unknown action in event type: ${type}`,
      });
    }
  } catch (err: unknown) {
    fastify.log.error({ err, type, sessionId }, "Error handling session event");
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    const errorStack = err instanceof Error ? err.stack : undefined;
    const errorName = err instanceof Error ? err.name : undefined;

    sendMessage(socket, `session.${sessionId}.error`, {
      error: errorMessage,
      message: errorMessage,
      stack: errorStack,
      name: errorName,
    });
  }
}

// ============================================================================
// Private Helper Methods
// ============================================================================

/**
 * Process image uploads for a session
 *
 * Handles both base64-encoded images and file path references.
 * Creates a temporary directory in the project and saves all images there.
 *
 * @private
 */
async function processImageUploads(
  images: string[] | undefined,
  projectPath: string,
  sessionId: string
): Promise<ImageProcessingResult> {
  const imagePaths: string[] = [];

  if (!images || images.length === 0) {
    return { imagePaths };
  }

  // Create temp directory for images
  const timestamp = Date.now();
  const tempImageDir = path.join(
    projectPath,
    ".tmp",
    "images",
    String(timestamp)
  );
  await fs.mkdir(tempImageDir, { recursive: true });

  // Update active session with temp dir
  activeSessions.update(sessionId, { tempImageDir });

  // Save each image
  for (let i = 0; i < images.length; i++) {
    const image = images[i];

    // Determine file extension from MIME type or default to .png
    let ext = ".png";
    if (image.startsWith("data:image/")) {
      const mimeType = image.split(";")[0].split("/")[1];
      ext = "." + mimeType;
    }

    const imagePath = path.join(tempImageDir, `image-${i}${ext}`);

    // Handle base64 data URLs
    if (image.startsWith("data:")) {
      const base64Data = image.split(",")[1];
      await fs.writeFile(imagePath, Buffer.from(base64Data, "base64"));
    } else {
      // Assume it's a file path - copy it
      await fs.copyFile(image, imagePath);
    }

    imagePaths.push(imagePath);
  }

  return { imagePaths, tempImageDir };
}

/**
 * Check if an agent type is supported
 *
 * @private
 */
function isAgentSupported(agent: string): boolean {
  return agent === "claude" || agent === "codex";
}

/**
 * Parse execution configuration from data config
 *
 * @private
 */
function parseExecutionConfig(
  config: unknown
): ExecutionConfig {
  const configObj = config as Record<string, unknown> | undefined;

  return {
    resume: configObj?.resume === true,
    permissionMode: configObj?.permissionMode as
      | "default"
      | "acceptEdits"
      | "bypassPermissions"
      | undefined,
    model: configObj?.model as string | undefined,
  };
}

/**
 * Handle agent execution failure
 *
 * Logs the error and sends error message to the client via WebSocket.
 *
 * @private
 */
async function handleExecutionFailure(
  socket: WebSocket,
  sessionId: string,
  result: AgentExecuteResult,
  fastify: FastifyInstance
): Promise<void> {
  const errorMessage = result.error || "Command failed with non-zero exit code";

  fastify.log.error(
    { sessionId, exitCode: result.exitCode, error: errorMessage },
    "[WebSocket] Agent CLI SDK command failed"
  );

  // Set session state to error
  await prisma.agentSession.update({
    where: { id: sessionId },
    data: {
      state: 'error',
      error_message: errorMessage,
    },
  });

  sendMessage(socket, `session.${sessionId}.error`, {
    error: errorMessage,
    message: errorMessage,
    exitCode: result.exitCode,
  });
}

/**
 * Perform post-processing tasks after successful execution
 *
 * Handles:
 * - Storing CLI-generated session ID
 * - Generating session name from first message
 * - Extracting and logging usage data
 *
 * @private
 */
async function performPostProcessingTasks(
  sessionId: string,
  existingSessionName: string | null,
  userMessage: string,
  result: AgentExecuteResult,
  fastify: FastifyInstance
): Promise<void> {
  // Store CLI session ID
  await storeCliSessionId(sessionId, result.sessionId, fastify.log);

  // Generate session name if needed
  if (!existingSessionName) {
    await generateAndStoreName(sessionId, userMessage, fastify.log);
  }

  // Extract and log usage data
  extractAndLogUsage(sessionId, result, fastify.log);
}

/**
 * Store the CLI-generated session ID
 *
 * @private
 */
async function storeCliSessionId(
  sessionId: string,
  cliSessionId: string | undefined,
  logger: FastifyBaseLogger
): Promise<void> {
  if (!cliSessionId) {
    return;
  }

  try {
    logger.info(
      { sessionId, cliSessionId },
      "[WebSocket] Storing CLI-generated session ID"
    );

    await prisma.agentSession.update({
      where: { id: sessionId },
      data: { cli_session_id: cliSessionId },
    });
  } catch (err: unknown) {
    // Non-critical error - log and continue
    logger.warn(
      { err, sessionId },
      "[WebSocket] Failed to store CLI session ID (non-critical)"
    );
  }
}

/**
 * Generate and store a session name from the user's first message
 *
 * @private
 */
async function generateAndStoreName(
  sessionId: string,
  userMessage: string,
  logger: FastifyBaseLogger
): Promise<void> {
  try {
    logger.info(
      { sessionId, userPrompt: userMessage.substring(0, 100) },
      "[WebSocket] Generating session name from first user message"
    );

    const sessionName = await generateSessionName({
      userPrompt: userMessage,
    });

    await prisma.agentSession.update({
      where: { id: sessionId },
      data: { name: sessionName },
    });

    logger.info(
      { sessionId, sessionName },
      "[WebSocket] Session name generated successfully"
    );
  } catch (err: unknown) {
    // Non-critical error - log and continue
    logger.warn(
      { err, sessionId },
      "[WebSocket] Failed to generate session name (non-critical)"
    );
  }
}

/**
 * Extract usage data from execution result and log it
 *
 * @private
 */
function extractAndLogUsage(
  sessionId: string,
  result: AgentExecuteResult,
  logger: FastifyBaseLogger
): void {
  const usage = extractUsageFromEvents(result.events);

  if (usage) {
    logger.info({ usage, sessionId }, "Extracted usage data");
  } else {
    logger.warn({ sessionId }, "No usage data found in result.events");
  }
}

/**
 * Clean up temporary image files for a session
 *
 * @private
 */
async function cleanupSessionImages(
  sessionId: string,
  logger: FastifyBaseLogger
): Promise<void> {
  const sessionData = activeSessions.get(sessionId);
  await cleanupTempDir(sessionData?.tempImageDir, logger);

  if (sessionData) {
    activeSessions.update(sessionId, { tempImageDir: undefined });
  }
}
