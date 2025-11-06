import { defineWorkflow } from "../../../packages/workflow-sdk/dist";

/**
 * Example: Type-safe workflow arguments
 *
 * Simple:
 * 1. Define interface
 * 2. Pass as second generic
 * 3. argsSchema validates runtime
 */

interface BuildArgs {
  projectName: string;
  buildType: "production" | "development";
  includeTests?: boolean;
}

export default defineWorkflow<undefined, BuildArgs>(
  {
    id: "typed-build-workflow",
    trigger: "workflow/typed-build",
    name: "Type-Safe Build Workflow",

    phases: [
      { id: "validate", label: "Validate" },
      { id: "build", label: "Build" },
      { id: "test", label: "Test" },
    ],
    // argsSchema: runtime validation
    argsSchema: {
      type: "object",
      properties: {
        projectName: { type: "string" },
        buildType: { enum: ["production", "development"] },
        includeTests: { type: "boolean" },
      },
      required: ["projectName", "buildType"],
      additionalProperties: false,
    },
  },
  async ({ event, step }) => {
    // Fully typed! No casting needed.
    const { projectName, buildType, includeTests } = event.data.args;

    step.phase(, async () => {
      console.log(`Validating ${projectName} in ${buildType} mode`);
      return { success: true };
    });

    step.phase("build", async () => {
      console.log(`Building ${projectName} in ${buildType} mode`);
    });

    step.phase("test", async () => {
      console.log(`Testing ${projectName}`);
    });

    console.log(`Building ${projectName} in ${buildType} mode`);

    if (buildType === "production") {
      console.log("Production build");
    }

    if (includeTests) {
      console.log("Running tests");
    }

    return { success: true };
  }
);
