import type { WebSocket } from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import type {
  SubscribeMessageData,
  UnsubscribeMessageData,
} from "../types.js";
import { subscribe, unsubscribe } from "../utils/subscriptions.js";
import { validateChannelAccess } from "../utils/permissions.js";
import { sendMessage } from "../utils/send-message.js";

/**
 * Handle global events (global.*)
 */
export async function handleGlobalEvent(
  socket: WebSocket,
  type: string,
  data: unknown,
  userId: string,
  fastify: FastifyInstance
): Promise<void> {
  // Handle subscription events
  if (type === "global.subscribe") {
    await handleSubscribe(socket, data as SubscribeMessageData, userId, fastify);
    return;
  }

  if (type === "global.unsubscribe") {
    await handleUnsubscribe(socket, data as UnsubscribeMessageData, fastify);
    return;
  }

  // Unknown global event
  fastify.log.info(
    { type },
    "[WebSocket] Global event received (no handler)"
  );
}

/**
 * Handle subscribe request
 */
async function handleSubscribe(
  socket: WebSocket,
  data: SubscribeMessageData,
  userId: string,
  fastify: FastifyInstance
): Promise<void> {
  const { channels } = data;

  if (!Array.isArray(channels)) {
    sendMessage(socket, "global.subscription.error", {
      error: "Invalid subscribe request",
      message: "channels must be an array",
    });
    return;
  }

  const subscribedChannels: string[] = [];
  const deniedChannels: Array<{ channelId: string; reason: string }> = [];

  // Validate and subscribe to each channel
  for (const channelId of channels) {
    const validation = await validateChannelAccess(channelId, userId);

    if (validation.allowed) {
      subscribe(channelId, socket);
      subscribedChannels.push(channelId);
      fastify.log.info(
        { userId, channelId },
        "[WebSocket] User subscribed to channel"
      );
    } else {
      deniedChannels.push({
        channelId,
        reason: validation.reason || "Access denied",
      });
      fastify.log.warn(
        { userId, channelId, reason: validation.reason },
        "[WebSocket] Subscription denied"
      );
    }
  }

  // Send success response for subscribed channels
  if (subscribedChannels.length > 0) {
    sendMessage(socket, "global.subscription.success", {
      channels: subscribedChannels,
    });
  }

  // Send error responses for denied channels
  for (const { channelId, reason } of deniedChannels) {
    sendMessage(socket, "global.subscription.error", {
      channelId,
      reason,
    });
  }
}

/**
 * Handle unsubscribe request
 */
async function handleUnsubscribe(
  socket: WebSocket,
  data: UnsubscribeMessageData,
  fastify: FastifyInstance
): Promise<void> {
  const { channels } = data;

  if (!Array.isArray(channels)) {
    sendMessage(socket, "global.subscription.error", {
      error: "Invalid unsubscribe request",
      message: "channels must be an array",
    });
    return;
  }

  // Unsubscribe from each channel
  for (const channelId of channels) {
    unsubscribe(channelId, socket);
    fastify.log.info(
      { channelId },
      "[WebSocket] Socket unsubscribed from channel"
    );
  }

  // Send confirmation
  sendMessage(socket, "global.unsubscribe.success", {
    channels,
  });
}
