import type { FastifyInstance } from 'fastify';
import {
  createSession,
  getSession,
  destroySession,
} from '@/server/services/shell';
import {
  shellMessageSchema,
  type InitMessage,
  type InputMessage,
  type ResizeMessage,
} from '@/server/schemas/shell';
import type { JWTPayload } from '@/server/utils/auth';

export async function registerShellRoute(fastify: FastifyInstance) {
  fastify.register(async (fastify) => {
    fastify.get(
      '/shell',
      { websocket: true },
      async (socket, request) => {
        try {
          fastify.log.info('Shell WebSocket connection attempt');
          let sessionId: string | null = null;
          let userId: number | null = null;

          // Authenticate the WebSocket connection using JWT
          try {
            // Get token from query params or Authorization header
            // Note: Browser WebSocket API doesn't support custom headers, so query param is necessary
            const query = request.query as { token?: string };
            const token = query.token || request.headers.authorization?.replace('Bearer ', '');

            if (!token) {
              socket.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Authentication required',
                })
              );
              socket.close();
              return;
            }

            // Verify JWT token with proper type
            const decoded = fastify.jwt.verify<JWTPayload>(token);
            userId = decoded.userId;

            fastify.log.info({ userId }, 'Shell WebSocket client authenticated');
            fastify.log.info('Setting up message handlers...');
          } catch (error) {
            fastify.log.error({ error }, 'Shell WebSocket authentication failed');
            socket.send(
              JSON.stringify({
                type: 'error',
                message: 'Invalid authentication token',
              })
            );
            socket.close();
            return;
          }

        // Handle incoming messages
        socket.on('message', async (rawMessage: Buffer) => {
          try {
            const message = JSON.parse(rawMessage.toString());

            // Validate message schema
            const validatedMessage = shellMessageSchema.parse(message);

            if (validatedMessage.type === 'init') {
              await handleInit(
                validatedMessage,
                userId!,
                socket,
                fastify
              );
            } else if (validatedMessage.type === 'input') {
              handleInput(validatedMessage, sessionId, socket);
            } else if (validatedMessage.type === 'resize') {
              handleResize(validatedMessage, sessionId, socket, fastify);
            }
          } catch (error) {
            fastify.log.error({ error }, 'Error processing shell message');
            socket.send(
              JSON.stringify({
                type: 'error',
                message:
                  error instanceof Error ? error.message : 'Unknown error',
              })
            );
          }
        });

        // Handle shell initialization
        async function handleInit(
          message: InitMessage,
          userId: number,
          socket: typeof socket,
          fastify: FastifyInstance
        ) {
          try {
            const { projectId, cols, rows } = message;
            fastify.log.info({ projectId, cols, rows, userId }, 'Initializing shell session');

            // Create shell session
            const session = await createSession(
              projectId,
              userId.toString(),
              cols,
              rows
            );

            sessionId = session.sessionId;
            fastify.log.info({ sessionId }, 'Shell session created successfully');

            // Set up PTY output handler - stream to client
            session.ptyProcess.onData((data) => {
              socket.send(
                JSON.stringify({
                  type: 'output',
                  data,
                })
              );
            });

            // Handle PTY exit
            session.ptyProcess.onExit(({ exitCode, signal }) => {
              fastify.log.info(
                { sessionId, exitCode, signal },
                'PTY process exited'
              );
              socket.send(
                JSON.stringify({
                  type: 'exit',
                  exitCode,
                  signal,
                })
              );
            });

            // Send success response
            socket.send(
              JSON.stringify({
                type: 'initialized',
                sessionId,
              })
            );

            fastify.log.info({ sessionId, projectId }, 'Shell session created');
          } catch (error) {
            fastify.log.error({ error }, 'Failed to initialize shell');
            socket.send(
              JSON.stringify({
                type: 'error',
                message:
                  error instanceof Error
                    ? error.message
                    : 'Failed to initialize shell',
              })
            );
          }
        }

        // Handle user input
        function handleInput(
          message: InputMessage,
          sessionId: string | null,
          socket: typeof socket
        ) {
          if (!sessionId) {
            socket.send(
              JSON.stringify({
                type: 'error',
                message: 'Session not initialized',
              })
            );
            return;
          }

          const session = getSession(sessionId);
          if (!session) {
            socket.send(
              JSON.stringify({
                type: 'error',
                message: 'Session not found',
              })
            );
            return;
          }

          // Write input to PTY
          session.ptyProcess.write(message.data);
        }

        // Handle terminal resize
        function handleResize(
          message: ResizeMessage,
          sessionId: string | null,
          socket: typeof socket,
          fastify: FastifyInstance
        ) {
          if (!sessionId) {
            socket.send(
              JSON.stringify({
                type: 'error',
                message: 'Session not initialized',
              })
            );
            return;
          }

          const session = getSession(sessionId);
          if (!session) {
            socket.send(
              JSON.stringify({
                type: 'error',
                message: 'Session not found',
              })
            );
            return;
          }

          // Resize PTY
          session.ptyProcess.resize(message.cols, message.rows);
          fastify.log.info(
            { sessionId, cols: message.cols, rows: message.rows },
            'Terminal resized'
          );
        }

        // Handle disconnection
        socket.on('close', () => {
          if (sessionId) {
            destroySession(sessionId, fastify.log);
            fastify.log.info({ sessionId }, 'Shell session destroyed');
          }
          fastify.log.info({ userId }, 'Shell WebSocket client disconnected');
        });

        // Handle errors
        socket.on('error', (error: Error) => {
          fastify.log.error({ error, sessionId }, 'Shell WebSocket error');
          if (sessionId) {
            destroySession(sessionId, fastify.log);
          }
        });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          fastify.log.error(
            {
              errorMessage,
              errorStack,
              errorType: error?.constructor?.name
            },
            'Fatal error in Shell WebSocket handler'
          );
          try {
            socket.send(
              JSON.stringify({
                type: 'error',
                message: errorMessage,
              })
            );
            socket.close();
          } catch (sendError) {
            const sendErrorMsg = sendError instanceof Error ? sendError.message : String(sendError);
            fastify.log.error({ sendErrorMsg }, 'Failed to send error message to client');
          }
        }
      }
    );
  });
}
