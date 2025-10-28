/* eslint-disable @typescript-eslint/no-unused-vars */
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import { execute, type ClaudePermissionMode } from "@repo/agent-cli-sdk";
import { prisma } from "@/shared/prisma";
import fs from "fs/promises";
import path from "path";
import { JWTPayload } from "@/server/utils/auth";
// import { generateSessionName } from "@/server/utils/generateSessionName";
import type {
  WebSocketMessage,
  SessionSendMessageData,
  ActiveSessionData,
} from "@/server/websocket.types";

// ============= STATE =============

/**
 * Active sessions map: sessionId -> session data
 * Exported for graceful shutdown cleanup
 */
export const activeSessions = new Map<string, ActiveSessionData>();

// Active shells map: shellId -> shell process instance
// TODO: Implement shell process management when shell feature is ready
// const activeShells = new Map<string, unknown>();

// ============= UTILITIES =============

/**
 * Extract ID from event type (e.g., "session.123.send_message" -> "123")
 */
function extractId(type: string, prefix: "session" | "shell"): string | null {
  const parts = type.split(".");
  if (parts[0] === prefix && parts.length >= 3) {
    return parts[1];
  }
  return null;
}

/**
 * Send a WebSocket message with flat event naming
 */
function sendMessage(socket: WebSocket, type: string, data: unknown): void {
  socket.send(JSON.stringify({ type, data }));
}

// ============= SESSION HANDLERS =============

/**
 * Handle session events (session.{id}.action)
 */
