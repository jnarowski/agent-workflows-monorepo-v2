-- CreateEnum: WorkflowStatus
CREATE TABLE "_WorkflowStatus" (
    "value" TEXT NOT NULL PRIMARY KEY
);

INSERT INTO "_WorkflowStatus" ("value") VALUES ('pending'), ('running'), ('paused'), ('completed'), ('failed'), ('cancelled');

-- CreateEnum: WorkflowEventType
CREATE TABLE "_WorkflowEventType" (
    "value" TEXT NOT NULL PRIMARY KEY
);

INSERT INTO "_WorkflowEventType" ("value") VALUES
    ('workflow_created'),
    ('workflow_started'),
    ('workflow_completed'),
    ('workflow_failed'),
    ('workflow_paused'),
    ('workflow_resumed'),
    ('workflow_cancelled'),
    ('phase_started'),
    ('phase_completed'),
    ('step_started'),
    ('step_completed'),
    ('step_failed');

-- CreateEnum: StepStatus
CREATE TABLE "_StepStatus" (
    "value" TEXT NOT NULL PRIMARY KEY
);

INSERT INTO "_StepStatus" ("value") VALUES ('pending'), ('running'), ('completed'), ('failed'), ('skipped');

-- AlterTable: Update workflow_executions.status to use enum
-- First, ensure all existing values are valid
UPDATE "workflow_executions" SET "status" = 'pending' WHERE "status" NOT IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled');

-- AlterTable: Update workflow_execution_steps.status to use enum
-- First, ensure all existing values are valid
UPDATE "workflow_execution_steps" SET "status" = 'pending' WHERE "status" NOT IN ('pending', 'running', 'completed', 'failed', 'skipped');

-- AlterTable: Update workflow_events.event_type to use enum
-- First, ensure all existing values are valid
UPDATE "workflow_events" SET "event_type" = 'workflow_created' WHERE "event_type" NOT IN (
    'workflow_created', 'workflow_started', 'workflow_completed', 'workflow_failed',
    'workflow_paused', 'workflow_resumed', 'workflow_cancelled', 'phase_started',
    'phase_completed', 'step_started', 'step_completed', 'step_failed'
);
