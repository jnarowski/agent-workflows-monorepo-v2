/**
 * Options that can be passed to any step method for timeout configuration
 */
export interface StepOptions {
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Configuration for phase execution with retry logic
 */
export interface PhaseOptions {
  /** Number of retry attempts on failure (default: 3) */
  retries?: number;
  /** Delay between retries in milliseconds (default: 5000) */
  retryDelay?: number;
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
   * @param name - Phase name
   * @param fn - Phase function to execute
   * @param options - Phase configuration (retries, retryDelay)
   */
  phase<T>(
    name: string,
    fn: () => Promise<T>,
    options?: PhaseOptions
  ): Promise<T>;

  /**
   * Execute an AI agent
   * @param name - Step name
   * @param config - Agent configuration
   * @param options - Step options (timeout)
   */
  agent(
    name: string,
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
   * @param name - Step name
   * @param config - Git configuration
   * @param options - Step options (timeout)
   */
  git(
    name: string,
    config: GitStepConfig,
    options?: StepOptions
  ): Promise<GitStepResult>;

  /**
   * Execute a CLI command
   * @param name - Step name
   * @param command - Shell command
   * @param config - CLI configuration
   * @param options - Step options (timeout)
   */
  cli(
    name: string,
    command: string,
    config?: Omit<CliStepConfig, "command">,
    options?: StepOptions
  ): Promise<CliStepResult>;

  /**
   * Upload an artifact (file, directory, text, screenshot)
   * @param name - Step name
   * @param config - Artifact configuration
   */
  artifact(
    name: string,
    config: ArtifactStepConfig
  ): Promise<ArtifactStepResult>;

  /**
   * Add a progress annotation/note to the workflow timeline
   * @param message - Annotation message
   */
  annotation(message: string): Promise<void>;
}
