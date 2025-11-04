import { z } from "zod";

// Artifact file type enum
export const artifactTypeSchema = z.enum([
  "image",
  "video",
  "document",
  "code",
  "other",
]);

// Upload artifact request schema (for multipart form data)
export const uploadArtifactSchema = z.object({
  step_id: z.string().cuid(),
  name: z.string().min(1).max(200).optional(),
  file_type: artifactTypeSchema,
});

// Attach artifact to comment schema
export const attachArtifactSchema = z.object({
  comment_id: z.string().cuid(),
});

// Artifact response schema
export const artifactResponseSchema = z.object({
  id: z.string(),
  workflow_execution_step_id: z.string(),
  workflow_event_id: z.string().nullable(),
  name: z.string(),
  file_path: z.string(),
  file_type: z.string(),
  mime_type: z.string(),
  size_bytes: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
