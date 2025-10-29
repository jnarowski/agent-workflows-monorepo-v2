import type { WebSocket } from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
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
import { executeAgentCommand } from "../services/agent-executor.js";

/**
 * Handle session send_message event
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

  // Handle image uploads
  const imagePaths: string[] = [];
  if (data.images && data.images.length > 0) {
    // Create temp directory for images
    const timestamp = Date.now();
    const tempImageDir = path.join(
      sessionData.projectPath,
      ".tmp",
      "images",
      String(timestamp)
    );
    await fs.mkdir(tempImageDir, { recursive: true });

    activeSessions.update(sessionId, { tempImageDir });

    // Save images to temp directory
    for (let i = 0; i < data.images.length; i++) {
      const image = data.images[i];

      // Extract file extension from base64 data URL or use default
      let ext = ".png";
      if (image.startsWith("data:image/")) {
        const mimeType = image.split(";")[0].split("/")[1];
        ext = "." + mimeType;
      }

      const imagePath = path.join(tempImageDir, `image-${i}${ext}`);

      // If image is base64, decode and save
      if (image.startsWith("data:")) {
        const base64Data = image.split(",")[1];
        await fs.writeFile(imagePath, Buffer.from(base64Data, "base64"));
      } else {
        // Assume it's already a file path
        await fs.copyFile(image, imagePath);
      }

      imagePaths.push(imagePath);
    }
  }

  // Validate agent is supported
  if (session.agent !== "claude" && session.agent !== "codex") {
    sendMessage(socket, `session.${sessionId}.error`, {
      error: `Agent type '${session.agent}' is not yet implemented`,
      code: "UNSUPPORTED_AGENT",
    });
    return;
  }

  // Extract resume flag, permissionMode, and model from config
  const config = data.config as Record<string, unknown> | undefined;
  const resume = config?.resume === true;
  const permissionMode = config?.permissionMode as
    | "default"
    | "acceptEdits"
    | "bypassPermissions"
    | undefined;
  const model = config?.model as string | undefined;

  // Use cli_session_id if available (for resuming sessions with CLI tools)
  // Otherwise use our database session ID (for new sessions)
  const cliSessionId = session.cli_session_id || sessionId;

  fastify.log.info(
    { sessionId, cliSessionId, resume },
    "[WebSocket] Executing with session ID"
  );

  // Execute agent command
  const result = await executeAgentCommand({
    agent: session.agent as "claude" | "codex",
    prompt: data.message,
    workingDir: projectPath,
    sessionId: cliSessionId,
    resume,
    permissionMode,
    model,
    images:
      imagePaths.length > 0
        ? imagePaths.map((path) => ({ path }))
        : undefined,
    onEvent: ({ message }) => {
      if (message && typeof message === "object" && message !== null) {
        // Stream message updates back to client
        sendMessage(socket, `session.${sessionId}.stream_output`, {
          message,
        });
      }
    },
    logger: fastify.log,
  });

  // Check if command failed
  if (!result.success) {
    const errorMessage = result.error || "Command failed with non-zero exit code";
    fastify.log.error(
      { sessionId, exitCode: result.exitCode, error: errorMessage },
      "[WebSocket] Agent CLI SDK command failed"
    );

    // Send error to frontend
    sendMessage(socket, `session.${sessionId}.error`, {
      error: errorMessage,
      message: errorMessage,
      exitCode: result.exitCode,
    });

    // Clean up temp images on error
    const updatedSessionData = activeSessions.get(sessionId);
    await cleanupTempDir(updatedSessionData?.tempImageDir, fastify.log);
    if (updatedSessionData) {
      activeSessions.update(sessionId, { tempImageDir: undefined });
    }

    return; // Don't send message_complete on error
  }

  // ============= CLI SESSION ID STORAGE =============
  // Store the CLI-generated session ID from the result
  try {
    fastify.log.info(
      { sessionId, cliSessionId: result.sessionId },
      "[WebSocket] Storing CLI-generated session ID"
    );

    await prisma.agentSession.update({
      where: { id: sessionId },
      data: { cli_session_id: result.sessionId },
    });
  } catch (cliIdErr: unknown) {
    // Don't fail message completion if CLI session ID storage fails
    fastify.log.warn(
      { err: cliIdErr, sessionId },
      "[WebSocket] Failed to store CLI session ID (non-critical)"
    );
  }

  // ============= SESSION NAME GENERATION =============
  // Generate session name from first user message
  if (!session.name) {
    try {
      fastify.log.info(
        { sessionId, userPrompt: data.message.substring(0, 100) },
        "[WebSocket] Generating session name from first user message"
      );

      const sessionName = await generateSessionName({
        userPrompt: data.message,
      });

      await prisma.agentSession.update({
        where: { id: sessionId },
        data: { name: sessionName },
      });

      fastify.log.info(
        { sessionId, sessionName },
        "[WebSocket] Session name generated successfully"
      );
    } catch (nameErr: unknown) {
      fastify.log.warn(
        { err: nameErr, sessionId },
        "[WebSocket] Failed to generate session name (non-critical)"
      );
    }
  }

  // Extract usage data from result events
  const usage = extractUsageFromEvents(result.events);

  if (usage) {
    fastify.log.info({ usage, sessionId }, "Extracted usage data");
  } else {
    fastify.log.warn({ sessionId }, "No usage data found in result.events");
  }

  // Clean up temporary images
  const updatedSessionData = activeSessions.get(sessionId);
  await cleanupTempDir(updatedSessionData?.tempImageDir, fastify.log);
  if (updatedSessionData) {
    activeSessions.update(sessionId, { tempImageDir: undefined });
  }

  // Send completion event
  sendMessage(socket, `session.${sessionId}.message_complete`, {});
}

/**
 * Handle session cancel event (stub for future)
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
