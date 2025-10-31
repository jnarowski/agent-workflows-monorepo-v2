import type { WebSocket } from "@fastify/websocket";
import type { FastifyInstance, FastifyBaseLogger } from "fastify";
import { prisma } from "@/shared/prisma";
import type { SessionSendMessageData } from "../types.js";
import { sendMessage } from "../infrastructure/send-message.js";
import { cleanupTempDir } from "../infrastructure/cleanup.js";
import { activeSessions } from "../infrastructure/active-sessions.js";
import {
  validateSessionOwnership,
  extractUsageFromEvents,
  executeAgent,
  processImageUploads,
  generateSessionName,
  type AgentExecuteResult,
} from "@/server/domain/session/services";
import { broadcast, subscribe } from "../infrastructure/subscriptions.js";
import {
  SessionEventTypes,
  GlobalEventTypes,
  Channels,
} from "@/shared/websocket";
import { parseChannel } from "../infrastructure/channels.js";
import { killProcess } from "@repo/agent-cli-sdk";

// ============================================================================
// Types
// ============================================================================

interface ExecutionConfig {
  resume: boolean;
  permissionMode: "default" | "acceptEdits" | "bypassPermissions" | undefined;
  model: string | undefined;
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
  fastify.log.info(
    { sessionId, userId, message: data.message },
    "[WebSocket] ===== handleSessionSendMessage ENTRY POINT ====="
  );

  // Auto-subscribe socket to session channel
  const channel = Channels.session(sessionId);
  subscribe(channel, socket);
  fastify.log.debug(
    { sessionId, channel },
    "[WebSocket] Auto-subscribed to session channel"
  );

  // Verify user owns session
  const session = await validateSessionOwnership(sessionId, userId);
  const projectPath = session.project.path;

  // Get or create session data for temp image tracking
  const sessionData = activeSessions.getOrCreate(sessionId, {
    projectPath,
    userId,
  });

  // Process image uploads (domain function)
  const { imagePaths } = await processImageUploads(
    data.images,
    sessionData.projectPath,
    sessionId
  );

  // Validate agent is supported
  if (!isAgentSupported(session.agent)) {
    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.ERROR,
      data: {
        error: `Agent type '${session.agent}' is not yet implemented`,
        sessionId,
        code: "UNSUPPORTED_AGENT",
      },
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
      state: "working",
      error_message: null, // Clear any previous error
    },
  });

  // Broadcast session state update
  broadcast(Channels.session(sessionId), {
    type: SessionEventTypes.SESSION_UPDATED,
    data: {
      sessionId,
      state: 'working',
      error_message: null,
      updated_at: new Date().toISOString(),
    },
  });

  // Execute agent command
  fastify.log.info(
    { sessionId, agent: session.agent, message: data.message },
    "[WebSocket] About to execute agent command"
  );

  const result = await executeAgent({
    agent: session.agent as "claude" | "codex",
    prompt: data.message,
    workingDir: projectPath,
    sessionId: cliSessionId,
    resume: config.resume,
    permissionMode: config.permissionMode,
    model: config.model,
    images:
      imagePaths.length > 0 ? imagePaths.map((path) => ({ path })) : undefined,
    onEvent: ({ message }) => {
      if (message && typeof message === "object" && message !== null) {
        broadcast(Channels.session(sessionId), {
          type: SessionEventTypes.STREAM_OUTPUT,
          data: {
            message,
            sessionId,
          },
        });
      }
    },
    logger: fastify.log,
  });

  fastify.log.info(
    { sessionId, success: result.success },
    "[WebSocket] Agent command execution completed"
  );

  // Handle execution failure
  if (!result.success) {
    fastify.log.warn(
      { sessionId, error: result.error },
      "[WebSocket] Execution failed, skipping post-processing"
    );
    await handleExecutionFailure(socket, sessionId, result, fastify);
    await cleanupSessionImages(sessionId, fastify.log);
    return;
  }

  fastify.log.info(
    { sessionId },
    "[WebSocket] Execution succeeded, proceeding to post-processing"
  );

  // Post-processing: Store CLI session ID, generate name, extract usage
  fastify.log.info(
    { sessionId, existingSessionName: session.name, hasName: !!session.name },
    "[WebSocket] Starting post-processing tasks"
  );
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
      state: "idle",
      error_message: null,
    },
  });

  // Broadcast session state update
  broadcast(Channels.session(sessionId), {
    type: SessionEventTypes.SESSION_UPDATED,
    data: {
      sessionId,
      state: 'idle',
      error_message: null,
      updated_at: new Date().toISOString(),
    },
  });

  // Cleanup and complete
  await cleanupSessionImages(sessionId, fastify.log);
  broadcast(Channels.session(sessionId), {
    type: SessionEventTypes.MESSAGE_COMPLETE,
    data: {
      sessionId,
    },
  });
}

