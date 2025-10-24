/**
 * Agent Session Types
 * Shared type definitions for chat sessions with Claude Code
 */

import type { AgentType } from './agent.types';

/**
 * Session metadata stored in AgentSession.metadata JSON field
 */
export interface AgentSessionMetadata {
  totalTokens: number;
  messageCount: number;
  lastMessageAt: string; // ISO 8601 timestamp
  firstMessagePreview: string; // First user message preview (truncated)
}

/**
 * Request body for creating a new session
 */
export interface CreateSessionRequest {
  sessionId: string; // Pre-generated UUID
}

/**
 * Session response from API
 */
export interface SessionResponse {
  id: string;
  projectId: string;
  userId: string;
  agent: AgentType;
  metadata: AgentSessionMetadata;
  created_at: Date;
  updated_at: Date;
}

/**
 * Request to update session metadata
 */
export interface UpdateSessionMetadataRequest {
  metadata: Partial<AgentSessionMetadata>;
}

/**
 * Request to sync sessions for a project
 */
export interface SyncSessionsRequest {
  projectId: string;
}

/**
 * Sync sessions response
 */
export interface SyncSessionsResponse {
  synced: number; // Number of sessions synced from filesystem
  created: number; // Number of new sessions created
  updated: number; // Number of existing sessions updated
}
