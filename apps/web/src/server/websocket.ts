import type { FastifyInstance } from "fastify";
import { AgentClient, createClaudeAdapter } from "@repo/agent-cli-sdk";
import { agentSessionService } from "./services/agent-session.service";
import { prisma } from "../shared/prisma";
import fs from "fs/promises";
import path from "path";

// JWT payload interface (matching auth plugin)
interface JWTPayload {
  userId: string;
  username: string;
}

// WebSocket message types
interface SendMessagePayload {
  type: "send_message";
  sessionId: string;
  message: string;
  images?: string[]; // Array of base64-encoded images or file paths
  config?: Record<string, unknown>;
}

// Active sessions map: sessionId -> { agentClient, projectPath, userId }
const activeSessions = new Map<
  string,
  {
    agentClient: AgentClient;
    projectPath: string;
    userId: string;
    tempImageDir?: string;
  }
>();

export async function registerWebSocket(fastify: FastifyInstance) {
  fastify.register(async (fastify) => {
    // Original basic WebSocket endpoint
    fastify.get("/ws", { websocket: true }, (socket) => {
      fastify.log.info("WebSocket client connected");

      // Send welcome message
      socket.send(
        JSON.stringify({
          type: "connected",
          message: "Welcome to Agent Workflows UI",
          timestamp: new Date().toISOString(),
        })
      );

      // Handle incoming messages
      socket.on("message", (message) => {
        const data = JSON.parse(message.toString());
        fastify.log.info({ data }, "Received WebSocket message");

        // Echo back for now
        socket.send(
          JSON.stringify({
            type: "echo",
            data,
            timestamp: new Date().toISOString(),
          })
        );
      });

      // Handle disconnection
      socket.on("close", () => {
        fastify.log.info("WebSocket client disconnected");
      });
    });

    // Chat WebSocket endpoint with JWT authentication
    fastify.get(
      "/ws/chat/:sessionId",
      { websocket: true },
      async (socket, request) => {
        try {
          fastify.log.info("Chat WebSocket connection attempt");

          // Extract sessionId from params
          const { sessionId } = request.params as { sessionId: string };
          let userId: string | null = null;
          let projectPath: string | null = null;

          // Authenticate the WebSocket connection using JWT
          try {
            // Get token from query params (browser WebSocket doesn't support custom headers)
            const query = request.query as { token?: string };
            const token =
              query.token ||
              request.headers.authorization?.replace("Bearer ", "");

            if (!token) {
              socket.send(
                JSON.stringify({
                  type: "error",
                  message: "Authentication required",
                  sessionId,
                })
              );
              socket.close();
              return;
            }

            // Verify JWT token
            const decoded = fastify.jwt.verify<JWTPayload>(token);
            userId = decoded.userId;

            fastify.log.info(
              { userId, sessionId },
              "Chat WebSocket authenticated"
            );

            // Verify session exists and user has access
            const session = await prisma.agentSession.findUnique({
              where: { id: sessionId },
              include: { project: true },
            });

            if (!session) {
              socket.send(
                JSON.stringify({
                  type: "error",
                  message: "Session not found",
                  sessionId,
                })
              );
              socket.close();
              return;
            }

            if (session.userId !== userId) {
              socket.send(
                JSON.stringify({
                  type: "error",
                  message: "Unauthorized access to session",
                  sessionId,
                })
              );
              socket.close();
              return;
            }

            projectPath = session.project.path;

            // Send connection success
            socket.send(
              JSON.stringify({
                type: "connected",
                sessionId,
                timestamp: new Date().toISOString(),
              })
            );
          } catch (err: any) {
            fastify.log.error({ err }, "Chat WebSocket authentication failed");
            socket.send(
              JSON.stringify({
                type: "error",
                message: err.message || "Authentication failed",
                sessionId,
              })
            );
            socket.close();
            return;
          }

          // Handle incoming messages
          socket.on("message", async (message) => {
            try {
              fastify.log.info(
                { sessionId, userId, messageLength: message.toString().length },
                "[WebSocket] Received message from client"
              );

              const data = JSON.parse(message.toString()) as SendMessagePayload;

              fastify.log.info(
                {
                  type: data.type,
                  sessionId,
                  hasMessage: !!data.message,
                  imagesCount: data.images?.length || 0,
                },
                "[WebSocket] Parsed message data"
              );

              if (data.type === "send_message") {
                fastify.log.info(
                  {
                    sessionId,
                    userId,
                    messagePreview: data.message?.substring(0, 100),
                  },
                  "[WebSocket] Processing send_message request"
                );

                // Initialize agent-cli-sdk client if not already active
                let sessionData = activeSessions.get(sessionId);

                if (!sessionData && projectPath && userId) {
                  // Create Claude adapter
                  const claudeAdapter = createClaudeAdapter();

                  // Create agent client
                  const agentClient = new AgentClient({
                    adapter: claudeAdapter,
                    workingDirectory: projectPath,
                  });

                  sessionData = {
                    agentClient,
                    projectPath,
                    userId,
                  };

                  activeSessions.set(sessionId, sessionData);
                }

                if (!sessionData) {
                  throw new Error("Failed to initialize session");
                }

                // Handle image uploads
                let imagePaths: string[] = [];
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

                  sessionData.tempImageDir = tempImageDir;

                  // Save images to temp directory
                  for (let i = 0; i < data.images.length; i++) {
                    const image = data.images[i];

                    // Extract file extension from base64 data URL or use default
                    let ext = ".png";
                    if (image.startsWith("data:image/")) {
                      const mimeType = image.split(";")[0].split("/")[1];
                      ext = "." + mimeType;
                    }

                    const imagePath = path.join(
                      tempImageDir,
                      `image-${i}${ext}`
                    );

                    // If image is base64, decode and save
                    if (image.startsWith("data:")) {
                      const base64Data = image.split(",")[1];
                      await fs.writeFile(
                        imagePath,
                        Buffer.from(base64Data, "base64")
                      );
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
                    {
                      sessionId,
                      messageLength: data.message.length,
                      imagePaths: imagePaths.length,
                    },
                    "[WebSocket] Sending message to agent-cli-sdk"
                  );

                  console.log("ssssssending....", data.message);

                  const response = await sessionData.agentClient.execute(
                    data.message,
                    {
                      sessionId,
                      images: imagePaths.length > 0 ? imagePaths : undefined,
                      onOutput: (outputData: any) => {
                        fastify.log.info({
                          sessionId,
                          outputType: typeof outputData,
                        });
                        // Stream output back to client
                        socket.send(
                          JSON.stringify({
                            type: "stream_output",
                            sessionId,
                            data: outputData,
                          })
                        );
                      },
                      ...data.config,
                    }
                  );

                  fastify.log.info(
                    {
                      sessionId,
                      responseType: typeof response,
                      response: JSON.stringify(response).substring(0, 200),
                    },
                    "[WebSocket] Received response from agent-cli-sdk"
                  );

                  // Check if the response indicates an error
                  if (response.status === "error") {
                    fastify.log.error(
                      { sessionId, response },
                      "Agent CLI SDK returned error status"
                    );

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

                    // Send error message to client
                    socket.send(
                      JSON.stringify({
                        type: "error",
                        sessionId,
                        message:
                          response.output ||
                          response.raw?.stderr ||
                          "An error occurred while processing your request",
                        error: {
                          message:
                            response.output ||
                            response.raw?.stderr ||
                            "An error occurred",
                          stack: undefined,
                          name: "AgentError",
                          details: {
                            exitCode: response.exitCode,
                            stderr: response.raw?.stderr,
                            stdout: response.raw?.stdout,
                            duration: response.duration,
                          },
                        },
                      })
                    );
                    return;
                  }

                  // After message completes, update session metadata
                  let metadata = null;
                  try {
                    const jsonlPath = agentSessionService.getSessionFilePath(
                      sessionData.projectPath,
                      sessionId
                    );
                    metadata =
                      await agentSessionService.parseJSONLFile(jsonlPath);

                    await agentSessionService.updateSessionMetadata(
                      sessionId,
                      metadata
                    );
                  } catch (metadataErr: any) {
                    // JSONL file might not exist yet for new sessions
                    fastify.log.debug(
                      { err: metadataErr, sessionId },
                      "Could not update session metadata (file may not exist yet)"
                    );
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

                  // Send completion event with parsed events
                  socket.send(
                    JSON.stringify({
                      type: "message_complete",
                      sessionId,
                      metadata,
                      response,
                      events: response.data, // Parsed JSONL events for rich UI
                    })
                  );
                } catch (err: any) {
                  fastify.log.error({ err }, "Agent CLI SDK error");

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
                  socket.send(
                    JSON.stringify({
                      type: "error",
                      sessionId,
                      message: err.message || "Failed to send message",
                      error: {
                        message: err.message || "Failed to send message",
                        stack: err.stack,
                        name: err.name,
                        details: err.response || err.data || undefined,
                      },
                    })
                  );
                }
              }
            } catch (err: any) {
              fastify.log.error({ err }, "Error processing WebSocket message");
              socket.send(
                JSON.stringify({
                  type: "error",
                  sessionId,
                  message: err.message || "Internal server error",
                  error: {
                    message: err.message || "Internal server error",
                    stack: err.stack,
                    name: err.name,
                    details: err.response || err.data || undefined,
                  },
                })
              );
            }
          });

          // Handle disconnection
          socket.on("close", () => {
            fastify.log.info(
              { sessionId, userId },
              "Chat WebSocket disconnected"
            );

            // Clean up session
            const sessionData = activeSessions.get(sessionId);
            if (sessionData) {
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

              // Remove from active sessions
              activeSessions.delete(sessionId);
            }
          });

          // Handle errors
          socket.on("error", (err) => {
            fastify.log.error({ err, sessionId }, "Chat WebSocket error");

            // Clean up session
            const sessionData = activeSessions.get(sessionId);
            if (sessionData?.tempImageDir) {
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

            activeSessions.delete(sessionId);
          });
        } catch (err) {
          fastify.log.error({ err }, "Fatal error in chat WebSocket handler");
          socket.close();
        }
      }
    );
  });
}
