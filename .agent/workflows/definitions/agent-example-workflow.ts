import { defineWorkflow } from "../../../packages/workflow-sdk/dist";

/**
 * Example workflow demonstrating step.agent with Claude CLI integration.
 * Shows how to use AI agents within workflow steps for automated tasks.
 */
export default defineWorkflow(
  {
    id: "agent-example-workflow",
    trigger: "workflow/agent-example",
    name: "Agent Example Workflow",
    description: "Demonstrates Claude Code integration via step.agent",
    phases: [
      { id: "planning", label: "Planning" },
      { id: "review", label: "Review" },
    ],
  },
  async ({ event, step }) => {
    // Phase 1: Planning with Claude
    await step.phase("planning", async () => {
      await step.annotation("planning-start", {
        message: "Starting planning phase with Claude Code",
      });

      // Use Claude to analyze requirements
      const planResult = await step.agent("analyze-requirements", {
        agent: "claude",
        prompt: `Analyze the following feature request and create a brief implementation plan:

Feature: Pink swirling background
Requirements: The background should be a pink swirling pattern.

Provide:
1. Key components needed
2. Main files to create/modify
3. Dependencies to add
4. Testing approach

Keep it concise (3-5 sentences max).`,
        permissionMode: "plan",
      });

      await step.annotation("planning-complete", {
        message: `Plan created: ${planResult.output}`,
      });
    });

    // Phase 2: Review with Claude
    await step.phase("review", async () => {
      await step.annotation("review-start", {
        message: "Reviewing codebase with Claude Code",
      });

      // Use Claude to review the codebase
      const reviewResult = await step.agent("review-code", {
        agent: "claude",
        prompt: `Review the current project structure and identify any existing background components.

Check for:
1. Existing background implementations
2. Styling patterns used
3. Animation libraries available
4. Suggested approach for pink swirling background

Provide a brief 2-3 sentence review.`,
        permissionMode: "plan",
      });

      await step.annotation("review-complete", {
        message: "Code review complete",
      });
    });

    // Return final result
    return {
      success: true,
      message: "Agent workflow completed successfully",
      timestamp: new Date().toISOString(),
    };
  }
);
