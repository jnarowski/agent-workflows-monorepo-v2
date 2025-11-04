-- Add identifier column to workflow_definitions
ALTER TABLE "workflow_definitions" ADD COLUMN "identifier" TEXT;

-- Populate identifier from name for existing records
UPDATE "workflow_definitions" SET "identifier" = "name" WHERE "identifier" IS NULL;

-- Create unique index on project_id + identifier
CREATE UNIQUE INDEX "workflow_definitions_project_id_identifier_key" ON "workflow_definitions"("project_id", "identifier");
