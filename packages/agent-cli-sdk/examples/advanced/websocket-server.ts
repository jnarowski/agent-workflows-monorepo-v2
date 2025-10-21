/**
 * WebSocket server example - Real-time AI CLI execution over WebSocket
 *
 * This example demonstrates how to build a WebSocket API server that:
 * - Accepts client connections
 * - Executes AI CLI commands via AgentClient
 * - Streams real-time output back to clients
 * - Manages multiple concurrent sessions
 *
 * Usage:
 *   npm install ws
 *   node examples/advanced/websocket-server.js
 */

import { WebSocketServer, WebSocket } from 'ws';
import { AgentClient } from '../../src/index.js';
import type { Session } from '../../src/client/session.js';

// Server configuration
const PORT = 8080;
const ADAPTERS = ['claude', 'codex'] as const;

// Client connection tracking
interface ClientConnection {
  ws: WebSocket;
  clientId: string;
  sessions: Map<string, Session>;
  adapter: typeof ADAPTERS[number];
}

const clients = new Map<string, ClientConnection>();

/**
 * Create WebSocket server
 */
const wss = new WebSocketServer({ port: PORT });

console.log(`🚀 WebSocket server started on ws://localhost:${PORT}`);
console.log('Supported adapters:', ADAPTERS.join(', '));
console.log('\nWaiting for connections...\n');

/**
 * Handle new client connection
 */
wss.on('connection', (ws: WebSocket) => {
  const clientId = generateClientId();

  console.log(`[${new Date().toISOString()}] Client connected: ${clientId}`);

  const connection: ClientConnection = {
    ws,
    clientId,
    sessions: new Map(),
    adapter: 'claude', // Default adapter
  };

  clients.set(clientId, connection);

  // Send welcome message
  sendMessage(ws, {
    type: 'connected',
    clientId,
    message: 'Connected to AI CLI WebSocket server',
    adapters: ADAPTERS,
  });

  /**
   * Handle incoming messages
   */
  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      await handleMessage(connection, message);
    } catch (error) {
      sendError(ws, 'Invalid message format', error);
    }
  });

  /**
   * Handle client disconnect
   */
  ws.on('close', () => {
    console.log(`[${new Date().toISOString()}] Client disconnected: ${clientId}`);

    // Cleanup sessions
    connection.sessions.forEach(session => session.abort());
    clients.delete(clientId);
  });

  /**
   * Handle errors
   */
  ws.on('error', (error) => {
    console.error(`[${clientId}] WebSocket error:`, error);
  });
});

/**
 * Handle client messages
 */
async function handleMessage(connection: ClientConnection, message: any) {
  const { type } = message;

  switch (type) {
    case 'set-adapter':
      await handleSetAdapter(connection, message);
      break;

    case 'execute':
      await handleExecute(connection, message);
      break;

    case 'create-session':
      await handleCreateSession(connection, message);
      break;

    case 'send-message':
      await handleSendMessage(connection, message);
      break;

    case 'list-sessions':
      await handleListSessions(connection, message);
      break;

    case 'abort-session':
      await handleAbortSession(connection, message);
      break;

    default:
      sendError(connection.ws, `Unknown message type: ${type}`);
  }
}

/**
 * Set adapter for client
 */
async function handleSetAdapter(connection: ClientConnection, message: any) {
  const { adapter } = message;

  if (!ADAPTERS.includes(adapter)) {
    sendError(connection.ws, `Invalid adapter: ${adapter}. Supported: ${ADAPTERS.join(', ')}`);
    return;
  }

  connection.adapter = adapter;

  sendMessage(connection.ws, {
    type: 'adapter-set',
    adapter,
  });
}

/**
 * Execute a single prompt
 */
async function handleExecute(connection: ClientConnection, message: any) {
  const { prompt, options = {} } = message;

  if (!prompt) {
    sendError(connection.ws, 'Prompt is required');
    return;
  }

  try {
    const client = new AgentClient({ adapter: connection.adapter });

    const result = await client.execute(prompt, {
      ...options,
      onOutput: (data) => {
        sendMessage(connection.ws, {
          type: 'output',
          data: data.raw,
          text: data.text,
          accumulated: data.accumulated,
        });
      },
      onEvent: (event) => {
        sendMessage(connection.ws, {
          type: 'event',
          data: event,
        });
      },
    });

    sendMessage(connection.ws, {
      type: 'execution-complete',
      result,
    });
  } catch (error) {
    sendError(connection.ws, 'Execution failed', error);
  }
}

