-- CreateTable
CREATE TABLE "workflow_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_execution_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_data" TEXT NOT NULL,
    "workflow_execution_step_id" TEXT,
    "created_by_user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workflow_events_workflow_execution_id_fkey" FOREIGN KEY ("workflow_execution_id") REFERENCES "workflow_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_events_workflow_execution_step_id_fkey" FOREIGN KEY ("workflow_execution_step_id") REFERENCES "workflow_execution_steps" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "workflow_events_workflow_execution_id_created_at_idx" ON "workflow_events"("workflow_execution_id", "created_at");

-- CreateIndex
CREATE INDEX "workflow_events_event_type_idx" ON "workflow_events"("event_type");

-- CreateIndex
CREATE INDEX "workflow_events_workflow_execution_step_id_idx" ON "workflow_events"("workflow_execution_step_id");

-- Migrate existing comments to events
INSERT INTO "workflow_events" (
    "id",
    "workflow_execution_id",
    "event_type",
    "event_data",
    "workflow_execution_step_id",
    "created_by_user_id",
    "created_at",
    "updated_at"
)
SELECT
    "id",
    "workflow_execution_id",
    'comment_added' as "event_type",
    json_object('text', "text", 'comment_type', "comment_type") as "event_data",
    "workflow_execution_step_id",
    "created_by" as "created_by_user_id",
    "created_at",
    "updated_at"
FROM "workflow_comments";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Update WorkflowArtifact: Replace workflow_comment_id with workflow_event_id
CREATE TABLE "new_workflow_artifacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_execution_step_id" TEXT NOT NULL,
    "workflow_event_id" TEXT,
    "name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workflow_artifacts_workflow_execution_step_id_fkey" FOREIGN KEY ("workflow_execution_step_id") REFERENCES "workflow_execution_steps" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_artifacts_workflow_event_id_fkey" FOREIGN KEY ("workflow_event_id") REFERENCES "workflow_events" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Migrate artifact data (copy workflow_comment_id to workflow_event_id since IDs are the same)
INSERT INTO "new_workflow_artifacts" SELECT "id", "workflow_execution_step_id", "workflow_comment_id", "name", "file_path", "file_type", "mime_type", "size_bytes", "created_at", "updated_at" FROM "workflow_artifacts";

DROP TABLE "workflow_artifacts";
ALTER TABLE "new_workflow_artifacts" RENAME TO "workflow_artifacts";

-- Recreate indexes
CREATE INDEX "workflow_artifacts_workflow_execution_step_id_idx" ON "workflow_artifacts"("workflow_execution_step_id");
CREATE INDEX "workflow_artifacts_workflow_event_id_idx" ON "workflow_artifacts"("workflow_event_id");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Drop old workflow_comments table
DROP TABLE "workflow_comments";
