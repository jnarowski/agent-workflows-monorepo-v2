/**
 * Options that can be passed to any step method for timeout configuration
 */
export interface StepOptions {
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Configuration for phase execution
 */
export interface PhaseOptions {
  /** Optional description for the phase */
  description?: string;
}

/**
 * Configuration for agent execution step
 */
export interface AgentStepConfig {
  /** Agent type: claude, codex, gemini */
  agent: "claude" | "codex" | "gemini";
  /** Prompt or instruction for the agent */
  prompt: string;
  /** Project directory path */
  projectPath?: string;
  /** Additional context or files */
  context?: Record<string, unknown>;
  /** Permission mode for agent */
  permissionMode?: "default" | "plan" | "acceptEdits" | "bypassPermissions";
}

/**
 * Result from agent execution
 */
export interface AgentStepResult {
  /** Agent session ID */
  sessionId: string;
  /** Success status */
  success: boolean;
  /** Exit code from agent execution */
  exitCode: number;
  /** Output or error message */
  message?: string;
  /** Agent output content */
  output?: string;
  /** Number of steps executed */
  steps?: number;
}

/**
 * Configuration for git operation step
 */
export interface GitStepConfig {
  /** Display name for the step (defaults to step ID) */
  name?: string;
  /** Git operation type */
  operation: "commit" | "branch" | "pr" | "commit-and-branch";
  /** Commit message (for commit operation) */
  message?: string;
  /** Commit message (for commit-and-branch operation, defaults to "WIP: Auto-commit before branching") */
  commitMessage?: string;
  /** Branch name (for branch/pr/commit-and-branch operation) */
  branch?: string;
  /** Base branch for PR or branch creation (default: main) */
  baseBranch?: string;
  /** PR title */
  title?: string;
  /** PR body/description */
  body?: string;
  /** Auto-commit staged changes before operation */
  autoCommit?: boolean;
}

/**
 * Result from git operation
 */
export interface GitStepResult {
  /** Operation that was performed */
  operation: "commit" | "branch" | "pr" | "commit-and-branch";
  /** Commit SHA */
  commitSha?: string;
  /** Branch name */
  branch?: string;
  /** PR number */
  prNumber?: number;
  /** PR URL */
  prUrl?: string;
  /** Whether there were uncommitted changes (commit-and-branch only) */
  hadUncommittedChanges?: boolean;
  /** Whether already on target branch (commit-and-branch only) */
  alreadyOnBranch?: boolean;
  /** Success status */
  success: boolean;
}

/**
 * Configuration for CLI command execution
 */
export interface CliStepConfig {
  /** Display name for the step (defaults to step ID) */
  name?: string;
  /** Shell command to execute */
  command: string;
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Shell to use (default: /bin/sh) */
  shell?: string;
}

/**
 * Result from CLI command execution
 */
export interface CliStepResult {
  /** Command that was executed */
  command: string;
  /** Exit code */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Success status (exitCode === 0) */
  success: boolean;
}

/**
 * Configuration for artifact upload
 */
export interface ArtifactStepConfig {
  /** Artifact name */
  name: string;
  /** Artifact type */
  type: "text" | "file" | "image" | "directory";
  /** Text content (for type: text) */
  content?: string;
  /** File path (for type: file or image) */
  file?: string;
  /** Directory path (for type: directory) */
  directory?: string;
  /** File glob pattern for directory uploads */
  pattern?: string;
  /** Description */
  description?: string;
}

/**
 * Result from artifact upload
 */
export interface ArtifactStepResult {
  /** Number of artifacts uploaded */
  count: number;
  /** Artifact IDs */
  artifactIds: string[];
  /** Total size in bytes */
  totalSize: number;
}

/**
 * Configuration for annotation step
 */
export interface AnnotationStepConfig {
  /** Annotation message */
  message: string;
}

/**
 * Base Inngest step tools interface (simplified)
 * The runtime will inject the actual Inngest step implementation
 */
export interface InngestStepTools {
  run<T>(name: string, fn: () => Promise<T>): Promise<T>;
  sleep(name: string, duration: number | string): Promise<void>;
  waitForEvent(name: string, opts: { event: string; timeout: string }): Promise<unknown>;
}

// Import generated slash command types
import type { SlashCommandName, SlashCommandArgs } from './slash-commands';

/**
 * Extended step interface with custom workflow step methods
 */
export interface WorkflowStep<TPhaseId extends string = string> extends InngestStepTools {
  /**
   * Execute a workflow phase with automatic retry logic
   * @param id - Phase ID (typesafe when phases are defined in config)
   * @param fn - Phase function to execute
   * @param options - Phase configuration (description)
   */
  phase<T>(
    id: TPhaseId,
    fn: () => Promise<T>,
    options?: PhaseOptions
  ): Promise<T>;

  /**
   * Execute an AI agent
   * @param id - Step ID
   * @param config - Agent configuration (includes optional name field)
   * @param options - Step options (timeout, retries, etc.)
   */
  agent(
    id: string,
    config: AgentStepConfig,
    options?: StepOptions
  ): Promise<AgentStepResult>;

  /**
   * Execute a slash command via agent (type-safe)
   * @param command - Slash command name (autocompleted)
   * @param args - Command arguments (typed based on command)
   * @param options - Step options (timeout)
   *
   * @example
   * await step.slash('/generate-prd', {
   *   featurename: 'auth',
   *   context: 'Add OAuth',
   *   format: 'md'
   * });
   */
  slash<T extends SlashCommandName>(
    command: T,
    args: SlashCommandArgs[T],
    options?: StepOptions
  ): Promise<AgentStepResult>;

  /**
   * Execute a git operation
   * @param id - Step ID
   * @param config - Git configuration (includes optional name field)
   * @param options - Step options (timeout, continueOnError)
   */
  git(
    id: string,
    config: GitStepConfig,
    options?: StepOptions
  ): Promise<GitStepResult>;

  /**
   * Execute a CLI command
   * @param id - Step ID
   * @param config - CLI configuration (includes command and optional name field)
   * @param options - Step options (timeout, retries, continueOnError)
   */
  cli(
    id: string,
    config: CliStepConfig,
    options?: StepOptions
  ): Promise<CliStepResult>;

  /**
   * Upload an artifact (file, directory, text, screenshot)
   * @param id - Step ID or display name (auto-converted to kebab-case ID)
   * @param config - Artifact configuration
   * @param options - Step options (timeout, continueOnError)
   */
  artifact(
    id: string,
    config: ArtifactStepConfig,
    options?: StepOptions
  ): Promise<ArtifactStepResult>;

  /**
   * Add a progress annotation/note to the workflow timeline
   * @param id - Unique step identifier
   * @param config - Annotation configuration (message)
   */
  annotation(id: string, config: AnnotationStepConfig): Promise<void>;
}
