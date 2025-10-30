import { createContext } from 'react';
import type { WebSocketEventBus } from '@/client/lib/WebSocketEventBus';
import type { ReadyState } from '@/shared/types/websocket';
import type { ChannelEvent } from '@/shared/websocket';

/**
 * WebSocket context interface
 */
export interface WebSocketContextValue {
  sendMessage: (channel: string, event: ChannelEvent) => void;
  readyState: ReadyState;
  isConnected: boolean;
  isReady: boolean;
  connectionAttempts: number;
  eventBus: WebSocketEventBus;
  reconnect: () => void;
}

/**
 * WebSocket context - provides access to the global WebSocket connection
 */
export const WebSocketContext = createContext<WebSocketContextValue | null>(null);
