/**
 * Logger utilities for ADW workflows
 */

import type { AgentPromptResponse } from "../types";

export interface PipelineConfig {
  name: string;
  workflowId: string;
  cwd: string;
  context?: string;
}

export interface StepConfig {
  stepNumber: number;
  name: string;
  command: string;
}

/**
 * Log the pipeline header
 */
export function logPipelineHeader(config: PipelineConfig): void {
  console.log(`🚀 ${config.name}`);
  console.log("=".repeat(80));
  if (config.context) {
    console.log(`Context: ${config.context}`);
  }
  console.log(`Working directory: ${config.cwd}`);
  console.log(`Workflow ID: ${config.workflowId}`);
  console.log("=".repeat(80));
  console.log();
}

/**
 * Log the start of a step
 */
export function logStepStart(config: StepConfig): void {
  console.log(`📝 STEP ${config.stepNumber}: ${config.name}`);
  console.log("-".repeat(80));
}

/**
 * Log step success
 */
export function logStepSuccess(
  config: StepConfig,
  response: AgentPromptResponse,
  workflowId: string
): void {
  console.log(`✅ ${config.name} complete!`);
  console.log();
  console.log(`📄 ${config.name} Output:`);
  console.log("-".repeat(80));
  console.log(response.output);
  console.log("-".repeat(80));
  console.log();

  if (response.session_id) {
    console.log(`📊 Session ID: ${response.session_id}`);
  }

  console.log();
  console.log(
    `Output saved to: .agent/agents/${workflowId}/ops/raw_output.jsonl`
  );
  console.log(
    `Prompt saved to: .agent/agents/${workflowId}/ops/prompts/${config.command}.txt`
  );
  console.log();
  console.log("=".repeat(80));
  console.log();
}

/**
 * Log step failure and exit
 */
export function logStepFailure(
  config: StepConfig,
  response: AgentPromptResponse,
  workflowId: string,
  previousStepsSucceeded: boolean = false
): never {
  console.log(`❌ ${config.name} failed`);
  console.log();
  console.log("Error:");
  console.log("-".repeat(80));
  console.log(response.output);
  console.log("-".repeat(80));
  console.log();
  console.log(`Retry code: ${response.retry_code}`);

  if (response.session_id) {
    console.log(`Session ID: ${response.session_id}`);
  }

  console.log();
  if (previousStepsSucceeded) {
    console.log("⚠️  Previous steps succeeded but this step failed");
  }
  console.log(
    `Output saved to: .agent/agents/${workflowId}/ops/raw_output.jsonl`
  );
  process.exit(1);
}

/**
 * Log pipeline completion
 */
export function logPipelineComplete(steps: string[]): void {
  const stepsText = steps.join(" + ");
  console.log(`✅ Pipeline complete: ${stepsText} finished successfully!`);
}

/**
 * Log fatal error and exit
 */
export function logFatalError(error: unknown): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`\n\n❌ Fatal error: ${errorMessage}`);

  if (error instanceof Error && error.stack) {
    console.error("\nStack trace:");
    console.error(error.stack);
  }

  process.exit(1);
}

/**
 * Log user interruption and exit
 */
export function logUserInterruption(): never {
  console.log("\n\n⚠️  Interrupted by user");
  process.exit(130);
}
