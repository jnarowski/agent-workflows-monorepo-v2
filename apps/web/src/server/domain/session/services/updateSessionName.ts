import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/prisma';
import type { AgentSessionMetadata, SessionResponse } from '@/shared/types/agent-session.types';

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
