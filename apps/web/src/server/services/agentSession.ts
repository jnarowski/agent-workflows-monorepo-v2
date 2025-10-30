/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/prisma';
import fs from 'fs/promises';
import type {
  AgentSessionMetadata,
  SessionResponse,
  SyncSessionsResponse,
} from '@/shared/types/agent-session.types';
import type { AgentType } from '@/shared/types/agent.types';
import { loadMessages } from '@repo/agent-cli-sdk';
import type { UnifiedMessage } from '@repo/agent-cli-sdk';
import {
  encodeProjectPath,
  getClaudeProjectsDir,
  getSessionFilePath,
} from '@/server/utils/path';
import path from 'path';
import { isSystemMessage, stripXmlTags } from '@/shared/utils/message.utils';

/**
 * Parse a JSONL file to extract session metadata
 * @param filePath - Path to JSONL file
 * @returns Session metadata extracted from file
 */
export async function parseJSONLFile(
  filePath: string
): Promise<AgentSessionMetadata> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    let messageCount = 0;
    let totalTokens = 0;
    let lastMessageAt = new Date().toISOString();
    let firstMessagePreview = '';

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Count messages (check both 'type' for Claude CLI format and 'role' for API format)
        // Filter out system messages to match frontend display
        const isMessage = entry.type === 'user' || entry.type === 'assistant' || entry.role === 'user' || entry.role === 'assistant';
        if (isMessage) {
          // Check if this message contains only system content
          const content = entry.message?.content ?? entry.content;
          const hasOnlySystemContent = (() => {
            if (typeof content === 'string') {
              return isSystemMessage(content);
            }
            if (Array.isArray(content)) {
              // Check if all text blocks are system messages
              const textBlocks = content.filter((c: any) => c.type === 'text');
              if (textBlocks.length === 0) return false;
              return textBlocks.every((c: any) => isSystemMessage(c.text));
            }
            return false;
          })();

          // Only count messages that are not system messages
          if (!hasOnlySystemContent) {
            messageCount++;
          }
        }

        // Extract first user message for preview (skip "Warmup" and system messages)
        const isUserMessage = entry.type === 'user' || entry.role === 'user';
        if (isUserMessage && !firstMessagePreview) {
          // Handle both Claude CLI format (message.content) and API format (content)
          const content = entry.message?.content ?? entry.content;
          const text =
            typeof content === 'string'
              ? content
              : Array.isArray(content)
                ? content
                    .filter((c: any) => c.type === 'text')
                    .map((c: any) => c.text)
                    .join(' ')
                : '';

          // Skip "Warmup" messages and system messages (Caveat, command tags, etc.)
          const trimmedText = text.trim();
          if (trimmedText.toLowerCase() !== 'warmup' && !isSystemMessage(trimmedText)) {
            // Strip XML tags and take first 100 characters
            const cleanedText = stripXmlTags(text);
            firstMessagePreview = cleanedText.substring(0, 100);
          }
        }

        // Sum token usage from assistant messages
        const isAssistantMessage = entry.type === 'assistant' || entry.role === 'assistant';
        if (isAssistantMessage) {
          // Usage can be at entry.usage (API format) or entry.message.usage (Claude CLI format)
          const usage = entry.usage || entry.message?.usage;
          if (usage) {
            const messageTokens =
              (usage.input_tokens || 0) +
              (usage.cache_creation_input_tokens || 0) +
              (usage.cache_read_input_tokens || 0) +
              (usage.output_tokens || 0);
            totalTokens += messageTokens;
          }
        }

        // Track the timestamp from the latest message
        if (entry.timestamp) {
          lastMessageAt = entry.timestamp;
        }
      } catch (err) {
        // Skip malformed lines
        console.warn(`Failed to parse JSONL line: ${err}`);
      }
    }

    return {
      messageCount,
      totalTokens,
      lastMessageAt,
      firstMessagePreview: firstMessagePreview || 'Untitled Session',
    };
  } catch (error) {
    // Return default metadata if file can't be read
    throw new Error(`Failed to parse JSONL file: ${error}`);
  }
}

/**
 * Sync project sessions from filesystem to database
 * Scans ~/.claude/projects/{encodedPath}/ for JSONL files
 * @param projectId - Project ID
 * @param userId - User ID to associate with synced sessions
 * @returns Sync statistics
 */
