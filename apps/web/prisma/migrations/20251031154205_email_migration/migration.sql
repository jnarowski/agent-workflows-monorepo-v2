/*
  Warnings:

  - You are about to alter the column `metadata` on the `agent_sessions` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to drop the column `username` on the `users` table. All the data in the column will be lost.
  - You are about to alter the column `settings` on the `users` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - Added the required column `email` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_agent_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "agent" TEXT NOT NULL DEFAULT 'claude',
    "cli_session_id" TEXT,
    "session_path" TEXT,
    "metadata" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'idle',
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "agent_sessions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "agent_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_agent_sessions" ("agent", "cli_session_id", "created_at", "error_message", "id", "metadata", "name", "projectId", "session_path", "state", "updated_at", "userId") SELECT "agent", "cli_session_id", "created_at", "error_message", "id", "metadata", "name", "projectId", "session_path", "state", "updated_at", "userId" FROM "agent_sessions";
DROP TABLE "agent_sessions";
ALTER TABLE "new_agent_sessions" RENAME TO "agent_sessions";
CREATE INDEX "agent_sessions_projectId_updated_at_idx" ON "agent_sessions"("projectId", "updated_at");
CREATE INDEX "agent_sessions_userId_updated_at_idx" ON "agent_sessions"("userId", "updated_at");
CREATE INDEX "agent_sessions_cli_session_id_idx" ON "agent_sessions"("cli_session_id");
CREATE INDEX "agent_sessions_session_path_idx" ON "agent_sessions"("session_path");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB
);
INSERT INTO "new_users" ("created_at", "id", "is_active", "last_login", "password_hash", "settings") SELECT "created_at", "id", "is_active", "last_login", "password_hash", "settings" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
