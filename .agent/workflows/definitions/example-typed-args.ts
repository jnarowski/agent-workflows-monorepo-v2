import {
  defineWorkflow,
  defineSchema,
} from "../../../packages/workflow-sdk/dist/index.js";

/**
 * Example: Type-safe workflow arguments with defineSchema
 *
 * Simple:
 * 1. Use defineSchema() to define typed schema
 * 2. Pass argsSchema to defineWorkflow config
 * 3. Types inferred automatically - no interface needed!
 */

// const argsSchema = defineSchema({
//   type: "object",
//   properties: {
//     projectName: { type: "string" },
//     buildType: { enum: ["production", "development"] as const },
//     includeTests: { type: "boolean" },
//   },
//   required: ["projectName", "buildType"] as const,
// });

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
    argsSchema: {
      type: "object",
      properties: {
        projectName: { type: "string" },
        buildType: { enum: ["production", "development"] },
        includeTests: { type: "boolean" },
      },
      required: ["projectName", "buildType"],
    },
  },
  async ({ event, step }) => {
    // ✅ Typed automatically - no interface needed!
    // buildType is typed as "production" | "development"
    // projectName is string, includeTests is boolean | undefined
    const { projectName, buildType, includeTests } = event.data.args;

    await step.phase("validate", async () => {
      await step.run("log-config", async () => {
        console.log(`Validating ${projectName} in ${buildType} mode`);
        console.log(`Include tests: ${includeTests ?? false}`);
      });
    });

    await step.phase("build", async () => {
      await step.run("build-project", async () => {
        console.log(`Building ${projectName} in ${buildType} mode`);
        // buildType is typed as literal union
        if (buildType === "production") {
          console.log("Running production build");
        } else {
          console.log("Running development build");
        }
      });
    });

    if (includeTests) {
      await step.phase("test", async () => {
        await step.run("run-tests", async () => {
          console.log(`Running tests for ${projectName}`);
        });
      });
    }

    return { success: true };
  }
);
