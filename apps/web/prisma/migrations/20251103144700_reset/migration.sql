/*
  Warnings:

  - Added the required column `project_id` to the `workflow_definitions` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_workflow_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
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
INSERT INTO "new_workflow_definitions" ("args_schema", "created_at", "description", "id", "is_template", "name", "path", "phases", "type", "updated_at") SELECT "args_schema", "created_at", "description", "id", "is_template", "name", "path", "phases", "type", "updated_at" FROM "workflow_definitions";
DROP TABLE "workflow_definitions";
ALTER TABLE "new_workflow_definitions" RENAME TO "workflow_definitions";
CREATE INDEX "workflow_definitions_type_idx" ON "workflow_definitions"("type");
CREATE INDEX "workflow_definitions_is_template_idx" ON "workflow_definitions"("is_template");
CREATE INDEX "workflow_definitions_project_id_idx" ON "workflow_definitions"("project_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
