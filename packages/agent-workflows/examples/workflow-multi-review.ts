import { Workflow, FileStorage } from "../src";
import { unwrap } from "../src/utils/result";
import fs from "fs/promises";
import path from "path";

/**
 * Example: Multi-step workflow - Part 2 (Review)
 *
 * This example demonstrates:
 * - Loading an existing workflow by ID
 * - Using ensureBranch() to automatically handle branch switching
 * - Auto-committing current changes if needed
 * - Continuing work on the workflow
 *
 * Usage:
 *   ts-node examples/workflow-multi-review.ts <workflow-id>
 *
 * Prerequisites:
 *   Run workflow-multi-plan.ts first to create a workflow and get its ID
 */

async function main() {
  // Get workflow ID from command line arguments
  const workflowId = process.argv[2];

  if (!workflowId) {
    console.error("❌ Error: Workflow ID is required");
    console.error("\nUsage:");
    console.error("  ts-node examples/workflow-multi-review.ts <workflow-id>");
    console.error("\nExample:");
    console.error(
      "  ts-node examples/workflow-multi-review.ts 550e8400-e29b-41d4-a716-446655440000"
    );
    process.exit(1);
  }

  console.log(`\n📋 Loading workflow: ${workflowId}\n`);

  // Try to load existing workflow
  const workflowResult = await Workflow.load({
    storage: new FileStorage({ workflowId }),
  });

  if (!workflowResult.ok) {
    console.error(`❌ Error: ${workflowResult.error}`);
    console.error(
      "\nMake sure you've run workflow-multi-plan.ts first to create the workflow."
    );
    process.exit(1);
  }

  const workflow = workflowResult.data;

  // Get workflow state
  const state = workflow.getState();
  const workflowBranch = state.branchName;

  if (!workflowBranch) {
    console.error("❌ Error: Workflow does not have a branch name saved");
    console.error("This workflow may be invalid or incomplete.");
    process.exit(1);
  }

  console.log(`✅ Workflow loaded successfully`);
  console.log(`🌿 Workflow branch: ${workflowBranch}`);

  // Step 1: Ensure we're on the workflow branch
  unwrap(
    await workflow.executeStep("ensure-branch", {
    fn: async () => {
      console.log(`  [Target] Ensuring branch: ${workflowBranch}`);

      // Use ensureBranch to handle everything automatically
      const result = await workflow.ensureBranch(workflowBranch, {
        createIfMissing: false, // Don't create the branch if it doesn't exist
        commitMessage: `WIP: Auto-save before switching to workflow ${workflowId}`,
      });

      if (!result.ok) {
        throw new Error(`Failed to ensure branch: ${result.error}`);
      }

      if (result.data.wasOnBranch) {
        console.log(`  [Already] On correct branch: ${workflowBranch}`);
      } else {
        if (result.data.committedChanges) {
          console.log(
            `  [Committed] Auto-saved changes from ${result.data.previousBranch}`
          );
        }
        console.log(
          `  [Switched] From ${result.data.previousBranch} to ${workflowBranch}`
        );
      }

      return {
        wasOnBranch: result.data.wasOnBranch,
        committedChanges: result.data.committedChanges,
        previousBranch: result.data.previousBranch,
        currentBranch: workflowBranch,
      };
    },
    })
  );

  // Step 2: Review the spec file
  unwrap(
    await workflow.executeStep("review-spec", {
    fn: async () => {
      console.log("  [Review] Reading spec file...");

      // Get the spec file info from the original workflow
      const createSpecResult = state.steps?.["create-spec"] as
        | { specFileName: string }
        | undefined;

      if (!createSpecResult?.specFileName) {
        console.log("  [Skip] Spec file info not found in workflow state");
        return { reviewed: false, reason: "spec-not-found" };
      }

      const specPath = path.join(process.cwd(), createSpecResult.specFileName);

      try {
        const specContent = await fs.readFile(specPath, "utf-8");
        console.log(`  [Found] Spec file: ${createSpecResult.specFileName}`);
        console.log(
          `  [Content] ${specContent.split("\n").length} lines, ${specContent.length} characters`
        );

        // Mock review process
        const reviewFindings = [
          "Specification structure is clear",
          "Requirements are well-defined",
          "Implementation notes are present",
        ];

        console.log("  [Review] Analysis complete:");
        reviewFindings.forEach((finding) => {
          console.log(`    ✓ ${finding}`);
        });

        return {
          reviewed: true,
          specFile: createSpecResult.specFileName,
          findings: reviewFindings,
          lineCount: specContent.split("\n").length,
          characterCount: specContent.length,
        };
      } catch (error) {
        console.log(`  [Error] Could not read spec file: ${error}`);
        return {
          reviewed: false,
          reason: "read-error",
          error: (error as Error).message,
        };
      }
    },
    })
  );

  // Mark workflow as completed
  await workflow.setState({ status: "completed" });

  // Output workflow summary
  console.log("\n✨ Review phase completed!");
  console.log(`\n📊 Final State:`);
  console.log(`  - Workflow ID: ${workflowId}`);
  console.log(`  - Branch: ${workflowBranch}`);
  console.log(`  - Status: ${workflow.getState().status}`);
  console.log(
    `  - State saved to: .agent/workflows/logs/${workflowId}/state.json\n`
  );
}

// Run the example
main().catch((error) => {
  console.error("❌ Workflow failed:", error);
  process.exit(1);
});
