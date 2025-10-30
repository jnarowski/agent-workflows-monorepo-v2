/**
 * Script to delete all agent sessions from the database
 * Run with: pnpm tsx scripts/delete-all-sessions.ts
 *
 * WARNING: This will permanently delete all session records!
 * This does NOT delete the actual JSONL files from the filesystem.
 */

import { prisma } from '../src/shared/prisma.js';

async function deleteAllSessions() {
  console.log('🗑️  Deleting all agent sessions...');

  try {
    // Count sessions before deletion
    const count = await prisma.agentSession.count();
    console.log(`Found ${count} sessions to delete`);

    if (count === 0) {
      console.log('✓ No sessions to delete');
      return;
    }

    // Delete all sessions
    const result = await prisma.agentSession.deleteMany({});

    console.log(`✓ Successfully deleted ${result.count} sessions`);
  } catch (error) {
    console.error('❌ Failed to delete sessions:', error);
    process.exit(1);
  }
}

deleteAllSessions()
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
