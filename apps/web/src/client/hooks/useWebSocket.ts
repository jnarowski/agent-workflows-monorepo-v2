import { useContext } from 'react';
import { WebSocketContext, type WebSocketContextValue } from '@/client/contexts/WebSocketContext';

/**
 * useWebSocket Hook
 *
 * Provides access to the global WebSocket connection and EventBus.
 * Must be used within a WebSocketProvider.
 *
 * @returns WebSocket context value with sendMessage, readyState, isConnected, and eventBus
 * @throws Error if used outside of WebSocketProvider
 *
 * @example
 * ```tsx
 * const { sendMessage, isConnected, eventBus } = useWebSocket();
 *
 * // Subscribe to events
 * useEffect(() => {
 *   const handler = (data) => console.log('Received:', data);
 *   eventBus.on('session.123.stream_output', handler);
 *   return () => eventBus.off('session.123.stream_output', handler);
 * }, [eventBus]);
 *
 * // Send messages
 * sendMessage('session.123.send_message', { message: 'Hello' });
 * ```
 */
export const useWebSocket = (): WebSocketContextValue => {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error(
      'useWebSocket must be used within a WebSocketProvider. ' +
        'Wrap your app with <WebSocketProvider> to use this hook.'
    );
  }

  return context;
};
