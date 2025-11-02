/*
  Warnings:

  - You are about to drop the `workflow_steps` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `workflows` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "workflow_steps";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "workflows";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "phases" JSONB NOT NULL,
    "args_schema" JSONB,
    "is_template" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workflow_definition_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "current_phase" TEXT,
    "current_step_index" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "paused_at" DATETIME,
    "cancelled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workflow_executions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_executions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_executions_workflow_definition_id_fkey" FOREIGN KEY ("workflow_definition_id") REFERENCES "workflow_definitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workflow_execution_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_execution_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "log_directory_path" TEXT,
    "agent_session_id" TEXT,
    "error_message" TEXT,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workflow_execution_steps_workflow_execution_id_fkey" FOREIGN KEY ("workflow_execution_id") REFERENCES "workflow_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_execution_steps_agent_session_id_fkey" FOREIGN KEY ("agent_session_id") REFERENCES "agent_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workflow_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_execution_id" TEXT NOT NULL,
    "workflow_execution_step_id" TEXT,
    "text" TEXT NOT NULL,
    "comment_type" TEXT NOT NULL DEFAULT 'user',
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workflow_comments_workflow_execution_id_fkey" FOREIGN KEY ("workflow_execution_id") REFERENCES "workflow_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_comments_workflow_execution_step_id_fkey" FOREIGN KEY ("workflow_execution_step_id") REFERENCES "workflow_execution_steps" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_comments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workflow_artifacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_execution_step_id" TEXT NOT NULL,
    "workflow_comment_id" TEXT,
    "name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workflow_artifacts_workflow_execution_step_id_fkey" FOREIGN KEY ("workflow_execution_step_id") REFERENCES "workflow_execution_steps" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_artifacts_workflow_comment_id_fkey" FOREIGN KEY ("workflow_comment_id") REFERENCES "workflow_comments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "workflow_definitions_type_idx" ON "workflow_definitions"("type");

-- CreateIndex
CREATE INDEX "workflow_definitions_is_template_idx" ON "workflow_definitions"("is_template");

-- CreateIndex
CREATE INDEX "workflow_executions_project_id_status_idx" ON "workflow_executions"("project_id", "status");

-- CreateIndex
CREATE INDEX "workflow_executions_user_id_status_idx" ON "workflow_executions"("user_id", "status");

-- CreateIndex
CREATE INDEX "workflow_executions_workflow_definition_id_idx" ON "workflow_executions"("workflow_definition_id");

-- CreateIndex
CREATE INDEX "workflow_executions_status_idx" ON "workflow_executions"("status");

-- CreateIndex
CREATE INDEX "workflow_execution_steps_workflow_execution_id_status_idx" ON "workflow_execution_steps"("workflow_execution_id", "status");

-- CreateIndex
CREATE INDEX "workflow_execution_steps_agent_session_id_idx" ON "workflow_execution_steps"("agent_session_id");

-- CreateIndex
CREATE INDEX "workflow_execution_steps_status_idx" ON "workflow_execution_steps"("status");

-- CreateIndex
CREATE INDEX "workflow_comments_workflow_execution_id_idx" ON "workflow_comments"("workflow_execution_id");

-- CreateIndex
CREATE INDEX "workflow_comments_workflow_execution_step_id_idx" ON "workflow_comments"("workflow_execution_step_id");

-- CreateIndex
CREATE INDEX "workflow_comments_created_by_idx" ON "workflow_comments"("created_by");

-- CreateIndex
CREATE INDEX "workflow_artifacts_workflow_execution_step_id_idx" ON "workflow_artifacts"("workflow_execution_step_id");

-- CreateIndex
CREATE INDEX "workflow_artifacts_workflow_comment_id_idx" ON "workflow_artifacts"("workflow_comment_id");
