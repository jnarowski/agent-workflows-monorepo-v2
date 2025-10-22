import type { BaseStorage } from '../storage/BaseStorage';
import type { WorkflowStateData, StepStatus, ExecutionResponse, Cli, CheckpointResult } from '../types/workflow';
import type { ClaudeExecutionOptions, CodexExecutionOptions } from '@repo/agent-cli-sdk';
import type { Result } from '../utils/result';
import { ok, err } from '../utils/result';
import path from 'path';
import { simpleGit, type SimpleGit } from 'simple-git';

/**
 * Configuration for creating a Workflow instance.
 *
 * @example
 * const config: WorkflowConfig = {
 *   storage: new FileStorage({ workflowId: "my-workflow" }),
 *   cwd: '/path/to/repo' // Optional, defaults to process.cwd()
 * };
 * const workflow = new Workflow(config);
 */
export interface WorkflowConfig {
  /** The storage adapter to use for persisting workflow state */
  storage: BaseStorage;
  /** Working directory for git operations (defaults to process.cwd()) */
  cwd?: string;
}

/**
 * Configuration for executing a generic workflow step.
 *
 * @typeParam T - The type of data returned by the step function
 *
 * @example
 * const config: ExecuteStepConfig<{ success: boolean }> = {
 *   fn: async () => ({ success: true })
 * };
 * await workflow.executeStep("myStep", config);
 */
export interface ExecuteStepConfig<T = unknown> {
  /** Async function to execute as the workflow step */
  fn: () => Promise<T>;
}

/**
 * Configuration for executing a CLI-based workflow step.
 *
 * @example
 * const config: ExecuteCliStepConfig = {
 *   cli: claude,
 *   prompt: "Analyze the code and provide recommendations",
 *   cliOptions: { model: "sonnet", timeout: 60000 }
 * };
 * await workflow.executeCliStep("analyze", config);
 */
export interface ExecuteCliStepConfig {
  /** The CLI adapter instance to execute the step */
  cli: Cli;
  /** Optional CLI-specific execution options (model, timeout, etc.) */
  cliOptions?: ClaudeExecutionOptions | CodexExecutionOptions;
  /** The prompt to send to the CLI */
  prompt: string;
}

/**
 * Options for ensureBranch
 */
export interface EnsureBranchOptions {
  createIfMissing?: boolean;
  commitMessage?: string;
}

/**
 * Result data for ensureBranch
 */
export interface EnsureBranchResult {
  wasOnBranch: boolean;
  committedChanges: boolean;
  createdBranch: boolean;
  previousBranch?: string;
}

/**
 * Workflow orchestrates workflow execution using pluggable storage backends.
 * Provides a unified API for step execution, state management, and metadata tracking.
 */
export class Workflow {
  private readonly storage: BaseStorage;
  private readonly _id: string;
  private readonly git: SimpleGit;
  private readonly cwd: string;

  constructor(config: WorkflowConfig) {
    this.storage = config.storage;
    this._id = config.storage.getWorkflowId();
    this.cwd = config.cwd || process.cwd();
    this.git = simpleGit(this.cwd);
  }

  // ============================================================
  // Core Properties
  // ============================================================

  /**
   * Gets the workflow ID (readonly property accessor).
   */
  get id(): string {
    return this._id;
  }

  /**
   * Gets the current step number (readonly property accessor).
   * Returns 0 if no steps have been executed yet.
   */
  get currentStepNumber(): number {
    return this.storage.getState().currentStepNumber || 0;
  }

  // ============================================================
  // State Management
  // ============================================================

  /**
   * Gets the entire workflow state.
   */
  getState(): WorkflowStateData {
    return this.storage.getState();
  }

  /**
   * Sets workflow state (partial update).
   *
   * @example
   * const result = await workflow.setState({ branchName: "feat/test", status: "running" });
   * if (!result.ok) console.error("Failed to set state:", result.error);
   */
  async setState(state: Partial<WorkflowStateData>): Promise<Result<void, string>> {
    try {
      await this.storage.setState(state);
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(`Failed to set state: ${message}`);
    }
  }

