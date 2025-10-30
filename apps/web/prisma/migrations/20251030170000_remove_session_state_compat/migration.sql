-- Drop backward compatibility table
DROP TABLE IF EXISTS "_SessionState_old";

-- Drop validation triggers (SQLite enum simulation)
DROP TRIGGER IF EXISTS validate_session_state_insert;
DROP TRIGGER IF EXISTS validate_session_state_update;
