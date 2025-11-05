-- Drop old enum tables (no longer needed with Prisma enums)
DROP TABLE IF EXISTS "_StepStatus";
DROP TABLE IF EXISTS "_WorkflowEventType";
DROP TABLE IF EXISTS "_WorkflowStatus";

-- SQLite doesn't support DROP COLUMN, so we recreate workflow_events table
PRAGMA foreign_keys=OFF;

-- Create new workflow_events table without step relationship
CREATE TABLE "workflow_events_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workflow_execution_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "event_data" TEXT NOT NULL,
  "phase" TEXT,
  "created_by_user_id" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "workflow_events_workflow_execution_id_fkey" FOREIGN KEY ("workflow_execution_id") REFERENCES "workflow_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "workflow_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy data from old table (exclude workflow_execution_step_id if it exists)
INSERT INTO "workflow_events_new" ("id", "workflow_execution_id", "event_type", "event_data", "phase", "created_by_user_id", "created_at", "updated_at")
SELECT "id", "workflow_execution_id", "event_type", "event_data", "phase", "created_by_user_id", "created_at", "updated_at"
FROM "workflow_events";

-- Drop old table and rename new one
DROP TABLE "workflow_events";
ALTER TABLE "workflow_events_new" RENAME TO "workflow_events";

-- Create indexes
CREATE INDEX "workflow_events_workflow_execution_id_created_at_idx" ON "workflow_events"("workflow_execution_id", "created_at");
CREATE INDEX "workflow_events_event_type_idx" ON "workflow_events"("event_type");
CREATE INDEX "workflow_events_phase_idx" ON "workflow_events"("phase");

PRAGMA foreign_keys=ON;

-- Remove step relationship from workflow_artifacts
DROP INDEX IF EXISTS "workflow_artifacts_workflow_execution_step_id_idx";

-- Create new workflow_artifacts table without step relationship
CREATE TABLE "workflow_artifacts_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workflow_event_id" TEXT,
  "name" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "file_type" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "phase" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "workflow_artifacts_workflow_event_id_fkey" FOREIGN KEY ("workflow_event_id") REFERENCES "workflow_events" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Copy data from old table (without workflow_execution_step_id)
INSERT INTO "workflow_artifacts_new" ("id", "workflow_event_id", "name", "file_path", "file_type", "mime_type", "size_bytes", "phase", "created_at", "updated_at")
SELECT "id", "workflow_event_id", "name", "file_path", "file_type", "mime_type", "size_bytes", "phase", "created_at", "updated_at"
FROM "workflow_artifacts";

-- Drop old table and rename new one
DROP TABLE "workflow_artifacts";
ALTER TABLE "workflow_artifacts_new" RENAME TO "workflow_artifacts";

-- Create indexes on new table
CREATE INDEX "workflow_artifacts_workflow_event_id_idx" ON "workflow_artifacts"("workflow_event_id");
CREATE INDEX "workflow_artifacts_phase_idx" ON "workflow_artifacts"("phase");
