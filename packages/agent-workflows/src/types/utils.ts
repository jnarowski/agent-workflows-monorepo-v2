/**
 * Type definitions for Claude Code programmatic execution
 */

/**
 * Retry codes for categorizing errors and determining retry behavior
 */
export enum RetryCode {
  NONE = "none",
  CLAUDE_CODE_ERROR = "claude_code_error",
  TIMEOUT_ERROR = "timeout_error",
  EXECUTION_ERROR = "execution_error",
  ERROR_DURING_EXECUTION = "error_during_execution",
}

/**
 * Model set types for determining which model to use
 */
export type ModelSet = "base" | "heavy";

/**
 * Slash command types
 */
export type SlashCommand =
  | "/generate-feature"
  | "/implement-spec"
  | "/create-branch"
  | "/create-pr";

/**
 * Base request for Claude Code prompt execution
 */
export interface AgentPromptRequest {
  /** The prompt to send to Claude Code */
  prompt: string;
  /** ADW (Automated Development Workflow) ID for tracking */
  workflow_id: string;
  /** Name of the agent making the request */
  agent_name: string;
  /** Model to use (e.g., "sonnet", "opus") */
  model: string;
  /** Output file path for JSONL response */
  output_file: string;
  /** Working directory for command execution */
  working_dir?: string;
  /** Skip permission prompts (use with caution) */
  dangerously_skip_permissions?: boolean;
  /** Enable verbose logging with formatted debug output */
  verbose?: boolean;
}

/**
 * Response from Claude Code execution
 */
export interface AgentPromptResponse {
  /** Output text from Claude Code */
  output: string;
  /** Whether the execution was successful */
  success: boolean;
  /** Session ID from Claude Code (if available) */
  session_id: string | null;
  /** Retry code indicating error type and retry behavior */
  retry_code: RetryCode;
}

/**
 * Request for executing a Claude Code template with slash command
 */
export interface AgentTemplateRequest {
  /** Name of the agent making the request */
  agent_name: string;
  /** Slash command to execute */
  slash_command: SlashCommand;
  /** Arguments for the slash command */
  args: string[];
  /** ADW ID for tracking */
  workflow_id: string;
  /** Model to use (optional, will be auto-selected if not provided) */
  model?: string;
  /** Working directory for command execution */
  working_dir?: string;
}

/**
 * Result message from Claude Code JSONL output
 */
export interface ClaudeCodeResultMessage {
  type: "result";
  result?: string;
  is_error?: boolean;
  subtype?: string;
  session_id?: string;
}

/**
 * Assistant message from Claude Code JSONL output
 */
export interface ClaudeCodeAssistantMessage {
  type: "assistant";
  message?: {
    content?: Array<{
      type: string;
      text?: string;
    }>;
  };
}

/**
 * Any message type from Claude Code JSONL output
 */
export type ClaudeCodeMessage =
  | ClaudeCodeResultMessage
  | ClaudeCodeAssistantMessage
  | { type: string; [key: string]: unknown };

/**
 * Retry configuration for Claude Code execution
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Delay in milliseconds before each retry attempt (default: [1000, 3000, 5000]) */
  delays: number[];
}

/**
 * Configuration for executing Claude Code programmatically
 * Supports both direct prompt execution and slash command execution
 */
export interface ClaudeCodeConfig {
  /** Direct prompt to execute (mutually exclusive with slashCommand) */
  prompt?: string;

  /** Slash command to execute (mutually exclusive with prompt) */
  slashCommand?: SlashCommand;

  /** Arguments for the slash command (only used with slashCommand) */
  args?: string[];

  /** Workflow ID for tracking and output organization */
  workflow_id: string;

  /** Name of the agent making the request (default: "ops") */
  agent_name?: string;

  /** Model to use (default: "sonnet") */
  model?: string;

  /** Working directory for command execution (default: process.cwd()) */
  working_dir?: string;

  /** Output file path for JSONL response (default: auto-generated) */
  output_file?: string;

  /** Timeout in milliseconds (default: 600000 = 10 minutes) */
  timeout?: number;

  /** Skip permission prompts (default: true for automation) */
  dangerously_skip_permissions?: boolean;

  /** Retry configuration (default: 3 retries with [1000, 3000, 5000]ms delays) */
  retries?: Partial<RetryConfig>;

  /** Enable verbose logging with formatted debug output in console (default: false)
   *  Note: --verbose is always passed to Claude Code CLI for stream-json format */
  verbose?: boolean;
}

/**
 * Response from executing Claude Code
 * Same as AgentPromptResponse for backwards compatibility
 */
export interface ClaudeCodeResponse {
  /** Output text from Claude Code */
  output: string;
  /** Whether the execution was successful */
  success: boolean;
  /** Session ID from Claude Code (if available) */
  session_id: string | null;
  /** Retry code indicating error type and retry behavior */
  retry_code: RetryCode;
}
