import type { ClaudePermissionMode } from "@/client/pages/projects/sessions/stores/sessionStore";
import type { AgentType } from "@/shared/types/agent.types";

/**
 * Configuration object for initializing a new session
 * Passed via URL query parameter when creating a session
 */
export interface NewSessionConfig {
  /** Initial message to send */
  query: string;
  /** Permission mode for the session */
  permissionMode: ClaudePermissionMode;
  /** Optional: Agent type (defaults to 'claude') */
  agent?: AgentType;
  /** Optional: Image data URLs for the initial message */
  images?: string[];
}

/**
 * Encode session config to base64 for URL parameter
 * @param config - Session configuration object
 * @returns Base64-encoded JSON string
 */
export function encodeSessionConfig(config: NewSessionConfig): string {
  return btoa(JSON.stringify(config));
}

/**
 * Decode session config from base64 URL parameter
 * @param encoded - Base64-encoded config string
 * @returns Parsed config object or null if invalid
 */
export function decodeSessionConfig(encoded: string): NewSessionConfig | null {
  try {
    const decoded = atob(encoded);
    const config = JSON.parse(decoded) as NewSessionConfig;

    // Basic validation
    if (!config.query || !config.permissionMode) {
      console.error("[sessionConfig] Invalid config: missing required fields");
      return null;
    }

    return config;
  } catch (error) {
    console.error("[sessionConfig] Failed to decode config:", error);
    return null;
  }
}
