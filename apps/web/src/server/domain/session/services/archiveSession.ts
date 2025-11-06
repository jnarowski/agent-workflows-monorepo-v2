import { prisma } from '@/shared/prisma';
import type { AgentSession } from '@prisma/client';

/**
 * Archive a session by setting is_archived to true and archived_at to current timestamp
 * @param sessionId - The ID of the session to archive
 * @param userId - The ID of the user who owns the session (for verification)
 * @returns The updated session or null if not found
 */
export async function archiveSession(
	sessionId: string,
	userId: string,
): Promise<AgentSession | null> {
	// Verify session exists and belongs to user
	const session = await prisma.agentSession.findFirst({
		where: {
			id: sessionId,
			userId,
		},
	});

	if (!session) {
		return null;
	}

	// Update session to archived
	const archivedSession = await prisma.agentSession.update({
		where: { id: sessionId },
		data: {
			is_archived: true,
			archived_at: new Date(),
		},
	});

	return archivedSession;
}
