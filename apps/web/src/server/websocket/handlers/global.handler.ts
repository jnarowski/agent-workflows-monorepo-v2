import type { WebSocket } from "@fastify/websocket";
import type { FastifyInstance } from "fastify";

/**
 * Handle global events (global.*)
 * Currently stubbed - for future global functionality like ping/pong
 */
export async function handleGlobalEvent(
  _socket: WebSocket,
  type: string,
  _data: unknown,
  _userId: string,
  fastify: FastifyInstance
): Promise<void> {
  fastify.log.info(
    { type },
    "[WebSocket] Global event received (no handler)"
  );
}
