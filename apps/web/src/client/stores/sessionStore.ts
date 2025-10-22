import { create } from "zustand";

// Permission mode types from agent-cli-sdk
export type ClaudePermissionMode = "default" | "plan" | "acceptEdits" | "reject";

/**
 * Session-specific settings
 */
export interface SessionSettings {
  permissionMode: ClaudePermissionMode;
  // Future: Add more session-specific settings here
  // cliTool?: 'claude' | 'codex';
  // model?: string;
}

/**
 * SessionStore state and actions
 * Tracks per-session settings with global defaults
 */
export interface SessionStore {
  // State
  defaultPermissionMode: ClaudePermissionMode;
  sessionSettings: Map<string, SessionSettings>;

  // Actions
  /**
   * Set the global default permission mode
   * @param mode - The permission mode to set as default
   */
  setDefaultPermissionMode: (mode: ClaudePermissionMode) => void;

  /**
   * Set permission mode for a specific session
   * @param sessionId - The session ID
   * @param mode - The permission mode to set
   */
  setSessionPermissionMode: (
    sessionId: string,
    mode: ClaudePermissionMode
  ) => void;

  /**
   * Get permission mode for a specific session (falls back to default)
   * @param sessionId - The session ID
   * @returns The permission mode for the session
   */
  getSessionPermissionMode: (sessionId: string) => ClaudePermissionMode;

  /**
   * Clear all settings for a specific session
   * @param sessionId - The session ID to clear
   */
  clearSessionSettings: (sessionId: string) => void;

  /**
   * Clear all session settings
   */
  clearAllSessionSettings: () => void;
}

/**
 * Session store for tracking per-session settings
 * Each session can override global defaults (e.g., permission mode)
 */
export const useSessionStore = create<SessionStore>((set, get) => ({
  // Initial state
  defaultPermissionMode: "acceptEdits",
  sessionSettings: new Map(),

  // Set global default permission mode
  setDefaultPermissionMode: (mode) => {
    set({ defaultPermissionMode: mode });
  },

  // Set permission mode for specific session
  setSessionPermissionMode: (sessionId, mode) => {
    set((state) => {
      const newSettings = new Map(state.sessionSettings);
      const currentSettings = newSettings.get(sessionId) || {
        permissionMode: state.defaultPermissionMode,
      };
      newSettings.set(sessionId, {
        ...currentSettings,
        permissionMode: mode,
      });
      return { sessionSettings: newSettings };
    });
  },

  // Get permission mode for session (with fallback to default)
  getSessionPermissionMode: (sessionId) => {
    const state = get();
    const settings = state.sessionSettings.get(sessionId);
    return settings?.permissionMode ?? state.defaultPermissionMode;
  },

  // Clear settings for specific session
  clearSessionSettings: (sessionId) => {
    set((state) => {
      const newSettings = new Map(state.sessionSettings);
      newSettings.delete(sessionId);
      return { sessionSettings: newSettings };
    });
  },

  // Clear all session settings
  clearAllSessionSettings: () => {
    set({ sessionSettings: new Map() });
  },
}));
