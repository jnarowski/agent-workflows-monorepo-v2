#!/usr/bin/env bun

import { createClaudeAdapter } from '@sourceborn/agent-cli-sdk';
import { Workflow, FileStorage, generateWorkflowId } from '../../src';
import {
  buildSlashCommand,
  ImplementSpecResult,
  type ReviewSpecImplementationResult,
} from '../types/slash-commands.js';
import { unwrap } from '../../src/utils/result';

/**
 * Plan-Implement-Review-Push Workflow
 *
 * This workflow demonstrates:
 * - Argument parsing for feature-name and context
 * - Creating a workflow with FileStorage
 * - Using the Claude CLI adapter from agent-cli-sdk
 * - Automatic logging to .agent/workflows/logs/{workflowId}/{stepName}/
 * - Git branch management with ensureBranch()
 * - State persistence and step status tracking
 * - Multi-step AI-powered development workflow
 *
 * Prerequisites:
 * - Claude CLI must be installed and authenticated (run: claude login)
 * - Set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN environment variable
 * - Git repository initialized with remote configured
 *
 * Usage:
 *   bun run .agent/workflows/plan-implement-review-push.ts <feature-name> [context]
 *
 * Example:
 *   bun run .agent/workflows/plan-implement-review-push.ts "user-auth" "Add OAuth2 with Google"
 */

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

  workflow.commitCheckpoint();

  const implementData = unwrap(
    await workflow.executeCliStep<ImplementSpecResult>('implement', {
      cli: claude,
      cliOptions: {
        responseSchema: true,
      },
      prompt: buildSlashCommand('/implement-spec', {
        specNameOrPath: `.agent/specs/${featureName}-spec.md`,
        format: 'json',
      }),
    })
  );

  workflow.commitCheckpoint();
  console.log('implement response:', implementData.output);

  // Execute review step with type-safe JSON response
  const reviewData = unwrap(
    await workflow.executeCliStep<ReviewSpecImplementationResult>('review', {
      cli: claude,
      cliOptions: {
        responseSchema: true,
      },
      prompt: buildSlashCommand('/review-spec-implementation', {
        specFilePath: implementData.output.spec_path,
        format: 'json',
      }),
    })
  );

  console.log('review response:', reviewData.output);

  await workflow.setState({ status: 'completed' });
}

// Run the workflow
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
