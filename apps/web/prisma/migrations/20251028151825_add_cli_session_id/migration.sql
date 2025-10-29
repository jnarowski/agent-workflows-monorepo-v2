-- AlterTable
ALTER TABLE "agent_sessions" ADD COLUMN "cli_session_id" TEXT;

-- CreateIndex
CREATE INDEX "agent_sessions_cli_session_id_idx" ON "agent_sessions"("cli_session_id");