/**
 * Handle session cancel event
 *
 * Kills the running agent process and returns session to idle state
 */
export async function handleSessionCancel(
  _socket: WebSocket,
  sessionId: string,
  _data: unknown,
  userId: string,
  fastify: FastifyInstance
): Promise<void> {
  fastify.log.info({ sessionId, userId }, "[WebSocket] Session cancel requested");

  try {
    // Validate session ownership
    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      broadcast(Channels.session(sessionId), {
        type: SessionEventTypes.ERROR,
        data: {
          error: "Session not found",
          sessionId,
          code: "SESSION_NOT_FOUND",
        },
      });
      return;
    }

    if (session.userId !== userId) {
      broadcast(Channels.session(sessionId), {
        type: SessionEventTypes.ERROR,
        data: {
          error: "Unauthorized: session does not belong to user",
          sessionId,
          code: "UNAUTHORIZED",
        },
      });
      return;
    }

    // Check if session is in 'working' state
    if (session.state !== "working") {
      broadcast(Channels.session(sessionId), {
        type: SessionEventTypes.ERROR,
        data: {
          error: `Cannot cancel session in '${session.state}' state`,
          sessionId,
          code: "INVALID_STATE",
        },
      });
      return;
    }

    // Retrieve process from active sessions
    const process = activeSessions.getProcess(sessionId);

    if (!process) {
      fastify.log.warn(
        { sessionId },
        "[WebSocket] No process found for session (may have already completed)"
      );

      // Update state to idle anyway (race condition handling)
      await prisma.agentSession.update({
        where: { id: sessionId },
        data: {
          state: "idle",
          error_message: null,
          updated_at: new Date(),
        },
      });

      broadcast(Channels.session(sessionId), {
        type: SessionEventTypes.SESSION_UPDATED,
        data: {
          sessionId,
          state: "idle",
          error_message: null,
          updated_at: new Date().toISOString(),
        },
      });

      return;
    }

    // Kill the process with graceful shutdown
    fastify.log.info(
      { sessionId, pid: process.pid },
      "[WebSocket] Killing agent process"
    );

    try {
      const killResult = await killProcess(process, { timeoutMs: 5000 });

      fastify.log.info(
        {
          sessionId,
          pid: process.pid,
          killed: killResult.killed,
          signal: killResult.signal,
        },
        "[WebSocket] Process kill result"
      );
    } catch (killError) {
      // Log but don't fail - process might already be dead
      fastify.log.warn(
        { err: killError, sessionId, pid: process.pid },
        "[WebSocket] Error killing process (may already be dead)"
      );
    }

    // Clear process reference
    activeSessions.clearProcess(sessionId);

    // Update database state to idle
    await prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        state: "idle",
        error_message: null,
        updated_at: new Date(),
      },
    });

    // Broadcast cancellation complete
    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.SESSION_UPDATED,
      data: {
        sessionId,
        state: "idle",
        error_message: null,
        updated_at: new Date().toISOString(),
      },
    });

    // Also send message_complete for consistency
    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.MESSAGE_COMPLETE,
      data: {
        sessionId,
        cancelled: true,
      },
    });

    fastify.log.info({ sessionId }, "[WebSocket] Session cancelled successfully");
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to cancel session";

    fastify.log.error({ err, sessionId }, "[WebSocket] Error cancelling session");

    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.ERROR,
      data: {
        error: errorMessage,
        sessionId,
        code: "CANCEL_FAILED",
      },
    });
  }
}

/**
 * Handle session subscribe event
 *
 * Subscribes the WebSocket to the session's broadcast channel, enabling
 * the client to receive real-time updates for this session.
 * This is used for page reloads and passive session viewing.
 */
export async function handleSessionSubscribe(
  socket: WebSocket,
  sessionId: string,
  userId: string,
  fastify: FastifyInstance
): Promise<void> {
  // Validate session ownership
  await validateSessionOwnership(sessionId, userId);

  // Subscribe socket to session channel
  const channel = Channels.session(sessionId);
  subscribe(channel, socket);

  fastify.log.info(
    { sessionId, channel },
    "[WebSocket] Client subscribed to session channel"
  );
}

/**
 * Route session events to appropriate handler
 *
 * Main router for session-related WebSocket events. Extracts the session ID
 * from the event type and delegates to specific handlers based on the action.
 */
