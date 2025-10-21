#!/usr/bin/env bun

import { createClaudeAdapter, type Cli } from '@sourceborn/agent-cli-sdk';
import { Workflow, FileStorage, generateWorkflowId } from '../../src';
import {
  buildSlashCommand,
  ImplementSpecResult,
  type ReviewSpecImplementationResult,
} from '../types/slash-commands.js';
import { unwrap } from '../../src/utils/result';
import type { CliResponse } from '../../src/types/workflow.js';

/**
 * Plan-Implement-Review-Push Workflow with Retry Loop
 *
 * This workflow demonstrates:
 * - Argument parsing for feature-name and context
 * - Creating a workflow with FileStorage
 * - Using the Claude CLI adapter from agent-cli-sdk
 * - Automatic logging to .agent/workflows/logs/{workflowId}/{stepName}/
 * - Git branch management with ensureBranch()
 * - State persistence and step status tracking
 * - Recursive implement-review loop (up to 3 attempts)
 *
 * Prerequisites:
 * - Claude CLI must be installed and authenticated (run: claude login)
 * - Set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN environment variable
 * - Git repository initialized with remote configured
 *
 * Usage:
 *   bun run .agent/workflows/plan-implement-review-push-loop.ts <feature-name> [context]
 *
 * Example:
 *   bun run .agent/workflows/plan-implement-review-push-loop.ts "user-auth" "Add OAuth2 with Google"
 */

/**
 * Recursive helper: Implement and review with up to 3 attempts
 */
async function implementAndReviewWithRetry(
  workflow: Workflow,
  claude: Cli,
  specPath: string,
  attempt: number
): Promise<CliResponse<ReviewSpecImplementationResult>> {
  console.log(`\n🔄 Attempt ${attempt}/3`);

  // Implement
  const implementData = unwrap(
    await workflow.executeCliStep<ImplementSpecResult>(`implement-${attempt}`, {
      cli: claude,
      cliOptions: { responseSchema: true },
      prompt: buildSlashCommand('/implement-spec', {
        specNameOrPath: specPath,
        format: 'json',
      }),
    })
  );

  console.log('Implement response:', implementData.output);

  // Review
  const reviewData = unwrap(
    await workflow.executeCliStep<ReviewSpecImplementationResult>(`review-${attempt}`, {
      cli: claude,
      cliOptions: { responseSchema: true },
      prompt: buildSlashCommand('/review-spec-implementation', {
        specFilePath: implementData.output.spec_path,
        format: 'json',
      }),
    })
  );

  console.log('Review response:', reviewData.output);

  // If review failed and we haven't hit max attempts, retry
  if (!reviewData.output.success && attempt < 3) {
    console.log('❌ Review failed, retrying...');
    return implementAndReviewWithRetry(workflow, claude, specPath, attempt + 1);
  }

  // Return final result (either success or max attempts reached)
  return reviewData;
}

async function main() {
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const featureName = args[0];
  const context = args.slice(1).join(' ');
  const branchName = `feat/${featureName.toLowerCase().replace(/\s+/g, '-')}`;

  if (!featureName) {
    console.error('❌ Error: feature-name is required');
    console.log('\nUsage: bun run .agent/workflows/plan-implement-review-push.ts <feature-name> [context]');
    process.exit(1);
  }

  const claude = createClaudeAdapter({
    verbose: false, // Set to true to see CLI commands
  });

  // Generate workflow ID
  const workflowId = generateWorkflowId();
  console.log(`🚀 Starting plan-implement-review-push workflow: #${workflowId} feature: ${featureName}`);
  if (context) {
    console.log(`   Context: ${context}`);
  }

  // Create workflow with FileStorage
  const workflow = new Workflow({
    storage: new FileStorage({ workflowId }),
  });

  await workflow.ensureBranch(branchName);
  await workflow.setState({ branchName, status: 'running' });

  await workflow.executeCliStep('plan', {
    cli: claude,
    prompt: buildSlashCommand('/generate-feature', {
      featureName: featureName,
      context: context || '',
      format: 'json',
    }),
  });

  // Run implement-review loop with up to 3 attempts
  const specPath = `.agent/specs/${featureName}-spec.md`;
  const finalReview = await implementAndReviewWithRetry(workflow, claude, specPath, 1);

  console.log('\n✅ Final review result:', finalReview.output);

  await workflow.setState({ status: 'completed' });
}

// Run the workflow
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