/**
 * Create a new session
 */
async function handleCreateSession(connection: ClientConnection, message: any) {
  const { options = {} } = message;

  try {
    const client = new AgentClient({ adapter: connection.adapter });
    const session = client.createSession(options);

    // Setup event listeners
    session.on('output', (raw) => {
      sendMessage(connection.ws, {
        type: 'session-output',
        sessionId: session.sessionId,
        data: raw,
      });
    });

    session.on('event', (event) => {
      sendMessage(connection.ws, {
        type: 'session-event',
        sessionId: session.sessionId,
        data: event,
      });
    });

    session.on('complete', (result) => {
      sendMessage(connection.ws, {
        type: 'session-message-complete',
        sessionId: session.sessionId,
        result,
      });
    });

    session.on('error', (error) => {
      sendMessage(connection.ws, {
        type: 'session-error',
        sessionId: session.sessionId,
        error: error.message,
      });
    });

    session.on('aborted', () => {
      sendMessage(connection.ws, {
        type: 'session-aborted',
        sessionId: session.sessionId,
      });
    });

    // Wait for first message to get session ID
    // For now, generate a temporary ID
    const tempId = `temp-${Date.now()}`;
    connection.sessions.set(tempId, session);

    sendMessage(connection.ws, {
      type: 'session-created',
      sessionId: tempId,
      adapter: connection.adapter,
    });
  } catch (error) {
    sendError(connection.ws, 'Failed to create session', error);
  }
}

/**
 * Send message to session
 */
async function handleSendMessage(connection: ClientConnection, message: any) {
  const { sessionId, message: msg, options = {} } = message;

  if (!sessionId || !msg) {
    sendError(connection.ws, 'sessionId and message are required');
    return;
  }

  const session = connection.sessions.get(sessionId);

  if (!session) {
    sendError(connection.ws, `Session not found: ${sessionId}`);
    return;
  }

  try {
    await session.send(msg, options);

    // Update session ID if it changed
    if (session.sessionId && session.sessionId !== sessionId) {
      connection.sessions.delete(sessionId);
      connection.sessions.set(session.sessionId, session);

      sendMessage(connection.ws, {
        type: 'session-id-updated',
        oldId: sessionId,
        newId: session.sessionId,
      });
    }
  } catch (error) {
    sendError(connection.ws, 'Failed to send message', error);
  }
}

/**
 * List active sessions
 */
async function handleListSessions(connection: ClientConnection, message: any) {
  const sessionList = Array.from(connection.sessions.entries()).map(([id, session]) => ({
    sessionId: id,
    messageCount: session.messageCount,
    startedAt: session.startedAt,
  }));

  sendMessage(connection.ws, {
    type: 'sessions-list',
    sessions: sessionList,
  });
}

/**
 * Abort session
 */
async function handleAbortSession(connection: ClientConnection, message: any) {
  const { sessionId } = message;

  if (!sessionId) {
    sendError(connection.ws, 'sessionId is required');
    return;
  }

  const session = connection.sessions.get(sessionId);

  if (!session) {
    sendError(connection.ws, `Session not found: ${sessionId}`);
    return;
  }

  session.abort();
  connection.sessions.delete(sessionId);

  sendMessage(connection.ws, {
    type: 'session-aborted',
    sessionId,
  });
}

/**
 * Send message to client
 */
function sendMessage(ws: WebSocket, data: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * Send error to client
 */
function sendError(ws: WebSocket, message: string, error?: any) {
  sendMessage(ws, {
    type: 'error',
    message,
    error: error?.message || String(error),
  });
}

/**
 * Generate unique client ID
 */
function generateClientId(): string {
  return `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n\nShutting down server...');

  // Abort all sessions
  clients.forEach(connection => {
    connection.sessions.forEach(session => session.abort());
  });

  wss.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});
