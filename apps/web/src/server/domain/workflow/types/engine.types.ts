import type { FastifyBaseLogger } from "fastify";

/**
 * Runtime context passed to all workflow step implementations
 */
export interface RuntimeContext {
  /** Workflow execution ID */
  executionId: string;
  /** Project ID */
  projectId: string;
  /** User ID who triggered the workflow */
  userId: string;
  /** Current phase name (tracked for nested steps) */
  currentPhase: string | null;
  /** Fastify logger instance */
  logger: FastifyBaseLogger;
  /** Project filesystem path */
  projectPath: string;
}