export async function handleSessionEvent(
  socket: WebSocket,
  channel: string,
  type: string,
  data: unknown,
  userId: string,
  fastify: FastifyInstance
): Promise<void> {
  fastify.log.info(
    { channel, type, userId },
    "[WebSocket] handleSessionEvent router entry"
  );

  const parsed = parseChannel(channel);
  const sessionId = parsed?.id;

  fastify.log.info(
    { parsed, sessionId, resource: parsed?.resource },
    "[WebSocket] Parsed channel"
  );

  if (!sessionId || parsed?.resource !== "session") {
    fastify.log.warn(
      { sessionId, resource: parsed?.resource },
      "[WebSocket] Invalid session channel"
    );
    sendMessage(socket, Channels.global(), {
      type: GlobalEventTypes.ERROR,
      data: {
        error: "Invalid session channel",
      },
    });
    return;
  }

  try {
    if (type === SessionEventTypes.SEND_MESSAGE) {
      fastify.log.info(
        { sessionId, type },
        "[WebSocket] Routing to handleSessionSendMessage"
      );
      await handleSessionSendMessage(
        socket,
        sessionId,
        data as SessionSendMessageData,
        userId,
        fastify
      );
    } else if (type === SessionEventTypes.CANCEL) {
      await handleSessionCancel(socket, sessionId, data, userId, fastify);
    } else if (type === SessionEventTypes.SUBSCRIBE) {
      await handleSessionSubscribe(socket, sessionId, userId, fastify);
    } else {
      // Unknown session action
      broadcast(Channels.session(sessionId), {
        type: SessionEventTypes.ERROR,
        data: {
          error: "Unknown session action",
          sessionId,
        },
      });
    }
  } catch (err: unknown) {
    fastify.log.error({ err, type, sessionId }, "Error handling session event");
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";

    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.ERROR,
      data: {
        error: errorMessage,
        sessionId,
      },
    });
  }
}

// ============================================================================
// Private Helper Methods
// ============================================================================

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
function parseExecutionConfig(config: unknown): ExecutionConfig {
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
  _socket: WebSocket,
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
      state: "error",
      error_message: errorMessage,
    },
  });

  // Broadcast session state update
  broadcast(Channels.session(sessionId), {
    type: SessionEventTypes.SESSION_UPDATED,
    data: {
      sessionId,
      state: 'error',
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    },
  });

  broadcast(Channels.session(sessionId), {
    type: SessionEventTypes.ERROR,
    data: {
      error: errorMessage,
      sessionId,
    },
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
  fastify.log.info(
    {
      sessionId,
      existingSessionName,
      hasExistingName: !!existingSessionName,
      willGenerateName: !existingSessionName,
      userMessagePreview: userMessage.substring(0, 50),
    },
    "[WebSocket] performPostProcessingTasks called"
  );

  // Store CLI session ID
  await storeCliSessionId(sessionId, result.sessionId, fastify.log);

  // Generate session name if needed
  if (!existingSessionName) {
    fastify.log.info(
      { sessionId },
      "[WebSocket] No existing session name, will generate one"
    );
    await generateAndStoreName(sessionId, userMessage, fastify.log);
  } else {
    fastify.log.info(
      { sessionId, existingSessionName },
      "[WebSocket] Session already has a name, skipping generation"
    );
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
  logger.info(
    { sessionId, userMessageLength: userMessage.length },
    "[WebSocket] ===== ENTERED generateAndStoreName function ====="
  );

  try {
    logger.info(
      { sessionId, userPrompt: userMessage.substring(0, 100), fullPrompt: userMessage },
      "[WebSocket] About to call generateSessionName"
    );

    const sessionName = await generateSessionName({
      userPrompt: userMessage,
    });

    logger.info(
      { sessionId, sessionName, nameLength: sessionName?.length },
      "[WebSocket] generateSessionName returned successfully"
    );

    logger.info(
      { sessionId, sessionName },
      "[WebSocket] About to update database with session name"
    );

    await prisma.agentSession.update({
      where: { id: sessionId },
      data: { name: sessionName },
    });

    logger.info(
      { sessionId, sessionName },
      "[WebSocket] Database updated successfully with session name"
    );

    // Broadcast session name update
    broadcast(Channels.session(sessionId), {
      type: SessionEventTypes.SESSION_UPDATED,
      data: {
        sessionId,
        name: sessionName,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    // Non-critical error - log and continue
    logger.error(
      {
        err,
        sessionId,
        errorMessage: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : undefined
      },
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
