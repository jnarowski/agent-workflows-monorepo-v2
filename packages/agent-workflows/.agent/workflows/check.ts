#!/usr/bin/env bun

import { createClaudeAdapter } from '@sourceborn/agent-cli-sdk';
import { Workflow, FileStorage, generateWorkflowId } from '../../src';
import { buildSlashCommand } from '../types/slash-commands.js';
import { unwrap } from '../../src/utils/result';
import type { CheckResult } from '../types/slash-commands.js';
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
  const claude = createClaudeAdapter();

  const workflowId = generateWorkflowId();
  console.log(`🚀 Starting check workflow: #${workflowId}`);

  const workflow = new Workflow({
    storage: new FileStorage({ workflowId }),
  });

  const response = unwrap(
    await workflow.executeCliStep<CheckResult>('check', {
      cli: claude,
      cliOptions: {
        responseSchema: true,
      },
      prompt: buildSlashCommand('/check', {
        format: 'json',
      }),
    })
  );

  console.log(response.output.success, 'response.success');

  await workflow.setState({ status: 'completed' });
}

// Run the workflow
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