async function handleSessionEvent(
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
    // Handle send_message action
    if (type.endsWith(".send_message")) {
      const messageData = data as SessionSendMessageData;

      // Verify user owns session
      const session = await prisma.agentSession.findUnique({
        where: { id: sessionId },
        include: { project: true },
      });

      if (!session) {
        sendMessage(socket, `session.${sessionId}.error`, {
          error: "Session not found",
        });
        return;
      }

      if (session.userId !== userId) {
        sendMessage(socket, `session.${sessionId}.error`, {
          error: "Unauthorized access to session",
        });
        return;
      }

      const projectPath = session.project.path;

      // Get or create session data for temp image tracking
      let sessionData = activeSessions.get(sessionId);

      if (!sessionData) {
        fastify.log.info(
          { sessionId, projectPath },
          "[WebSocket] Initializing session data"
        );

        sessionData = {
          projectPath,
          userId,
        };

        activeSessions.set(sessionId, sessionData);
      }

      // Handle image uploads
      const imagePaths: string[] = [];
      if (messageData.images && messageData.images.length > 0) {
        // Create temp directory for images
        const timestamp = Date.now();
        const tempImageDir = path.join(
          sessionData.projectPath,
          ".tmp",
          "images",
          String(timestamp)
        );
        await fs.mkdir(tempImageDir, { recursive: true });

        sessionData.tempImageDir = tempImageDir;

        // Save images to temp directory
        for (let i = 0; i < messageData.images.length; i++) {
          const image = messageData.images[i];

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

      // Send message via agent-cli-sdk
      try {
        fastify.log.info(
          { sessionId, messageLength: messageData.message.length },
          "[WebSocket] Sending message to agent-cli-sdk"
        );

        // Extract resume flag and permissionMode from config
        const config = messageData.config as Record<string, unknown> | undefined;
        const resume = config?.resume === true;
        const permissionMode = config?.permissionMode as ClaudePermissionMode | undefined;

        const result = await execute({
          tool: "claude",
          prompt: messageData.message,
          workingDir: projectPath,
          sessionId,
          resume,
          permissionMode,
          verbose: true,
          images:
            imagePaths.length > 0
              ? imagePaths.map((path) => ({ path }))
              : undefined,
          onEvent: ({ message }) => {
            if (message) {
              // Stream message updates back to client
              sendMessage(socket, `session.${sessionId}.stream_output`, {
                message,
              });
            }
          },
        });

        fastify.log.info(
          { sessionId, success: result.success, exitCode: result.exitCode },
          "[WebSocket] Message execution completed"
        );

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
          if (sessionData.tempImageDir) {
            try {
              await fs.rm(sessionData.tempImageDir, {
                recursive: true,
                force: true,
              });
              sessionData.tempImageDir = undefined;
            } catch (cleanupErr) {
              fastify.log.warn(
                { err: cleanupErr },
                "Failed to clean up temp images"
              );
            }
          }

          return; // Don't send message_complete on error
        }

        // ============= SESSION NAME GENERATION (COMMENTED OUT) =============
        // TODO: Uncomment this block to enable AI-generated session names
        //
        // Generate session name from first user message
        // This runs only once per session, after the first message completes successfully.
        // The session name is generated using Claude AI based on the user's initial prompt.
        //
        // if (!session.name && metadata && metadata.messageCount === 1) {
        //   try {
        //     fastify.log.info(
        //       { sessionId, userPrompt: messageData.message.substring(0, 100) },
        //       '[WebSocket] Generating session name from first user message'
        //     );
        //
        //     const sessionName = await generateSessionName({
        //       userPrompt: messageData.message,
        //     });
        //
        //     // Update session with generated name
        //     await prisma.agentSession.update({
        //       where: { id: sessionId },
        //       data: { name: sessionName },
        //     });
        //
        //     fastify.log.info(
        //       { sessionId, sessionName },
        //       '[WebSocket] Session name generated successfully'
        //     );
        //   } catch (nameErr: unknown) {
        //     // Don't fail message completion if name generation fails
        //     fastify.log.warn(
        //       { err: nameErr, sessionId },
        //       '[WebSocket] Failed to generate session name (non-critical)'
        //     );
        //   }
        // }
        // ============= END SESSION NAME GENERATION =============

        // Extract usage data from the last assistant message in result.events
        let usage = null;
        if (result.events && Array.isArray(result.events)) {
          const events = result.events;
          fastify.log.info({ dataLength: events.length, sessionId }, "Extracting usage from result.events");

          // Log the last few events to understand the structure
          const lastEvents = events.slice(-3);
          fastify.log.info({ lastEvents: JSON.stringify(lastEvents, null, 2), sessionId }, "Last 3 events in result.events");

          // Find the last assistant message with usage data
          for (let i = events.length - 1; i >= 0; i--) {
            const event = events[i] as Record<string, unknown>;

            // Log each event type we're checking
            fastify.log.debug({
              eventType: event.type,
              eventRole: event.role,
              hasUsage: !!(event.usage as Record<string, unknown> | undefined),
              hasMessageUsage: !!((event.message as Record<string, unknown> | undefined)?.usage),
              eventKeys: Object.keys(event),
              sessionId
            }, "Checking event for usage");

            if ((event.type === 'assistant' || event.role === 'assistant') && event.usage) {
              const eventUsage = event.usage as Record<string, unknown>;
              usage = {
                input_tokens: (eventUsage.input_tokens as number) || 0,
                output_tokens: (eventUsage.output_tokens as number) || 0,
                cache_creation_input_tokens: (eventUsage.cache_creation_input_tokens as number) || 0,
                cache_read_input_tokens: (eventUsage.cache_read_input_tokens as number) || 0,
              };
              fastify.log.info({ usage, sessionId }, "Found usage in event.usage");
              break;
            }
            // Also check event.message.usage for Claude CLI format
            if ((event.type === 'assistant' || event.role === 'assistant') && event.message) {
              const message = event.message as Record<string, unknown>;
              if (message.usage) {
                const messageUsage = message.usage as Record<string, unknown>;
                usage = {
                  input_tokens: (messageUsage.input_tokens as number) || 0,
                  output_tokens: (messageUsage.output_tokens as number) || 0,
                  cache_creation_input_tokens: (messageUsage.cache_creation_input_tokens as number) || 0,
                  cache_read_input_tokens: (messageUsage.cache_read_input_tokens as number) || 0,
                };
              }
              fastify.log.info({ usage, sessionId }, "Found usage in event.message.usage");
              break;
            }
          }

          if (!usage) {
            fastify.log.warn({ sessionId, lastEvent: events[events.length - 1] }, "No usage data found in result.events");
          }
        } else {
          fastify.log.warn({ sessionId, resultKeys: result ? Object.keys(result) : null }, "result.events is not an array or doesn't exist");
        }

        // Clean up temporary images
        if (sessionData.tempImageDir) {
          try {
            await fs.rm(sessionData.tempImageDir, {
              recursive: true,
              force: true,
            });
            sessionData.tempImageDir = undefined;
          } catch (cleanupErr) {
            fastify.log.warn(
              { err: cleanupErr },
              "Failed to clean up temp images"
            );
          }
        }

        // Send completion event
        sendMessage(socket, `session.${sessionId}.message_complete`, {});
      } catch (err: unknown) {
        fastify.log.error({ err, sessionId }, "Agent CLI SDK error");

        // Clean up temp images on error
        if (sessionData.tempImageDir) {
          try {
            await fs.rm(sessionData.tempImageDir, {
              recursive: true,
              force: true,
            });
            sessionData.tempImageDir = undefined;
          } catch (cleanupErr) {
            fastify.log.warn(
              { err: cleanupErr },
              "Failed to clean up temp images"
            );
          }
        }

        // Send detailed error information to frontend
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        const errorStack = err instanceof Error ? err.stack : undefined;
        const errorName = err instanceof Error ? err.name : undefined;
        const errorDetails =
          typeof err === "object" && err !== null
            ? (err as Record<string, unknown>).response ||
              (err as Record<string, unknown>).data
            : undefined;

        sendMessage(socket, `session.${sessionId}.error`, {
          error: errorMessage,
          message: errorMessage,
          stack: errorStack,
          name: errorName,
          details: errorDetails,
        });
      }
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

// ============= SHELL HANDLERS =============

/**
 * Handle shell events (shell.{id}.action)
 */
async function handleShellEvent(
  socket: WebSocket,
  type: string,
  _data: unknown,
  _userId: string,
  fastify: FastifyInstance
): Promise<void> {
  const shellId = extractId(type, "shell");
  if (!shellId) {
    sendMessage(socket, "global.error", {
      error: "Invalid shell event type",
      message: `Expected format: shell.{id}.action, got: ${type}`,
    });
    return;
  }

  // TODO: Implement shell functionality when ready
  // For now, just send a not implemented message
  fastify.log.info(
    { type, shellId },
    "[WebSocket] Shell event received (not implemented yet)"
  );
  sendMessage(socket, `shell.${shellId}.error`, {
    error: "Shell functionality not implemented",
    message: "Shell/terminal features are not yet implemented",
  });
}

// ============= MAIN REGISTRATION =============

/**
 * Register unified WebSocket endpoint
 */
export async function registerWebSocket(
  fastify: FastifyInstance
): Promise<void> {
  fastify.register(async (fastify) => {
    // Unified WebSocket endpoint with JWT authentication
    fastify.get("/ws", { websocket: true }, async (socket, request) => {
      let userId: string | null = null;

      try {
        fastify.log.info("[WebSocket] New connection attempt");

        // Authenticate the WebSocket connection using JWT
        try {
          // Get token from query params (browser WebSocket doesn't support custom headers)
          const query = request.query as { token?: string };
          const token =
            query.token ||
            request.headers.authorization?.replace("Bearer ", "");

          if (!token) {
            sendMessage(socket, "global.error", {
              error: "Authentication required",
              message: "No authentication token provided",
            });
            socket.close(1008, "Authentication required"); // 1008 = Policy Violation
            return;
          }

          // Verify JWT token
          const decoded = fastify.jwt.verify<JWTPayload>(token);
          userId = decoded.userId;

          fastify.log.info({ userId }, "[WebSocket] Client authenticated");

          // Send global.connected event to signal client is ready
          sendMessage(socket, "global.connected", {
            timestamp: Date.now(),
            userId,
          });
        } catch (err: unknown) {
          fastify.log.error({ err }, "[WebSocket] Authentication failed");
          const errorMessage =
            err instanceof Error ? err.message : "Invalid or expired token";
          sendMessage(socket, "global.error", {
            error: "Authentication failed",
            message: errorMessage,
          });
          socket.close(1008, "Authentication failed"); // 1008 = Policy Violation
          return;
        }

        // Handle incoming messages
        socket.on(
          "message",
          async (message: Buffer | ArrayBuffer | Buffer[]) => {
            try {
              const messageStr = Buffer.isBuffer(message)
                ? message.toString()
                : Array.isArray(message)
                  ? Buffer.concat(message).toString()
                  : new TextDecoder().decode(message);

              const parsed: WebSocketMessage = JSON.parse(messageStr);
              const { type, data } = parsed;

              fastify.log.info(
                { type, userId },
                "[WebSocket] Received message"
              );

              // Route based on event type prefix
              if (type.startsWith("session.")) {
                await handleSessionEvent(socket, type, data, userId!, fastify);
              } else if (type.startsWith("shell.")) {
                await handleShellEvent(socket, type, data, userId!, fastify);
              } else if (type.startsWith("global.")) {
                // Global events from client (if any needed in future)
                fastify.log.info(
                  { type },
                  "[WebSocket] Global event received (no handler)"
                );
              } else {
                // Unknown event type
                sendMessage(socket, "global.error", {
                  error: "Unknown event type",
                  message: `Event type must start with 'session.', 'shell.', or 'global.': ${type}`,
                });
              }
            } catch (err: unknown) {
              fastify.log.error(
                { err },
                "[WebSocket] Error processing message"
              );
              const errorMessage =
                err instanceof Error ? err.message : "Malformed message";
              sendMessage(socket, "global.error", {
                error: "Failed to process message",
                message: errorMessage,
              });
            }
          }
        );

        // Handle disconnection
        socket.on("close", () => {
          fastify.log.info({ userId }, "[WebSocket] Client disconnected");

          // Clean up active sessions for this user
          for (const [_sessionId, sessionData] of activeSessions.entries()) {
            if (sessionData.userId === userId) {
              // Clean up temp images if any
              if (sessionData.tempImageDir) {
                fs.rm(sessionData.tempImageDir, {
                  recursive: true,
                  force: true,
                }).catch((err) => {
                  fastify.log.warn(
                    { err },
                    "Failed to clean up temp images on disconnect"
                  );
                });
              }

              // Note: We don't delete the session from activeSessions immediately
              // to allow resume if user reconnects. Could add TTL logic here.
            }
          }
        });

        // Handle errors
        socket.on("error", (err: Error) => {
          fastify.log.error({ err, userId }, "[WebSocket] Socket error");

          // Clean up on error
          for (const [_sessionId, sessionData] of activeSessions.entries()) {
            if (sessionData.userId === userId && sessionData.tempImageDir) {
              fs.rm(sessionData.tempImageDir, {
                recursive: true,
                force: true,
              }).catch((cleanupErr) => {
                fastify.log.warn(
                  { err: cleanupErr },
                  "Failed to clean up temp images on error"
                );
              });
            }
          }
        });
      } catch (err) {
        fastify.log.error(
          { err },
          "[WebSocket] Fatal error in WebSocket handler"
        );
        socket.close();
      }
    });
  });
}