export async function syncProjectSessions(
  projectId: string,
  userId: string
): Promise<SyncSessionsResponse> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const encodedPath = encodeProjectPath(project.path);
  const projectSessionsDir = path.join(
    getClaudeProjectsDir(),
    encodedPath
  );

  let synced = 0;
  let created = 0;
  const updated = 0;

  try {
    // Check if directory exists
    await fs.access(projectSessionsDir);

    // Read all JSONL files in directory
    const files = await fs.readdir(projectSessionsDir);
    const jsonlFiles = files.filter((file) => file.endsWith('.jsonl'));

    // Fetch all existing Claude sessions for this project
    // Only sync Claude sessions - other agents (Codex, Cursor, Gemini) have different storage locations
    const dbClaudeSessions = await prisma.agentSession.findMany({
      where: {
        projectId,
        agent: 'claude',
      },
    });

    // Also fetch IDs of all sessions (any agent) to avoid unique constraint violations
    const allSessionIds = await prisma.agentSession.findMany({
      where: { projectId },
      select: { id: true },
    });

    const existingClaudeSessionsMap = new Map(
      dbClaudeSessions.map((session) => [session.id, session])
    );

    const allExistingSessionIds = new Set(
      allSessionIds.map((session) => session.id)
    );

    const jsonlSessionIds = new Set<string>();
    const sessionsToCreate: Array<{
      id: string;
      projectId: string;
      userId: string;
      agent: 'claude';
      cli_session_id: string;
      session_path: string;
      metadata: any;
      state: 'idle';
      error_message: null;
    }> = [];

    // Parse all JSONL files and prepare batch operations
    for (const file of jsonlFiles) {
      const sessionId = path.basename(file, '.jsonl');
      const filePath = path.join(projectSessionsDir, file);
      jsonlSessionIds.add(sessionId);

      try {
        // Parse JSONL file to extract metadata
        const metadata = await parseJSONLFile(filePath);

        if (existingClaudeSessionsMap.has(sessionId)) {
          // Session already exists - skip to preserve created_at timestamp and avoid reordering
          // Metadata updates happen via WebSocket during active sessions
        } else if (allExistingSessionIds.has(sessionId)) {
          // Session exists but as a different agent type - skip to avoid conflict
          // (This can happen if the same session ID is used across different agents)
          console.warn(
            `Skipping session ${sessionId} - exists as different agent type`
          );
        } else {
          // Create new Claude session
          sessionsToCreate.push({
            id: sessionId,
            projectId,
            userId,
            agent: 'claude',
            cli_session_id: sessionId,
            session_path: filePath,
            metadata: metadata as any,
            state: 'idle',
            error_message: null,
          });
        }

        synced++;
      } catch (err) {
        console.error(`Failed to sync session ${sessionId}:`, err);
      }
    }

    // Batch create new sessions
    if (sessionsToCreate.length > 0) {
      await prisma.agentSession.createMany({
        data: sessionsToCreate,
      });
      created = sessionsToCreate.length;
    }

    // Batch delete orphaned Claude sessions (only)
    // Other agent types are not checked since they have different storage locations
    // IMPORTANT: Only delete sessions that are:
    // 1. Not in the JSONL files (orphaned)
    // 2. In "idle" state (not actively being created/used)
    // 3. Older than 5 seconds (to avoid race conditions with new session creation)
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const orphanedSessionIds = dbClaudeSessions
      .filter((session) => {
        // Keep if session has a JSONL file
        if (jsonlSessionIds.has(session.id)) {
          return false;
        }

        // Keep if session is actively being worked on
        if (session.state === 'working') {
          return false;
        }

        // Keep if session was created very recently (race condition protection)
        if (session.created_at > fiveSecondsAgo) {
          return false;
        }

        // This session is truly orphaned and safe to delete
        return true;
      })
      .map((session) => session.id);

    if (orphanedSessionIds.length > 0) {
      await prisma.agentSession.deleteMany({
        where: {
          id: { in: orphanedSessionIds },
        },
      });
    }
  } catch (error: any) {
    // Directory doesn't exist or can't be accessed
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // If directory doesn't exist, no sessions to sync
  }

  return { synced, created, updated };
}

/**
 * Get all sessions for a project
 * @param projectId - Project ID
 * @param userId - User ID (for authorization)
 * @returns Array of sessions ordered by last message date
 */
export async function getSessionsByProject(
  projectId: string,
  userId: string
): Promise<SessionResponse[]> {
  const sessions = await prisma.agentSession.findMany({
    where: {
      projectId,
      userId,
    },
    // Don't order by updated_at as sync operations set all sessions to same timestamp
    // We'll sort by metadata.lastMessageAt in application code instead
  });

  // Map to response format
  const mappedSessions = sessions.map((session) => ({
    id: session.id,
    projectId: session.projectId,
    userId: session.userId,
    name: session.name ?? undefined,
    agent: session.agent,
    cli_session_id: session.cli_session_id ?? undefined,
    session_path: session.session_path ?? undefined,
    metadata: session.metadata as AgentSessionMetadata,
    state: session.state as 'idle' | 'working' | 'error',
    error_message: session.error_message ?? undefined,
    created_at: session.created_at,
    updated_at: session.updated_at,
  }));

  // Sort by created_at (most recent first)
  // created_at is stable and doesn't change during sync operations
  return mappedSessions.sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();

    // Handle invalid dates (NaN) by treating them as oldest
    if (isNaN(aTime) && isNaN(bTime)) return 0;
    if (isNaN(aTime)) return 1; // a is older, b comes first
    if (isNaN(bTime)) return -1; // b is older, a comes first

    return bTime - aTime; // Descending order (most recent first)
  });
}

