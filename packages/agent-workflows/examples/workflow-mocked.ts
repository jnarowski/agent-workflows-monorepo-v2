import { Workflow, FileStorage, generateWorkflowId } from "../src";
import type { Cli, CliResponse } from "../src/types/workflow";

/**
 * Example: Simple 3-step workflow
 *
 * This example shows:
 * - Creating a new workflow with auto-generated ID
 * - Using workflow.executeCliStep() for CLI execution
 * - Using workflow.executeStep() for custom async functions
 * - Accessing workflow state and results
 * - Loading existing workflow state from disk
 */

// Mock CLI tool for demonstration purposes
// In real usage, you would use createClaudeAdapter() or createCodexAdapter()
// from @sourceborn/agent-cli-sdk which will automatically handle log writing
const createMockCli = (): Cli => ({
  async execute(
    prompt: string,
    options?: Record<string, unknown>
  ): Promise<CliResponse> {
    console.log(`  [Mock CLI] Executing: "${prompt}"`);
    console.log(`  [Mock CLI] Options:`, options);

    // Note: Real CLI adapters from agent-cli-sdk will automatically
    // write their logs to the logPath provided in options

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      status: "success",
      output: `Mock response for: ${prompt}`,
      sessionId: `session-${Date.now()}`,
      duration: 500,
      exitCode: 0,
      metadata: {},
    };
  },
  getCapabilities() {
    return {
      streaming: false,
      sessionManagement: false,
      toolCalling: false,
      multiModal: false,
    };
  },
});

async function main() {
  // Generate unique workflow ID
  const workflowId = generateWorkflowId();
  console.log(`\n📋 Workflow ID: ${workflowId}\n`);

  // Create workflow with FileStorage
  const workflow = new Workflow({
    storage: new FileStorage({ workflowId }),
  });
  const cli = createMockCli();

  // Step 1: Plan (CLI step)
  await workflow.executeCliStep("plan", {
    cli,
    prompt: "Tell me you love me",
  });

  // Step 2: Custom processing (generic step)
  await workflow.executeStep("analyze", {
    fn: async () => {
      console.log("  [Custom Logic] Analyzing plan...");
      await new Promise((resolve) => setTimeout(resolve, 300));
      return {
        analyzed: true,
        findings: ["All systems operational", "Ready to proceed"],
      };
    },
  });

  // Mark workflow as completed (this will automatically set completedAt timestamp)
  await workflow.setState({ status: "completed" });

  // Access final state
  console.log("\n📊 Final Workflow State:");
  console.log(JSON.stringify(workflow.getState(), null, 2));

  console.log("\n🔍 Individual Step Results:");
  const state = workflow.getState();
  console.log("Plan result:", state.steps?.plan);
  console.log("Analysis result:", state.steps?.analyze);

  // Demonstrate loading existing workflow
  console.log("\n📂 Loading workflow from disk...");
  const loaded = await Workflow.load({
    storage: new FileStorage({ workflowId }),
  });

  if (loaded) {
    console.log("✅ Successfully loaded workflow");
    console.log("Loaded workflowId:", loaded.id);
    console.log("Loaded state:", loaded.getState());
  } else {
    console.log("❌ Failed to load workflow");
  }

  console.log("\n✨ Workflow completed successfully!");
  console.log(
    `📁 State saved to: .agent/workflows/logs/${workflowId}/state.json`
  );
}

// Run the example
main().catch((error) => {
  console.error("❌ Workflow failed:", error);
  process.exit(1);
});
