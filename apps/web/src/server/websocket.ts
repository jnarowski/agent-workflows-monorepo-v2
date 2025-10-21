import type { FastifyInstance } from 'fastify';
import { AgentClient, createClaudeAdapter } from '@repo/agent-cli-sdk';
import { agentSessionService } from './services/agent-session.service';
import { prisma } from '../shared/prisma';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// JWT payload interface (matching auth plugin)
interface JWTPayload {
  userId: string;
  username: string;
}

// WebSocket message types
interface SendMessagePayload {
  type: 'send_message';
  sessionId: string;
  message: string;
  images?: string[]; // Array of base64-encoded images or file paths
  config?: Record<string, unknown>;
}

// Active sessions map: sessionId -> { agentClient, session, projectPath, userId }
const activeSessions = new Map<
  string,
  {
    agentClient: AgentClient;
    session: any;
    projectPath: string;
    userId: string;
    tempImageDir?: string;
  }
>();

export async function registerWebSocket(fastify: FastifyInstance) {
  fastify.register(async (fastify) => {
    // Original basic WebSocket endpoint
    fastify.get('/ws', { websocket: true }, (socket) => {
      fastify.log.info('WebSocket client connected');

      // Send welcome message
      socket.send(
        JSON.stringify({
          type: 'connected',
          message: 'Welcome to Agent Workflows UI',
          timestamp: new Date().toISOString(),
        })
      );

      // Handle incoming messages
      socket.on('message', (message) => {
        const data = JSON.parse(message.toString());
        fastify.log.info({ data }, 'Received WebSocket message');

        // Echo back for now
        socket.send(
          JSON.stringify({
            type: 'echo',
            data,
            timestamp: new Date().toISOString(),
          })
        );
      });

      // Handle disconnection
      socket.on('close', () => {
        fastify.log.info('WebSocket client disconnected');
      });
    });

    // Chat WebSocket endpoint with JWT authentication
    fastify.get(
      '/ws/chat/:sessionId',
      { websocket: true },
      async (socket, request) => {
        try {
          fastify.log.info('Chat WebSocket connection attempt');

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
              request.headers.authorization?.replace('Bearer ', '');

            if (!token) {
              socket.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Authentication required',
                  sessionId,
                })
              );
              socket.close();
              return;
            }

            // Verify JWT token
            const decoded = fastify.jwt.verify<JWTPayload>(token);
            userId = decoded.userId;

            fastify.log.info({ userId, sessionId }, 'Chat WebSocket authenticated');

            // Verify session exists and user has access
            const session = await prisma.agentSession.findUnique({
              where: { id: sessionId },
              include: { project: true },
            });

            if (!session) {
              socket.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Session not found',
                  sessionId,
                })
              );
              socket.close();
              return;
            }

            if (session.userId !== userId) {
              socket.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Unauthorized access to session',
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
                type: 'connected',
                sessionId,
                timestamp: new Date().toISOString(),
              })
            );
          } catch (err: any) {
            fastify.log.error({ err }, 'Chat WebSocket authentication failed');
            socket.send(
              JSON.stringify({
                type: 'error',
                message: err.message || 'Authentication failed',
                sessionId,
              })
            );
            socket.close();
            return;
          }

          // Handle incoming messages
          socket.on('message', async (message) => {
            try {
              const data = JSON.parse(
                message.toString()
              ) as SendMessagePayload;

              if (data.type === 'send_message') {
                fastify.log.info(
                  { sessionId, userId },
                  'Processing send_message request'
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

                  // Create session with streaming callbacks
                  const agentSession = agentClient.createSession({
                    sessionId,
                    workingDirectory: projectPath,
                    onEvent: (event: any) => {
                      // Stream events back to client
                      socket.send(
                        JSON.stringify({
                          type: 'stream_event',
                          sessionId,
                          event,
                        })
                      );
                    },
                    onOutput: (outputData: any) => {
                      // Stream output back to client
                      socket.send(
                        JSON.stringify({
                          type: 'stream_output',
                          sessionId,
                          data: outputData,
                        })
                      );
                    },
                  });

                  sessionData = {
                    agentClient,
                    session: agentSession,
                    projectPath,
                    userId,
                  };

                  activeSessions.set(sessionId, sessionData);
                }

                if (!sessionData) {
                  throw new Error('Failed to initialize session');
                }

                // Handle image uploads
                let imagePaths: string[] = [];
                if (data.images && data.images.length > 0) {
                  // Create temp directory for images
                  const timestamp = Date.now();
                  const tempImageDir = path.join(
                    sessionData.projectPath,
                    '.tmp',
                    'images',
                    String(timestamp)
                  );
                  await fs.mkdir(tempImageDir, { recursive: true });

                  sessionData.tempImageDir = tempImageDir;

                  // Save images to temp directory
                  for (let i = 0; i < data.images.length; i++) {
                    const image = data.images[i];

                    // Extract file extension from base64 data URL or use default
                    let ext = '.png';
                    if (image.startsWith('data:image/')) {
                      const mimeType = image.split(';')[0].split('/')[1];
                      ext = '.' + mimeType;
                    }

                    const imagePath = path.join(
                      tempImageDir,
                      `image-${i}${ext}`
                    );

                    // If image is base64, decode and save
                    if (image.startsWith('data:')) {
                      const base64Data = image.split(',')[1];
                      await fs.writeFile(
                        imagePath,
                        Buffer.from(base64Data, 'base64')
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
                  const response = await sessionData.session.send(
                    data.message,
                    {
                      images: imagePaths.length > 0 ? imagePaths : undefined,
                      ...data.config,
                    }
                  );

                  // After message completes, update session metadata
                  const jsonlPath = agentSessionService.getSessionFilePath(
                    sessionData.projectPath,
                    sessionId
                  );
                  const metadata =
                    await agentSessionService.parseJSONLFile(jsonlPath);

                  await agentSessionService.updateSessionMetadata(
                    sessionId,
                    metadata
                  );

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
                        'Failed to clean up temp images'
                      );
                    }
                  }

                  // Send completion event
                  socket.send(
                    JSON.stringify({
                      type: 'message_complete',
                      sessionId,
                      metadata,
                      response,
                    })
                  );
                } catch (err: any) {
                  fastify.log.error({ err }, 'Agent CLI SDK error');

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
                        'Failed to clean up temp images'
                      );
                    }
                  }

                  socket.send(
                    JSON.stringify({
                      type: 'error',
                      sessionId,
                      message: err.message || 'Failed to send message',
                    })
                  );
                }
              }
            } catch (err: any) {
              fastify.log.error({ err }, 'Error processing WebSocket message');
              socket.send(
                JSON.stringify({
                  type: 'error',
                  sessionId,
                  message: err.message || 'Internal server error',
                })
              );
            }
          });

          // Handle disconnection
          socket.on('close', () => {
            fastify.log.info({ sessionId, userId }, 'Chat WebSocket disconnected');

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
                    'Failed to clean up temp images on disconnect'
                  );
                });
              }

              // Remove from active sessions
              activeSessions.delete(sessionId);
            }
          });

          // Handle errors
          socket.on('error', (err) => {
            fastify.log.error({ err, sessionId }, 'Chat WebSocket error');

            // Clean up session
            const sessionData = activeSessions.get(sessionId);
            if (sessionData?.tempImageDir) {
              fs.rm(sessionData.tempImageDir, {
                recursive: true,
                force: true,
              }).catch((cleanupErr) => {
                fastify.log.warn(
                  { err: cleanupErr },
                  'Failed to clean up temp images on error'
                );
              });
            }

            activeSessions.delete(sessionId);
          });
        } catch (err) {
          fastify.log.error({ err }, 'Fatal error in chat WebSocket handler');
          socket.close();
        }
      }
    );
  });
}
