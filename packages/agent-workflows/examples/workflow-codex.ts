import {
  Workflow,
  FileStorage,
  generateWorkflowId,
} from "../src/index.js";
import { createCodexAdapter } from "@sourceborn/agent-cli-sdk";

/**
 * Example workflow using real Codex CLI adapter
 *
 * This example demonstrates:
 * - Creating a workflow with FileStorage
 * - Using the Codex CLI adapter directly from agent-cli-sdk
 * - Automatic logging to .agent/workflows/logs/{workflowId}/{stepName}/
 * - State persistence and step status tracking
 *
 * Prerequisites:
 * - Codex CLI must be installed and authenticated (run: codex login)
 * - Set OPENAI_API_KEY environment variable (optional if using OAuth)
 */

async function main() {
  // Generate workflow ID
  const workflowId = generateWorkflowId();
  console.log(`📋 Workflow ID: ${workflowId}\n`);

  // Create workflow with FileStorage
  const workflow = new Workflow({
    storage: new FileStorage({ workflowId }),
  });

  // Set initial workflow state
  await workflow.setState({
    branchName: "feat/example-codex-workflow",
    status: "running",
  });

  // Create real Codex CLI adapter (implements Cli interface directly)
  const codex = createCodexAdapter({
    workingDir: process.cwd(),
  });

  try {
    // Step 1: Codex analyzes a simple math problem
    await workflow.executeCliStep("analyze-math", {
      cli: codex,
      prompt: "What is 15 * 23? Just give me the answer with a brief explanation.",
      cliOptions: {
        model: "gpt-4o", // Uses GPT-4o
        sandbox: "read-only", // Safe read-only mode
      },
    });

    // Step 2: Custom logic step (non-CLI)
    await workflow.executeStep("process-results", {
      fn: async () => {
        const mathResult = workflow.getStepState("analyze-math");

        return {
          summary: "Workflow completed successfully",
          mathAnswer: mathResult,
          timestamp: new Date().toISOString(),
        };
      },
    });

    // Mark workflow as completed
    await workflow.setState({ status: "completed" });

    // Display final results
    console.log("\n📊 Final Workflow State:");
    console.log(JSON.stringify(workflow.getState(), null, 2));

    console.log("\n🔍 Individual Step Results:");
    console.log("Math analysis:", workflow.getStepState("analyze-math"));
    console.log("Processing:", workflow.getStepState("process-results"));

    // Show where logs are stored
    const storage = workflow.getState();
    console.log(`\n✨ Workflow completed successfully!`);
    console.log(
      `📁 State saved to: .agent/workflows/logs/${storage.workflowId}/state.json`
    );
    console.log(`📂 Agent logs available at:`);
    console.log(
      `   - .agent/workflows/logs/${storage.workflowId}/analyze-math/`
    );
  } catch (error) {
    console.error("\n❌ Workflow failed:", error);
    await workflow.setState({ status: "failed" });
    process.exit(1);
  }
}

// Run the workflow
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
