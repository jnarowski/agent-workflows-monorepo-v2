import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Terminal } from '@xterm/xterm';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Represents a terminal session
 */
export interface TerminalSession {
  id: string;
  projectId: string;
  terminal: Terminal | null;
  containerElement: HTMLDivElement | null;
  status: ConnectionStatus;
  sessionId?: string; // Backend session ID from WebSocket
  error?: string;
}

interface ShellContextType {
  sessions: Map<string, TerminalSession>;
  addSession: (id: string, session: Omit<TerminalSession, 'id'>) => void;
  removeSession: (id: string) => void;
  updateSessionStatus: (id: string, status: ConnectionStatus, error?: string) => void;
  updateSession: (id: string, updates: Partial<TerminalSession>) => void;
  getSession: (id: string) => TerminalSession | undefined;
}

const ShellContext = createContext<ShellContextType | undefined>(undefined);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Map<string, TerminalSession>>(new Map());

  const addSession = useCallback(
    (id: string, session: Omit<TerminalSession, 'id'>) => {
      setSessions((prev) => {
        const newSessions = new Map(prev);
        newSessions.set(id, { id, ...session });
        return newSessions;
      });
    },
    []
  );

  const removeSession = useCallback((id: string) => {
    setSessions((prev) => {
      const newSessions = new Map(prev);
      const session = newSessions.get(id);

      // Cleanup terminal if it exists
      if (session?.terminal) {
        session.terminal.dispose();
      }

      newSessions.delete(id);
      return newSessions;
    });
  }, []);

  const updateSessionStatus = useCallback(
    (id: string, status: ConnectionStatus, error?: string) => {
      setSessions((prev) => {
        const newSessions = new Map(prev);
        const session = newSessions.get(id);

        if (session) {
          newSessions.set(id, { ...session, status, error });
        }

        return newSessions;
      });
    },
    []
  );

  const updateSession = useCallback(
    (id: string, updates: Partial<TerminalSession>) => {
      setSessions((prev) => {
        const newSessions = new Map(prev);
        const session = newSessions.get(id);

        if (session) {
          newSessions.set(id, { ...session, ...updates });
        }

        return newSessions;
      });
    },
    []
  );

  const getSession = useCallback(
    (id: string) => {
      return sessions.get(id);
    },
    [sessions]
  );

  return (
    <ShellContext.Provider
      value={{
        sessions,
        addSession,
        removeSession,
        updateSessionStatus,
        updateSession,
        getSession,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const context = useContext(ShellContext);
  if (context === undefined) {
    throw new Error('useShell must be used within a ShellProvider');
  }
  return context;
}
