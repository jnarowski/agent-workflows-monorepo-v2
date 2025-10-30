import { useEffect, useState } from "react";
import { ReadyState } from "@/shared/types/websocket";
import { wsMetrics } from "@/client/lib/WebSocketMetrics";

interface ConnectionStatusBannerProps {
  readyState: ReadyState;
  isReady: boolean;
  connectionAttempts: number;
  onReconnect: () => void;
}

/**
 * ConnectionStatusBanner
 *
 * Global connection status banner shown at the top of the application.
 * Displays connection state, reconnection attempts, and average latency.
 * Always visible reconnect button for manual retry.
 */
export function ConnectionStatusBanner({
  readyState,
  isReady,
  connectionAttempts,
  onReconnect,
}: ConnectionStatusBannerProps) {
  // Debounce showing "Disconnected" state to prevent flashing during hot reload
  const [showDisconnected, setShowDisconnected] = useState(false);
  const [previousAttempts, setPreviousAttempts] = useState(connectionAttempts);
  const [averageLatency, setAverageLatency] = useState<number | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (readyState === ReadyState.CLOSED) {
      // Wait 2 seconds before showing disconnected banner
      // This prevents flashing during hot reload or quick reconnections
      timer = setTimeout(() => {
        setShowDisconnected(true);
      }, 2000);
    } else {
      // Connected or connecting - hide banner immediately
      setShowDisconnected(false);
    }

    return () => clearTimeout(timer);
  }, [readyState]);

  // Track if we're in auto-reconnection mode
  // Auto-reconnection happens when: CLOSED + connection attempts increasing
  useEffect(() => {
    if (connectionAttempts > previousAttempts) {
      setPreviousAttempts(connectionAttempts);
    }
  }, [connectionAttempts, previousAttempts]);

  // Update average latency when connected
  useEffect(() => {
    if (readyState === ReadyState.OPEN && isReady) {
      const interval = setInterval(() => {
        setAverageLatency(wsMetrics.averageLatency);
      }, 5000); // Update every 5 seconds

      return () => clearInterval(interval);
    }
  }, [readyState, isReady]);

  // Detect if auto-reconnection is in progress
  // This happens when we were CLOSED and now CONNECTING with increasing attempts
  const isReconnecting =
    readyState === ReadyState.CONNECTING &&
    connectionAttempts > 1;

  // Determine connection status message
  const getConnectionStatus = () => {
    if (readyState === ReadyState.CONNECTING && isReconnecting) {
      // Auto-reconnection in progress
      const attemptNumber = connectionAttempts - 1; // First attempt is 1, so subtract 1 for reconnect count
      return {
        message: `Reconnecting... (${Math.min(attemptNumber, 5)}/5)`,
        color: "yellow" as const,
        showReconnect: true, // Always show reconnect button
      };
    } else if (readyState === ReadyState.CONNECTING) {
      // Initial connection
      return {
        message: "Connecting...",
        color: "blue" as const,
        showReconnect: false,
      };
    } else if (readyState === ReadyState.OPEN && !isReady) {
      // Socket opened but waiting for global.connected message
      return {
        message: "Establishing connection...",
        color: "blue" as const,
        showReconnect: false,
      };
    } else if ((readyState === ReadyState.CLOSING || readyState === ReadyState.CLOSED) && showDisconnected) {
      // Only show after debounce delay
      return {
        message: "Disconnected",
        color: "yellow" as const,
        showReconnect: true, // Always show reconnect button
      };
    }
    return null;
  };

  const status = getConnectionStatus();

  if (!status) {
    return null;
  }

  return (
    <div
      className={`border-b px-4 py-2 text-sm flex items-center justify-between ${
        status.color === "blue"
          ? "bg-blue-100 border-blue-200 text-blue-800"
          : "bg-yellow-100 border-yellow-200 text-yellow-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="font-medium">{status.message}</span>
        {averageLatency !== null && status.color !== "yellow" && (
          <span className="text-xs opacity-75">
            {averageLatency}ms
          </span>
        )}
      </div>
      {status.showReconnect && (
        <button
          onClick={onReconnect}
          className={`underline hover:no-underline font-medium ${
            status.color === "blue" ? "text-blue-900" : "text-yellow-900"
          }`}
        >
          Reconnect
        </button>
      )}
    </div>
  );
}
