import { prisma } from '@/shared/prisma';
import type { AgentSession } from '@prisma/client';

/**
 * Unarchive a session by setting is_archived to false and archived_at to null
 * @param sessionId - The ID of the session to unarchive
 * @param userId - The ID of the user who owns the session (for verification)
 * @returns The updated session or null if not found
 */
export async function unarchiveSession(
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

	// Update session to unarchived
	const unarchivedSession = await prisma.agentSession.update({
		where: { id: sessionId },
		data: {
			is_archived: false,
			archived_at: null,
		},
	});

	return unarchivedSession;
}