  /**
   * Sets state for a specific step.
   * This is a convenience method that stores step results in the `steps` namespace.
   *
   * @example
   * const result = await workflow.setStepState("analyze", { result: "success", findings: [...] });
   * if (!result.ok) console.error("Failed to set step state:", result.error);
   */
  async setStepState(stepName: string, stepData: unknown): Promise<Result<void, string>> {
    try {
      const currentSteps = this.storage.getState().steps || {};
      await this.storage.setState({
        steps: {
          ...currentSteps,
          [stepName]: stepData,
        },
      });
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(`Failed to set step state: ${message}`);
    }
  }

  /**
   * Gets state for a specific step.
   *
   * @example
   * const analyzeResult = workflow.getStepState("analyze");
   */
  getStepState(stepName: string): unknown {
    return this.storage.getState().steps?.[stepName];
  }

  // ============================================================
  // Step Execution
  // ============================================================

  /**
   * Executes a generic function as a workflow step with automatic logging and state management.
   * Automatically updates step status during execution and increments the step counter.
   *
   * @param name - The name of the step
   * @param config - Step execution configuration
   * @returns Result containing the function result or error message
   *
   * @example
   * const result = await workflow.executeStep("analyze", {
   *   fn: async () => ({ analyzed: true })
   * });
   * if (result.ok) {
   *   console.log("Analysis result:", result.data);
   *   console.log("Step number:", workflow.currentStepNumber);
   * } else {
   *   console.error("Step failed:", result.error);
   * }
   */
  async executeStep<T = unknown>(name: string, config: ExecuteStepConfig<T>): Promise<Result<T, string>> {
    await this._markStepRunning(name);
    const stepLabel = this._getStepLabel(name);
    this._logStepStart(stepLabel);

    try {
      const result = await config.fn();
      this._logStepComplete(stepLabel);
      await this._markStepCompleted(name, result);
      return ok(result);
    } catch (error) {
      this._logStepFailed(stepLabel, error);
      const message = error instanceof Error ? error.message : String(error);
      await this.storage.addFailure(name, error as Error);
      return err(message);
    }
  }

  /**
   * Executes a CLI step with automatic logging, state management, and auto-configured logPath.
   * Automatically updates step status during execution and increments the step counter.
   *
   * @param name - The name of the step
   * @param config - CLI step execution configuration
   * @returns Result containing the CLI response or error message
   *
   * @example
   * const result = await workflow.executeCliStep("plan", {
   *   cli: claude,
   *   prompt: "Create implementation plan",
   *   cliOptions: { model: "sonnet" }
   * });
   * if (result.ok) {
   *   console.log("CLI response:", result.data);
   *   console.log("Step number:", workflow.currentStepNumber);
   * } else {
   *   console.error("CLI step failed:", result.error);
   * }
   */
  async executeCliStep<TResponse = unknown>(
    name: string,
    config: ExecuteCliStepConfig
  ): Promise<Result<ExecutionResponse<TResponse>, string>> {
    const { cli, prompt, cliOptions } = config;
    await this._markStepRunning(name);
    const stepLabel = this._getStepLabel(name);
    this._logStepStart(stepLabel);

    try {
      const logPath = this._generateLogPath(name);
      const mergedOptions: Record<string, unknown> = {
        ...(cliOptions || {}),
        logPath,
      };

      const response = await cli.execute<TResponse>(prompt, mergedOptions);

      if (response.status === 'success') {
        this._logStepComplete(stepLabel);
        await this._markStepCompleted(name, response);
        return ok(response);
      } else if (response.status === 'error' || response.status === 'timeout') {
        const errorMessage = response.error?.message || 'Unknown error';
        this._logStepFailed(stepLabel, errorMessage);
        await this.storage.addFailure(name, errorMessage);
        return err(`CLI step failed: ${errorMessage} (${response.error?.code || response.status})`);
      }

      // This should never be reached, but TypeScript requires it
      return ok(response);
    } catch (error) {
      this._logStepFailed(stepLabel, error);
      const message = error instanceof Error ? error.message : String(error);
      await this.storage.addFailure(name, error as Error);
      return err(message);
    }
  }

