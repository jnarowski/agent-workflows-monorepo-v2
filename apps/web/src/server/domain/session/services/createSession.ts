import { prisma } from '@/shared/prisma';
import type { AgentSessionMetadata, SessionResponse } from '@/shared/types/agent-session.types';
import type { AgentType } from '@/shared/types/agent.types';
import { getSessionFilePath } from '@/server/utils/path';

/**
 * Create a new session
 * Creates database record (JSONL file will be created by agent-cli-sdk)
 * @param projectId - Project ID
 * @param userId - User ID
 * @param sessionId - Pre-generated session UUID
 * @param agent - Agent type (defaults to 'claude')
 * @param name - Optional session name
 * @param metadataOverride - Optional metadata override (defaults to initialized metadata)
 * @returns Created session
 */
export async function createSession(
  projectId: string,
  userId: string,
  sessionId: string,
  agent: AgentType = 'claude',
  name?: string,
  metadataOverride?: Record<string, unknown>
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

  // Initialize with empty metadata or use override
  const metadata: AgentSessionMetadata = metadataOverride
    ? (metadataOverride as AgentSessionMetadata)
    : {
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
      metadata: JSON.parse(JSON.stringify(metadata)),
      state: 'working',
      error_message: null,
      ...(name && { name }),
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
