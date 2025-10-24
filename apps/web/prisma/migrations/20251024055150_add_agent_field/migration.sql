-- CreateEnum (SQLite doesn't have enums, but Prisma handles this)
-- Add agent column to agent_sessions table
ALTER TABLE agent_sessions ADD COLUMN agent TEXT NOT NULL DEFAULT 'claude';

-- Update existing rows to have 'claude' as the agent
UPDATE agent_sessions SET agent = 'claude' WHERE agent IS NULL;
