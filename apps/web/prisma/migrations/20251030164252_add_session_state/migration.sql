-- AlterTable
ALTER TABLE "agent_sessions" ADD COLUMN "state" TEXT NOT NULL DEFAULT 'idle';
ALTER TABLE "agent_sessions" ADD COLUMN "error_message" TEXT;
