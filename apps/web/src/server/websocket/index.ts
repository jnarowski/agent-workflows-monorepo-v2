import type { FastifyInstance } from "fastify";
import type { JWTPayload } from "@/server/utils/auth";
import type { WebSocketMessage } from "./types.js";
import { sendMessage } from "./utils/send-message.js";
import { wsMetrics } from "./utils/metrics.js";
import { activeSessions } from "./utils/active-sessions.js";
import { reconnectionManager } from "./utils/reconnection.js";
import { handleSessionEvent } from "./handlers/session.handler.js";
import { handleShellEvent } from "./handlers/shell.handler.js";
import { handleGlobalEvent } from "./handlers/global.handler.js";
import { unsubscribeAll } from "./utils/subscriptions.js";

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

          // Record connection metric
          wsMetrics.recordConnection();

          // Send global.connected event to signal client is ready
          sendMessage(socket, "global.connected", {
            timestamp: Date.now(),
            userId,
          });
        } catch (err: unknown) {
          fastify.log.error({ err }, "[WebSocket] Authentication failed");
          wsMetrics.recordError();

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
              wsMetrics.recordMessageReceived();

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
                await handleGlobalEvent(socket, type, data, userId!, fastify);
              } else {
                // Unknown event type
                sendMessage(socket, "global.error", {
                  error: "Unknown event type",
                  message: `Event type must start with 'session.', 'shell.', or 'global.': ${type}`,
                });
              }

              wsMetrics.recordMessageSent();
            } catch (err: unknown) {
              fastify.log.error(
                { err },
                "[WebSocket] Error processing message"
              );
              wsMetrics.recordError();

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
          wsMetrics.recordDisconnection();

          // Unsubscribe from all channels
          unsubscribeAll(socket);
          fastify.log.debug({ userId }, "[WebSocket] Unsubscribed from all channels");

          // Schedule cleanup with 30-second grace period for reconnection
          for (const [sessionId, sessionData] of activeSessions.entries()) {
            if (sessionData.userId === userId) {
              fastify.log.info(
                { sessionId, userId },
                "[WebSocket] Scheduling session cleanup (30s grace period)"
              );

              reconnectionManager.scheduleCleanup(sessionId, async () => {
                fastify.log.info(
                  { sessionId, userId },
                  "[WebSocket] Executing scheduled cleanup (no reconnect)"
                );
                await activeSessions.cleanup(sessionId, fastify.log);
              });
            }
          }
        });

        // Handle errors
        socket.on("error", (err: Error) => {
          fastify.log.error({ err, userId }, "[WebSocket] Socket error");
          wsMetrics.recordError();

          // Unsubscribe from all channels
          unsubscribeAll(socket);
          fastify.log.debug({ userId }, "[WebSocket] Unsubscribed from all channels on error");

          // Clean up immediately on error (no grace period)
          for (const [sessionId, sessionData] of activeSessions.entries()) {
            if (sessionData.userId === userId) {
              activeSessions
                .cleanup(sessionId, fastify.log)
                .catch((cleanupErr) => {
                  fastify.log.warn(
                    { err: cleanupErr, sessionId },
                    "Failed to clean up session on error"
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
        wsMetrics.recordError();
        socket.close();
      }
    });
  });
}

// Export active sessions and reconnection manager for graceful shutdown
export { activeSessions, reconnectionManager };
