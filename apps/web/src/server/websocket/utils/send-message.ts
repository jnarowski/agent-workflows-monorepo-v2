import type { WebSocket } from "@fastify/websocket";

/**
 * Send a WebSocket message with flat event naming
 */
export function sendMessage(
  socket: WebSocket,
  type: string,
  data: unknown
): void {
  socket.send(JSON.stringify({ type, data }));
}
