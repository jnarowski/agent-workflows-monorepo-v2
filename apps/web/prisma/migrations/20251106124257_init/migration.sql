-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "phases" JSONB NOT NULL,
    "args_schema" JSONB,
    "is_template" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workflow_definitions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workflow_definition_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "spec_file" TEXT,
    "spec_content" TEXT,
    "branch_from" TEXT,
    "branch_name" TEXT,
    "worktree_name" TEXT,
    "current_phase" TEXT,
    "current_step_index" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "inngest_run_id" TEXT,
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
    "inngest_step_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
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
CREATE TABLE "workflow_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_execution_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_data" JSONB NOT NULL,
    "phase" TEXT,
    "inngest_step_id" TEXT,
    "created_by_user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workflow_events_workflow_execution_id_fkey" FOREIGN KEY ("workflow_execution_id") REFERENCES "workflow_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workflow_artifacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_execution_id" TEXT NOT NULL,
    "workflow_event_id" TEXT,
    "name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "phase" TEXT,
    "inngest_step_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workflow_artifacts_workflow_execution_id_fkey" FOREIGN KEY ("workflow_execution_id") REFERENCES "workflow_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_artifacts_workflow_event_id_fkey" FOREIGN KEY ("workflow_event_id") REFERENCES "workflow_events" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB
);

-- CreateTable
CREATE TABLE "agent_sessions" (
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

-- CreateIndex
CREATE INDEX "workflow_definitions_type_idx" ON "workflow_definitions"("type");

-- CreateIndex
CREATE INDEX "workflow_definitions_is_template_idx" ON "workflow_definitions"("is_template");

-- CreateIndex
CREATE INDEX "workflow_definitions_project_id_idx" ON "workflow_definitions"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definitions_project_id_identifier_key" ON "workflow_definitions"("project_id", "identifier");

-- CreateIndex
CREATE INDEX "workflow_executions_project_id_status_idx" ON "workflow_executions"("project_id", "status");

-- CreateIndex
CREATE INDEX "workflow_executions_user_id_status_idx" ON "workflow_executions"("user_id", "status");

-- CreateIndex
CREATE INDEX "workflow_executions_workflow_definition_id_idx" ON "workflow_executions"("workflow_definition_id");

-- CreateIndex
CREATE INDEX "workflow_executions_status_idx" ON "workflow_executions"("status");

-- CreateIndex
CREATE INDEX "workflow_executions_inngest_run_id_idx" ON "workflow_executions"("inngest_run_id");

-- CreateIndex
CREATE INDEX "workflow_execution_steps_workflow_execution_id_status_idx" ON "workflow_execution_steps"("workflow_execution_id", "status");

-- CreateIndex
CREATE INDEX "workflow_execution_steps_agent_session_id_idx" ON "workflow_execution_steps"("agent_session_id");

-- CreateIndex
CREATE INDEX "workflow_execution_steps_status_idx" ON "workflow_execution_steps"("status");

-- CreateIndex
CREATE INDEX "workflow_events_workflow_execution_id_created_at_idx" ON "workflow_events"("workflow_execution_id", "created_at");

-- CreateIndex
CREATE INDEX "workflow_events_event_type_idx" ON "workflow_events"("event_type");

-- CreateIndex
CREATE INDEX "workflow_events_phase_idx" ON "workflow_events"("phase");

-- CreateIndex
CREATE INDEX "workflow_artifacts_workflow_execution_id_idx" ON "workflow_artifacts"("workflow_execution_id");

-- CreateIndex
CREATE INDEX "workflow_artifacts_workflow_execution_id_phase_idx" ON "workflow_artifacts"("workflow_execution_id", "phase");

-- CreateIndex
CREATE INDEX "workflow_artifacts_workflow_event_id_idx" ON "workflow_artifacts"("workflow_event_id");

-- CreateIndex
CREATE INDEX "workflow_artifacts_phase_idx" ON "workflow_artifacts"("phase");

-- CreateIndex
CREATE UNIQUE INDEX "projects_path_key" ON "projects"("path");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "agent_sessions_projectId_updated_at_idx" ON "agent_sessions"("projectId", "updated_at");

-- CreateIndex
CREATE INDEX "agent_sessions_userId_updated_at_idx" ON "agent_sessions"("userId", "updated_at");

-- CreateIndex
CREATE INDEX "agent_sessions_cli_session_id_idx" ON "agent_sessions"("cli_session_id");

-- CreateIndex
CREATE INDEX "agent_sessions_session_path_idx" ON "agent_sessions"("session_path");
