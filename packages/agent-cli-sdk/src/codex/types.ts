/**
 * Codex-specific types
 * Based on Codex CLI 0.46.0
 */

import type { ExecutionOptions } from '../shared/types';

/**
 * Sandbox modes for Codex execution
 * Controls what file system operations the model can perform
 */
export type SandboxMode = 'read-only' | 'workspace-write' | 'danger-full-access';

/**
 * Codex-specific configuration
 */
export interface CodexConfig {
  /** Path to codex CLI executable */
  cliPath?: string;
  /** Working directory for the agent */
  workingDir?: string;
  /** Model to use (e.g., 'gpt-5', 'o3') */
  model?: string;
  /** Sandbox policy */
  sandbox?: SandboxMode;
  /** Enable web search tool */
  search?: boolean;
  /** Configuration profile from config.toml */
  profile?: string;
  /** Use open source model provider (requires Ollama) */
  oss?: boolean;
  /** Allow additional configuration options */
  [key: string]: unknown;
}

/**
 * Codex-specific execution options
 *
 * NOTE: Codex exec does not support approval policy flags.
 * Use fullAuto or dangerouslyBypassApprovalsAndSandbox instead.
 */
export interface CodexOptions extends ExecutionOptions {
  /** Model to use for this execution */
  model?: string;
  /** Sandbox policy for this execution */
  sandbox?: SandboxMode;
  /** Convenience flag for --full-auto (bypasses approvals with safe defaults) */
  fullAuto?: boolean;
  /** EXTREMELY DANGEROUS: Skip all confirmations and sandboxing */
  dangerouslyBypassApprovalsAndSandbox?: boolean;
  /** Image file paths to attach */
  images?: string[];
  /** Enable web search */
  search?: boolean;
  /** Skip git repo check */
  skipGitRepoCheck?: boolean;
  /** Path to JSON Schema file for output validation */
  outputSchema?: string;
  /** Color output setting */
  color?: 'always' | 'never' | 'auto';
  /** Enable JSONL output */
  json?: boolean;
  /** Include plan tool in conversation */
  includePlanTool?: boolean;
  /** File path to write last message */
  outputLastMessage?: string;
  /** Configuration overrides (key=value pairs) */
  config?: Record<string, unknown>;
  /** Configuration profile */
  profile?: string;
  /** Use OSS model provider */
  oss?: boolean;
}
