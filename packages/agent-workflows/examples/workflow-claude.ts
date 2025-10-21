import { Workflow, FileStorage, generateWorkflowId } from '../src';
import { createClaudeAdapter } from '@sourceborn/agent-cli-sdk';

/**
 * Example workflow using real Claude CLI adapter
 *
 * This example demonstrates:
 * - Creating a workflow with FileStorage
 * - Using the Claude CLI adapter directly from agent-cli-sdk
 * - Automatic logging to .agent/workflows/logs/{workflowId}/{stepName}/
 * - State persistence and step status tracking
 * - Checkpoint commits and draft PR management with commitCheckpoint()
 *
 * Prerequisites:
 * - Claude CLI must be installed and authenticated (run: claude login)
 * - Set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN environment variable
 * - GitHub CLI (gh) must be installed for PR creation
 */

async function main() {
  // Generate workflow ID
  const workflowId = generateWorkflowId('example-claude-workflow');
  console.log(`📋 Workflow ID: ${workflowId}\n`);

  // Create workflow with FileStorage
  const workflow = new Workflow({
    storage: new FileStorage({ workflowId }),
  });

  // Set initial workflow state
  await workflow.setState({
    branchName: 'feat/example-claude-workflow',
    status: 'running',
  });

  // Create real Claude CLI adapter (implements Cli interface directly)
  const claude = createClaudeAdapter({
    verbose: false, // Set to true to see CLI commands
  });

  try {
    await workflow.executeCliStep('analyze-math', {
      cli: claude,
      prompt: 'What is 15 * 23? Just give me the answer with a brief explanation.',
      cliOptions: {
        model: 'sonnet', // Uses claude-sonnet-4-5
        permissionMode: 'plan', // Plan mode for safe execution
      },
    });

    // Commit checkpoint after first step (with custom message)
    await workflow.commitCheckpoint('Completed math analysis');

    // Step 2: Custom logic step (non-CLI)
    await workflow.executeStep('process-results', {
      fn: async () => {
        const mathResult = workflow.getStepState('analyze-math');

        return {
          summary: 'Workflow completed successfully',
          mathAnswer: mathResult,
          timestamp: new Date().toISOString(),
        };
      },
    });

    // Commit checkpoint after second step (without custom message)
    await workflow.commitCheckpoint();

    // Mark workflow as completed
    await workflow.setState({ status: 'completed' });

    // Display final results
    console.log('\n📊 Final Workflow State:');
    console.log(JSON.stringify(workflow.getState(), null, 2));

    console.log('\n🔍 Individual Step Results:');
    console.log('Math analysis:', workflow.getStepState('analyze-math'));
    console.log('Function generation:', workflow.getStepState('write-function'));
    console.log('Processing:', workflow.getStepState('process-results'));

    // Show where logs are stored
    const storage = workflow.getState();
    console.log(`\n✨ Workflow completed successfully!`);
    console.log(`📁 State saved to: .agent/workflows/logs/${storage.workflowId}/state.json`);
    console.log(`📂 Agent logs available at:`);
    console.log(`   - .agent/workflows/logs/${storage.workflowId}/analyze-math/`);
    console.log(`   - .agent/workflows/logs/${storage.workflowId}/write-function/`);
  } catch (error) {
    console.error('\n❌ Workflow failed:', error);
    await workflow.setState({ status: 'failed' });
    process.exit(1);
  }
}

// Run the workflow
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
