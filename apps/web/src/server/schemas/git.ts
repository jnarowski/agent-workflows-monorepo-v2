import { z } from 'zod';

// Project ID params schema
export const gitProjectParamsSchema = z.object({
  id: z.string(),
});

// File path query schema
export const gitFilePathQuerySchema = z.object({
  path: z.string(),
});

// Create branch schema
export const gitBranchBodySchema = z.object({
  name: z.string().min(1),
  from: z.string().optional(),
});

// Switch branch schema
export const gitSwitchBranchBodySchema = z.object({
  name: z.string().min(1),
});

// Stage/unstage files schema
export const gitStageFilesBodySchema = z.object({
  files: z.array(z.string()).min(1),
});

// Commit schema
export const gitCommitBodySchema = z.object({
  message: z.string().min(1),
  files: z.array(z.string()).min(1),
});

// Push schema
export const gitPushBodySchema = z.object({
  branch: z.string(),
  remote: z.string().optional(),
});

// Fetch schema
export const gitFetchBodySchema = z.object({
  remote: z.string().optional(),
});

// History query schema
export const gitHistoryQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
});

// Commit params schema
export const gitCommitParamsSchema = z.object({
  id: z.string(),
  hash: z.string(),
});

// PR data query schema
export const gitPrDataQuerySchema = z.object({
  base: z.string().default('main'),
});

// Create PR schema
export const gitCreatePrBodySchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  baseBranch: z.string().default('main'),
});

// Generate commit message schema
export const gitGenerateCommitMessageBodySchema = z.object({
  files: z.array(z.string()).min(1),
});
