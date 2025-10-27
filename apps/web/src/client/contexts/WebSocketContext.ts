import { createContext } from 'react';
import type { WebSocketEventBus } from '@/client/lib/WebSocketEventBus';
import type { ReadyState } from '@/shared/types/websocket';

/**
 * WebSocket context interface
 */
export interface WebSocketContextValue {
  sendMessage: (type: string, data: unknown) => void;
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
