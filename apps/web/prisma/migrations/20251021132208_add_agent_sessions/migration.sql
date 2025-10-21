-- RedefineTables
-- Step 1: Create new users table with TEXT id
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- Step 2: Migrate existing data - generate UUIDs for existing users
INSERT INTO "new_users" ("id", "username", "password_hash", "created_at", "last_login", "is_active")
SELECT
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))) as id,
    "username",
    "password_hash",
    "created_at",
    "last_login",
    "is_active"
FROM "users";

-- Step 3: Drop old table and rename new one
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";

-- Step 4: Recreate unique index
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateTable
CREATE TABLE "agent_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "agent_sessions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "agent_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "agent_sessions_projectId_updated_at_idx" ON "agent_sessions"("projectId", "updated_at");

-- CreateIndex
CREATE INDEX "agent_sessions_userId_updated_at_idx" ON "agent_sessions"("userId", "updated_at");
