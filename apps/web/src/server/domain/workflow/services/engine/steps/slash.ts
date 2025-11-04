import type { RuntimeContext } from "../../../types/engine.types";
import type { AgentStepResult } from "@repo/workflow-sdk";
import { createAgentStep } from "./agent";

/**
 * Create slash command step factory function
 * Wrapper around agent step that formats slash commands
 */
export function createSlashStep(context: RuntimeContext) {
  const agentStep = createAgentStep(context);

  return async function slash(
    command: string,
    args?: string[],
    options?: { timeout?: number }
  ): Promise<AgentStepResult> {
    const prompt =
      args && args.length > 0 ? `${command} ${args.join(" ")}` : command;

    return agentStep(
      `slash-command-${command}`,
      {
        agent: "claude",
        prompt,
        projectPath: context.projectPath,
      },
      options
    );
  };
}
