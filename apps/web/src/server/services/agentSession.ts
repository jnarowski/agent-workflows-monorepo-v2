/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/prisma';
import fs from 'fs/promises';
import type {
  AgentSessionMetadata,
  SessionResponse,
  SyncSessionsResponse,
} from '@/shared/types/agent-session.types';
import { getAgent } from '../agents';
import type { SessionMessage } from '@/shared/types/message.types';
import {
  encodeProjectPath,
  getClaudeProjectsDir,
} from '@/server/utils/path';
import path from 'path';

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
        const isMessage = entry.type === 'user' || entry.type === 'assistant' || entry.role === 'user' || entry.role === 'assistant';
        if (isMessage) {
          messageCount++;
        }

        // Extract first user message for preview
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
          firstMessagePreview = text.substring(0, 100);
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
      firstMessagePreview: firstMessagePreview || '(No messages)',
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
  let updated = 0;

  try {
    // Check if directory exists
    await fs.access(projectSessionsDir);

    // Read all JSONL files in directory
    const files = await fs.readdir(projectSessionsDir);
    const jsonlFiles = files.filter((file) => file.endsWith('.jsonl'));

    // Fetch all existing sessions for this project in one query
    const dbSessions = await prisma.agentSession.findMany({
      where: { projectId },
    });

    const existingSessionsMap = new Map(
      dbSessions.map((session) => [session.id, session])
    );

    const jsonlSessionIds = new Set<string>();
    const sessionsToCreate: Array<{
      id: string;
      projectId: string;
      userId: string;
      agent: 'claude';
      metadata: any;
    }> = [];
    const sessionsToUpdate: Array<{
      id: string;
      metadata: any;
    }> = [];

    // Parse all JSONL files and prepare batch operations
    for (const file of jsonlFiles) {
      const sessionId = path.basename(file, '.jsonl');
      const filePath = path.join(projectSessionsDir, file);
      jsonlSessionIds.add(sessionId);

      try {
        // Parse JSONL file to extract metadata
        const metadata = await parseJSONLFile(filePath);

        if (existingSessionsMap.has(sessionId)) {
          // Prepare update
          sessionsToUpdate.push({
            id: sessionId,
            metadata: metadata as any,
          });
        } else {
          // Prepare create with agent field
          sessionsToCreate.push({
            id: sessionId,
            projectId,
            userId,
            agent: 'claude',
            metadata: metadata as any,
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

    // Batch update existing sessions
    if (sessionsToUpdate.length > 0) {
      await prisma.$transaction(
        sessionsToUpdate.map((session) =>
          prisma.agentSession.update({
            where: { id: session.id },
            data: {
              metadata: session.metadata,
            },
          })
        )
      );
      updated = sessionsToUpdate.length;
    }

    // Batch delete orphaned sessions
    const orphanedSessionIds = dbSessions
      .filter((session) => !jsonlSessionIds.has(session.id))
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
    orderBy: {
      updated_at: 'desc',
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    projectId: session.projectId,
    userId: session.userId,
    agent: session.agent,
    metadata: session.metadata as AgentSessionMetadata,
    created_at: session.created_at,
    updated_at: session.updated_at,
  }));
}

/**
 * Get messages for a specific session
 * Uses agent registry to load and parse messages
 * @param sessionId - Session ID
 * @param userId - User ID (for authorization)
 * @returns Array of typed SessionMessage objects
 */
export async function getSessionMessages(sessionId: string, userId: string): Promise<SessionMessage[]> {
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

  // Use agent registry to load session
  const agent = getAgent(session.agent);
  const messages = await agent.loadSession(sessionId, session.project.path);

  return messages;
}

/**
 * Create a new session
 * Creates database record (JSONL file will be created by agent-cli-sdk)
 * @param projectId - Project ID
 * @param userId - User ID
 * @param sessionId - Pre-generated session UUID
 * @returns Created session
 */
export async function createSession(
  projectId: string,
  userId: string,
  sessionId: string
): Promise<SessionResponse> {
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
      metadata: metadata as any,
    },
  });

  return {
    id: session.id,
    projectId: session.projectId,
    userId: session.userId,
    agent: session.agent,
    metadata: metadata,
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
      agent: updatedSession.agent,
      metadata: updatedMetadata,
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