/**
 * Get messages for a specific session
 * Uses SDK to load and parse messages
 * @param sessionId - Session ID
 * @param userId - User ID (for authorization)
 * @returns Array of typed UnifiedMessage objects
 */
export async function getSessionMessages(sessionId: string, userId: string): Promise<UnifiedMessage[]> {
  // Verify session exists and user has access
  const session = await prisma.agentSession.findUnique({
    where: { id: sessionId },
    include: { project: true },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  if (session.userId !== userId) {
    throw new Error('Unauthorized access to session');
  }

  // Use cli_session_id if available (CLI-generated ID), otherwise fall back to database ID
  // This allows loading sessions for both Claude and Codex using their native session IDs
  const cliSessionId = session.cli_session_id || sessionId;

  // Use SDK to load session messages
  const messages = await loadMessages({
    tool: session.agent,
    sessionId: cliSessionId,
    projectPath: session.project.path
  });

  return messages;
}

/**
 * Create a new session
 * Creates database record (JSONL file will be created by agent-cli-sdk)
 * @param projectId - Project ID
 * @param userId - User ID
 * @param sessionId - Pre-generated session UUID
 * @param agent - Agent type (defaults to 'claude')
 * @returns Created session
 */
export async function createSession(
  projectId: string,
  userId: string,
  sessionId: string,
  agent: AgentType = 'claude'
): Promise<SessionResponse> {
  // Get project to determine session file path
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Calculate the full absolute path to the session JSONL file
  const sessionPath = getSessionFilePath(project.path, sessionId);

  // Initialize with empty metadata
  const metadata: AgentSessionMetadata = {
    totalTokens: 0,
    messageCount: 0,
    lastMessageAt: new Date().toISOString(),
    firstMessagePreview: '',
  };

  const session = await prisma.agentSession.create({
    data: {
      id: sessionId,
      projectId,
      userId,
      agent,
      session_path: sessionPath,
      metadata: metadata as any,
      state: 'working',
      error_message: null,
    },
  });

  return {
    id: session.id,
    projectId: session.projectId,
    userId: session.userId,
    name: session.name ?? undefined,
    agent: session.agent,
    cli_session_id: session.cli_session_id ?? undefined,
    session_path: session.session_path ?? undefined,
    metadata: metadata,
    state: session.state as 'idle' | 'working' | 'error',
    error_message: session.error_message ?? undefined,
    created_at: session.created_at,
    updated_at: session.updated_at,
  };
}

/**
 * Update session metadata
 * Called after messages are added to update token counts, etc.
 * @param sessionId - Session ID
 * @param metadata - Partial metadata to update
 * @returns Updated session
 */
export async function updateSessionMetadata(
  sessionId: string,
  metadata: Partial<AgentSessionMetadata>
): Promise<SessionResponse | null> {
  try {
    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return null;
    }

    const currentMetadata = session.metadata as AgentSessionMetadata;
    const updatedMetadata = { ...currentMetadata, ...metadata };

    const updatedSession = await prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        metadata: updatedMetadata as any,
        // updated_at is automatically set by Prisma @updatedAt directive
      },
    });

    return {
      id: updatedSession.id,
      projectId: updatedSession.projectId,
      userId: updatedSession.userId,
      name: updatedSession.name ?? undefined,
      agent: updatedSession.agent,
      cli_session_id: updatedSession.cli_session_id ?? undefined,
      session_path: updatedSession.session_path ?? undefined,
      metadata: updatedMetadata,
      state: updatedSession.state as 'idle' | 'working' | 'error',
      error_message: updatedSession.error_message ?? undefined,
      created_at: updatedSession.created_at,
      updated_at: updatedSession.updated_at,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return null;
      }
    }
    throw error;
  }
}

/**
 * Update session name
 * @param sessionId - Session ID
 * @param userId - User ID (for authorization)
 * @param name - New session name
 * @returns Updated session or null if not found
 */
export async function updateSessionName(
  sessionId: string,
  userId: string,
  name: string
): Promise<SessionResponse | null> {
  try {
    // Verify session exists and user has access
    const session = await prisma.agentSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      return null;
    }

    // Update session name
    const updatedSession = await prisma.agentSession.update({
      where: { id: sessionId },
      data: { name },
    });

    return {
      id: updatedSession.id,
      projectId: updatedSession.projectId,
      userId: updatedSession.userId,
      name: updatedSession.name ?? undefined,
      agent: updatedSession.agent,
      cli_session_id: updatedSession.cli_session_id ?? undefined,
      session_path: updatedSession.session_path ?? undefined,
      metadata: updatedSession.metadata as AgentSessionMetadata,
      state: updatedSession.state as 'idle' | 'working' | 'error',
      error_message: updatedSession.error_message ?? undefined,
      created_at: updatedSession.created_at,
      updated_at: updatedSession.updated_at,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return null;
      }
    }
    throw error;
  }
}
