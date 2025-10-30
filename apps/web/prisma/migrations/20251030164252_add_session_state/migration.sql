-- CreateEnum
CREATE TABLE "_SessionState_old" (
  "name" TEXT NOT NULL
);

INSERT INTO "_SessionState_old" ("name") VALUES ('idle'), ('working'), ('error');

-- AlterTable
ALTER TABLE "agent_sessions" ADD COLUMN "state" TEXT NOT NULL DEFAULT 'idle';
ALTER TABLE "agent_sessions" ADD COLUMN "error_message" TEXT;

-- Ensure state column only contains valid values
CREATE TRIGGER validate_session_state_insert
BEFORE INSERT ON agent_sessions
WHEN NEW.state NOT IN ('idle', 'working', 'error')
BEGIN
  SELECT RAISE(ABORT, 'Invalid session state');
END;

CREATE TRIGGER validate_session_state_update
BEFORE UPDATE ON agent_sessions
WHEN NEW.state NOT IN ('idle', 'working', 'error')
BEGIN
  SELECT RAISE(ABORT, 'Invalid session state');
END;
