/**
 * Status of an individual step in the workflow
 */
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * The workflow state structure stored on disk.
 * Contains all workflow data including workflow metadata and step results.
 */
export type WorkflowStateData = {
  workflowId: string;
  branchName?: string;
  prUrl?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStepNumber?: number;
  stepStatuses?: Record<string, StepStatus>;
  steps?: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * Import types from @sourceborn/agent-cli-sdk for use in type aliases
 */
import type { ExecutionResponse, AIAdapter } from '@sourceborn/agent-cli-sdk';

/**
 * Re-export types from @sourceborn/agent-cli-sdk for convenience
 * This ensures type compatibility throughout the library
 */
export type { ExecutionResponse, AIAdapter };

/**
 * Type aliases for backward compatibility and clearer API naming
 */
export type Cli = AIAdapter;
export type CliResponse<T = string> = ExecutionResponse<T>;

/**
 * Represents a command argument
 */
export interface CommandArgument {
  /** Argument name */
  name: string;
  /** Whether the argument is required */
  required: boolean;
}

/**
 * Response schema parsed from JSON documentation in command files
 */
export interface ResponseSchema {
  /** Example JSON structure from the command documentation */
  exampleJson: Record<string, unknown>;
  /** Map of field names to their descriptions */
  fieldDescriptions: Map<string, string>;
}

/**
 * Represents a parsed slash command definition from frontmatter
 */
export interface CommandDefinition {
  /** Command name with leading slash (e.g., "/generate-prd") */
  name: string;
  /** Command description from frontmatter */
  description: string;
  /** List of arguments parsed from argument-hint */
  arguments: CommandArgument[];
  /** Optional response schema if command documents JSON output */
  responseSchema?: ResponseSchema;
}

/**
 * Result data returned from commitCheckpoint() method
 */
export interface CheckpointResult {
  /** Whether a commit was created (false if no changes to commit) */
  committed: boolean;
  /** The SHA of the created commit (if committed) */
  commitSha?: string;
  /** The URL of the PR (if created or updated) */
  prUrl?: string;
  /** What action was taken with the PR */
  prAction: 'created' | 'updated' | 'none';
}
