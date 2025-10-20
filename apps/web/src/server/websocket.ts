import type { FastifyInstance } from 'fastify';

export async function registerWebSocket(fastify: FastifyInstance) {
  fastify.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, (socket) => {
      fastify.log.info('WebSocket client connected');

      // Send welcome message
      socket.send(JSON.stringify({
        type: 'connected',
        message: 'Welcome to Agent Workflows UI',
        timestamp: new Date().toISOString(),
      }));

      // Handle incoming messages
      socket.on('message', (message) => {
        const data = JSON.parse(message.toString());
        fastify.log.info({ data }, 'Received WebSocket message');

        // Echo back for now
        socket.send(JSON.stringify({
          type: 'echo',
          data,
          timestamp: new Date().toISOString(),
        }));
      });

      // Handle disconnection
      socket.on('close', () => {
        fastify.log.info('WebSocket client disconnected');
      });
    });
  });
}
