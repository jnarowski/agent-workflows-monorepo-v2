-- AlterTable
ALTER TABLE "agent_sessions" ADD COLUMN "session_path" TEXT;

-- CreateIndex
CREATE INDEX "agent_sessions_session_path_idx" ON "agent_sessions"("session_path");
