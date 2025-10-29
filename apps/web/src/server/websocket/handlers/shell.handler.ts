import type { WebSocket } from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import { sendMessage } from "../utils/send-message.js";
import { extractId } from "../utils/extract-id.js";

/**
 * Handle shell events (shell.{id}.action)
 * Currently stubbed - shell functionality not yet implemented
 */
export async function handleShellEvent(
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
  fastify.log.info(
    { type, shellId },
    "[WebSocket] Shell event received (not implemented yet)"
  );
  sendMessage(socket, `shell.${shellId}.error`, {
    error: "Shell functionality not implemented",
    message: "Shell/terminal features are not yet implemented",
  });
}
