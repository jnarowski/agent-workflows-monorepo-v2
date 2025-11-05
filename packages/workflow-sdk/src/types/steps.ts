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
  /** Display name for the step (defaults to step ID) */
  name?: string;
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
  operation: "commit" | "branch" | "pr";
  /** Commit message (for commit operation) */
  message?: string;
  /** Branch name (for branch/pr operation) */
  branch?: string;
  /** Base branch for PR (default: main) */
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
  operation: "commit" | "branch" | "pr";
  /** Commit SHA */
  commitSha?: string;
  /** Branch name */
  branch?: string;
  /** PR number */
  prNumber?: number;
  /** PR URL */
  prUrl?: string;
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
  /** Display name for the step (defaults to step ID) */
  displayName?: string;
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

/**
 * Extended step interface with custom workflow step methods
 */
export interface WorkflowStep extends InngestStepTools {
  /**
   * Execute a workflow phase with automatic retry logic
   * @param id - Phase ID
   * @param fn - Phase function to execute
   * @param options - Phase configuration (description)
   */
  phase<T>(
    id: string,
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
   * Execute a slash command via agent
   * @param command - Slash command (e.g., "/commit")
   * @param args - Command arguments
   * @param options - Step options (timeout)
   */
  slash(
    command: string,
    args?: string[],
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
   * @param id - Step ID
   * @param config - Artifact configuration (includes optional displayName field)
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
