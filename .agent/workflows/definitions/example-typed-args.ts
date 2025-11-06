import {
  defineWorkflow,
  defineSchema,
} from "../../../packages/workflow-sdk/dist/index.js";

/**
 * Example: Type-safe workflow arguments with defineSchema
 *
 * NEW: No `as const` required! defineSchema automatically preserves literal types.
 *
 * Simple:
 * 1. Use defineSchema() to define typed schema (no `as const` needed)
 * 2. Pass argsSchema to defineWorkflow config
 * 3. event.data.args is automatically typed - no manual casting!
 */

export default defineWorkflow(
  {
    id: "typed-build-workflow",
    trigger: "workflow/typed-build",
    name: "Type-Safe Build Workflow",
    phases: [
      { id: "validate", label: "Validate" },
      { id: "build", label: "Build" },
      { id: "test", label: "Test" },
    ],
    argsSchema: defineSchema({
      type: "object",
      properties: {
        projectName: { type: "string" },
        buildType: { enum: ["production", "development"] }, // ✅ No `as const` needed
        includeTests: { type: "boolean" },
        tags: { type: "array", items: { type: "string" } }, // ✅ Array support!
        config: {
          properties: {
            timeout: { type: "number" },
            retries: { type: "number" },
          },
        }, // ✅ Nested objects!
      },
      required: ["projectName", "buildType"], // ✅ No `as const` needed
    }),
  },
  async ({ event, step }) => {
    console.log(event.data.args.buildType);

    // @ts-expect-error - this should be an error
    console.log(event.data.args.something);

    // @ts-expect-error - this should be an error
    await step.phase("validssates", async () => {});
    await step.phase("validate", async () => {});

    return { success: true };
  }
);
