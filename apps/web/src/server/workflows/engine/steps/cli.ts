import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { RuntimeContext } from "../../types";
import type { CliStepConfig, CliStepResult } from "@sourceborn/workflow-sdk";
import { executeStep } from "./helpers";

const execAsync = promisify(exec);
const DEFAULT_CLI_TIMEOUT = 300000; // 5 minutes

/**
 * Create CLI step factory function
 * Executes shell commands
 */
export function createCliStep(context: RuntimeContext) {
  return async function cli(
    name: string,
    command: string,
    config?: Omit<CliStepConfig, "command">,
    options?: { timeout?: number }
  ): Promise<CliStepResult> {
    const timeout = options?.timeout ?? DEFAULT_CLI_TIMEOUT;

    return executeStep(context, name, async () => {
      const { projectPath, logger } = context;
      const cwd = config?.cwd ?? projectPath;
      const env = { ...process.env, ...config?.env };

      logger.debug({ command, cwd }, "Executing CLI command");

      try {
        const { stdout, stderr } = await Promise.race([
          execAsync(command, {
            cwd,
            env,
            shell: config?.shell ?? "/bin/sh",
            maxBuffer: 10 * 1024 * 1024, // 10MB
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`CLI command timed out after ${timeout}ms`)),
              timeout
            )
          ),
        ]);

        return {
          command,
          exitCode: 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          success: true,
        };
      } catch (error: any) {
        // Command failed but we still want to return result
        return {
          command,
          exitCode: error.code ?? 1,
          stdout: error.stdout?.trim() ?? "",
          stderr: error.stderr?.trim() ?? error.message,
          success: false,
        };
      }
    });
  };
}