  // ============================================================
  // Git Operations
  // NOTE: Consider extracting to WorkflowGit class if this section
  //       grows beyond 150 lines or when adding GitHub/Linear integrations
  // ============================================================

  /**
   * Ensures the workflow is on the specified branch.
   * If not on the target branch:
   * 1. Commits any uncommitted changes with an auto-generated message
   * 2. Checks out the branch (creates it if it doesn't exist)
   *
   * @param branchName - The name of the branch to ensure
   * @param options - Optional configuration
   * @returns Result containing branch switch information or error message
   */
  async ensureBranch(branchName: string, options?: EnsureBranchOptions): Promise<Result<EnsureBranchResult, string>> {
    try {
      const createIfMissing = options?.createIfMissing ?? true;
      const currentBranch = await this._getCurrentBranch();

      // Already on the target branch
      if (currentBranch === branchName) {
        return ok({
          wasOnBranch: true,
          committedChanges: false,
          createdBranch: false,
        });
      }

      // Not on target branch - need to switch
      let committedChanges = false;

      // Check for uncommitted changes and commit them
      const hasChanges = await this._hasUncommittedChanges();
      if (hasChanges) {
        const commitMessage = options?.commitMessage || `WIP: Auto-save before switching to ${branchName}`;
        await this._commitChanges(commitMessage);
        committedChanges = true;
      }

      // Check if target branch exists
      const branches = await this.git.branch();
      const branchExists = branches.all.includes(branchName);

      let createdBranch = false;

      if (branchExists) {
        // Branch exists, just checkout
        await this._checkoutBranch(branchName);
      } else if (createIfMissing) {
        // Branch doesn't exist, create it
        await this._createAndCheckoutBranch(branchName);
        createdBranch = true;
      } else {
        return err(`Branch "${branchName}" does not exist and createIfMissing is false`);
      }

      return ok({
        wasOnBranch: false,
        committedChanges,
        createdBranch,
        previousBranch: currentBranch,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(`Failed to ensure branch: ${message}`);
    }
  }

  /**
   * Commits current changes as a checkpoint and creates/updates a draft PR.
   * Automatically generates commit message from step name and number.
   * Skips silently if there are no changes to commit.
   *
   * @param message - Optional message to append to the auto-generated commit message
   * @returns Result containing checkpoint information or error message
   *
   * @example
   * const result = await workflow.commitCheckpoint();
   * if (result.ok) {
   *   console.log("Checkpoint committed:", result.data.commitSha);
   *   console.log("PR URL:", result.data.prUrl);
   * }
   *
   * @example
   * // With custom message
   * const result = await workflow.commitCheckpoint("Added validation logic");
   * // Commit message: "Checkpoint: Step 2 - validate-input - Added validation logic"
   */
  async commitCheckpoint(message?: string): Promise<Result<CheckpointResult, string>> {
    try {
      // Check if there are changes to commit
      const hasChanges = await this._hasUncommittedChanges();
      if (!hasChanges) {
        console.log('💡 No changes to commit, skipping checkpoint');
        return ok({
          committed: false,
          prAction: 'none',
        });
      }

      // Get current step info for commit message
      const state = this.getState();
      const stepNumber = state.currentStepNumber || 0;

      // Find the last completed step name from stepStatuses
      const completedSteps = Object.entries(state.stepStatuses || {})
        .filter(([, status]) => status === 'completed')
        .map(([name]) => name);

      const lastStepName = completedSteps[completedSteps.length - 1] || 'initial';
      const baseMessage = `Checkpoint: Step ${stepNumber} - ${lastStepName}`;
      const commitMessage = message ? `${baseMessage} - ${message}` : baseMessage;

      // Commit changes
      await this._commitChanges(commitMessage);
      const commitSha = await this._getLatestCommitSha();
      console.log(`✅ Committed checkpoint: ${commitSha?.substring(0, 7)}`);

      // Get current branch for PR operations
      const currentBranch = await this._getCurrentBranch();

      // Check if PR already exists for this branch
      const existingPrUrl = await this._getExistingPrUrl(currentBranch);

      let prUrl: string | undefined;
      let prAction: CheckpointResult['prAction'] = 'none';

      if (existingPrUrl) {
        // PR exists, just push to update it
        await this._pushBranch(currentBranch);
        prUrl = existingPrUrl;
        prAction = 'updated';
        console.log(`✅ Updated existing PR: ${prUrl}`);
      } else {
        // No PR exists, create a draft PR
        const prResult = await this._createDraftPr(currentBranch);
        if (prResult) {
          prUrl = prResult;
          prAction = 'created';
          // Store PR URL in state for future lookups
          await this.setState({ prUrl });
          console.log(`✅ Created draft PR: ${prUrl}`);
        }
      }

      return ok({
        committed: true,
        commitSha,
        prUrl,
        prAction,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(`Failed to commit checkpoint: ${message}`);
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  // Step execution helpers

  /**
   * Generates a formatted step label with auto-incrementing step number.
   */
  private _getStepLabel(name: string): string {
    return `Step ${this.currentStepNumber}: ${name}`;
  }

  /**
   * Logs the start of a step.
   */
  private _logStepStart(stepLabel: string): void {
    console.log(`\n🚀 Starting ${stepLabel}...`);
  }

  /**
   * Logs successful completion of a step.
   */
  private _logStepComplete(stepLabel: string): void {
    console.log(`✅ Completed ${stepLabel}`);
  }

  /**
   * Logs step failure.
   */
  private _logStepFailed(stepLabel: string, error: unknown): void {
    console.error(`❌ Failed ${stepLabel}: ${error}`);
  }

  /**
   * Updates the status of a step in the workflow state.
   * Optionally stores step result data and increments the step counter.
   */
  private async _updateStepStatus(
    stepName: string,
    status: StepStatus,
    result?: unknown,
    incrementCounter = false
  ): Promise<void> {
    const state = this.storage.getState();

    const stepStatuses = {
      ...state.stepStatuses,
      [stepName]: status,
    };

    const steps = {
      ...state.steps,
      [stepName]: result !== undefined ? result : { status },
    };

    const updates: Partial<WorkflowStateData> = {
      stepStatuses,
      steps,
    };

    if (incrementCounter) {
      updates.currentStepNumber = (state.currentStepNumber || 0) + 1;
    }

    await this.storage.setState(updates);
  }

  /**
   * Marks a step as running in the workflow state and increments the step counter.
   */
  private async _markStepRunning(stepName: string): Promise<void> {
    await this._updateStepStatus(stepName, 'running', undefined, true);
  }

  /**
   * Marks a step as completed and saves its result.
   */
  private async _markStepCompleted(stepName: string, result: unknown): Promise<void> {
    await this._updateStepStatus(stepName, 'completed', result);
  }

  /**
   * Generates the log path for CLI step execution.
   */
  private _generateLogPath(stepName: string): string {
    return path.resolve(process.cwd(), '.agent/workflows/logs', this._id, stepName);
  }

  // Git operation helpers

  /**
   * Gets the current git branch name.
   */
  private async _getCurrentBranch(): Promise<string> {
    const branch = await this.git.branch();
    return branch.current;
  }

  /**
   * Checks if there are uncommitted changes in the working tree.
   */
  private async _hasUncommittedChanges(): Promise<boolean> {
    const status = await this.git.status();
    return !status.isClean();
  }

  /**
   * Commits all changes with the given message.
   * Stages all files (git add .) before committing.
   */
  private async _commitChanges(message: string): Promise<void> {
    await this.git.add('.');
    await this.git.commit(message);
  }

  /**
   * Checks out the specified branch.
   */
  private async _checkoutBranch(branchName: string): Promise<void> {
    await this.git.checkout(branchName);
  }

  /**
   * Creates a new branch and checks it out.
   */
  private async _createAndCheckoutBranch(branchName: string): Promise<void> {
    await this.git.checkoutLocalBranch(branchName);
  }

  /**
   * Gets the SHA of the latest commit.
   */
  private async _getLatestCommitSha(): Promise<string | undefined> {
    const log = await this.git.log({ maxCount: 1 });
    return log.latest?.hash;
  }

  /**
   * Pushes the current branch to remote.
   */
  private async _pushBranch(branchName: string): Promise<void> {
    await this.git.push('origin', branchName);
  }

  /**
   * Gets the URL of an existing PR for the given branch, if one exists.
   * First checks workflow state, then falls back to git config and gh CLI.
   */
  private async _getExistingPrUrl(branchName: string): Promise<string | undefined> {
    // First check if PR URL is already in workflow state
    const state = this.getState();
    if (state.prUrl) {
      return state.prUrl;
    }

    // Not in state, try git config
    try {
      const result = await this.git.raw(['config', '--get', `branch.${branchName}.gh-pr-url`]);
      const url = result.trim() || undefined;

      // Store in state for future lookups
      if (url) {
        await this.setState({ prUrl: url });
      }

      return url;
    } catch {
      // Config key not found, try gh CLI
      try {
        const result = await this.git.raw([
          '!',
          'gh',
          'pr',
          'list',
          '--head',
          branchName,
          '--json',
          'url',
          '--jq',
          '.[0].url',
        ]);
        const url = result.trim() || undefined;

        // Store in state for future lookups
        if (url) {
          await this.setState({ prUrl: url });
        }

        return url;
      } catch {
        // gh command failed or no PR found
        return undefined;
      }
    }
  }

  /**
   * Creates a draft PR for the current branch.
   * Auto-generates title from branch name and description from commits.
   * Returns the PR URL; caller is responsible for storing it in workflow state.
   */
  private async _createDraftPr(branchName: string): Promise<string | undefined> {
    try {
      // Generate PR title from branch name
      const title = this._generatePrTitle(branchName);

      // Generate PR description
      const description = await this._generatePrDescription();

      // Create draft PR using gh CLI via git raw
      const result = await this.git.raw([
        '!',
        'gh',
        'pr',
        'create',
        '--draft',
        '--title',
        title,
        '--body',
        description,
        '--head',
        branchName,
      ]);

      const url = result.trim();
      return url || undefined;
    } catch (error) {
      console.warn('⚠️  Failed to create draft PR:', error);
      return undefined;
    }
  }

  /**
   * Generates a PR title from the branch name.
   * Example: "feat/new-feature" -> "Feature: new feature"
   */
  private _generatePrTitle(branchName: string): string {
    // Remove common prefixes like feat/, fix/, chore/, etc.
    const cleanName = branchName.replace(/^(feat|fix|chore|docs|refactor|test|style)\//, '');

    // Replace dashes and underscores with spaces
    const spacedName = cleanName.replace(/[-_]/g, ' ');

    // Capitalize first letter
    return spacedName.charAt(0).toUpperCase() + spacedName.slice(1);
  }

  /**
   * Generates a PR description from recent commits and workflow info.
   */
  private async _generatePrDescription(): Promise<string> {
    const log = await this.git.log({ maxCount: 10 });
    const commits = log.all.map((commit) => `- ${commit.message}`).join('\n');

    return `## Workflow Checkpoints\n\n${commits}\n\n---\n_Generated by workflow: ${this._id}_`;
  }

  // ============================================================
  // Factory Methods
  // ============================================================

  /**
   * Creates a new workflow with the given storage.
   */
  static async create(config: WorkflowConfig): Promise<Workflow> {
    return new Workflow(config);
  }

  /**
   * Loads an existing workflow from storage.
   * @returns Result containing Workflow instance or error message
   */
  static async load(config: WorkflowConfig): Promise<Result<Workflow, string>> {
    try {
      await config.storage.load();
      return ok(new Workflow(config));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return err(`Workflow "${config.storage.getWorkflowId()}" not found`);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      return err(`Failed to load workflow: ${errorMessage}`);
    }
  }
}
