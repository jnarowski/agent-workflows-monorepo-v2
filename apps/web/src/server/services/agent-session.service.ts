/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/prisma';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type {
  AgentSessionMetadata,
  SessionResponse,
  SyncSessionsResponse,
} from '@/shared/types/agent-session.types';

/**
 * Agent Session Service
 * Handles session management, JSONL file parsing, and sync operations
 */
export class AgentSessionService {
  /**
   * Get the Claude projects directory path
   */
  private getClaudeProjectsDir(): string {
    return path.join(os.homedir(), '.claude', 'projects');
  }

  /**
   * Encode project path for filesystem storage
   * Replaces `/` with `-` (including leading slash)
   * @param projectPath - Full project path from Project.path
   * @returns Encoded path for filesystem
   * @example "/Users/john/myproject" -> "-Users-john-myproject"
   */
  private encodeProjectPath(projectPath: string): string {
    // Replace all slashes with dashes (Claude CLI keeps the leading dash)
    return projectPath.replace(/\//g, '-');
  }

  /**
   * Get the session JSONL file path
   * @param projectPath - Project path from database
   * @param sessionId - Session UUID
   * @returns Full path to session JSONL file
   */
  getSessionFilePath(projectPath: string, sessionId: string): string {
    const encodedPath = this.encodeProjectPath(projectPath);
    return path.join(
      this.getClaudeProjectsDir(),
      encodedPath,
      `${sessionId}.jsonl`
    );
  }

  /**
   * Parse a JSONL file to extract session metadata
   * @param filePath - Path to JSONL file
   * @returns Session metadata extracted from file
   */
  async parseJSONLFile(
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
          if (isAssistantMessage && entry.usage) {
            totalTokens +=
              (entry.usage.input_tokens || 0) +
              (entry.usage.cache_creation_input_tokens || 0) +
              (entry.usage.cache_read_input_tokens || 0) +
              (entry.usage.output_tokens || 0);
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
  async syncProjectSessions(
    projectId: string,
    userId: string
  ): Promise<SyncSessionsResponse> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const encodedPath = this.encodeProjectPath(project.path);
    const projectSessionsDir = path.join(
      this.getClaudeProjectsDir(),
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

      for (const file of jsonlFiles) {
        const sessionId = path.basename(file, '.jsonl');
        const filePath = path.join(projectSessionsDir, file);

        try {
          // Parse JSONL file to extract metadata
          const metadata = await this.parseJSONLFile(filePath);

          // Check if session already exists in database
          const existingSession = await prisma.agentSession.findUnique({
            where: { id: sessionId },
          });

          if (existingSession) {
            // Update existing session
            await prisma.agentSession.update({
              where: { id: sessionId },
              data: {
                metadata: metadata as any,
                // updated_at is automatically set by Prisma @updatedAt directive
              },
            });
            updated++;
          } else {
            // Create new session
            await prisma.agentSession.create({
              data: {
                id: sessionId,
                projectId,
                userId,
                metadata: metadata as any,
              },
            });
            created++;
          }

          synced++;
        } catch (err) {
          console.error(`Failed to sync session ${sessionId}:`, err);
        }
      }

      // Check for sessions in DB that no longer have JSONL files
      const dbSessions = await prisma.agentSession.findMany({
        where: { projectId },
      });

      const jsonlSessionIds = new Set(
        jsonlFiles.map((f) => path.basename(f, '.jsonl'))
      );

      for (const session of dbSessions) {
        if (!jsonlSessionIds.has(session.id)) {
          // Delete orphaned session
          await prisma.agentSession.delete({
            where: { id: session.id },
          });
        }
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
  async getSessionsByProject(
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
      metadata: session.metadata as AgentSessionMetadata,
      created_at: session.created_at,
      updated_at: session.updated_at,
    }));
  }

  /**
   * Get messages for a specific session
   * Reads from JSONL file
   * @param sessionId - Session ID
   * @param userId - User ID (for authorization)
   * @returns Array of messages from JSONL file
   */
  async getSessionMessages(sessionId: string, userId: string): Promise<any[]> {
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

    const filePath = this.getSessionFilePath(session.project.path, sessionId);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      return lines.map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Return empty array for new sessions without messages yet
        return [];
      }
      throw error;
    }
  }

  /**
   * Create a new session
   * Creates database record (JSONL file will be created by agent-cli-sdk)
   * @param projectId - Project ID
   * @param userId - User ID
   * @param sessionId - Pre-generated session UUID
   * @returns Created session
   */
  async createSession(
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
  async updateSessionMetadata(
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
}

// Export a singleton instance
export const agentSessionService = new AgentSessionService();
