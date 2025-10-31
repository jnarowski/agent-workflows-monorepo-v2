import type { ExecutionConfig } from "../types";

/**
 * Parse execution configuration from WebSocket message data
 *
 * Safely extracts and validates execution configuration options from
 * unknown data, providing type-safe defaults.
 *
 * @param config - Unknown configuration object from WebSocket message
 * @returns Type-safe execution configuration
 */
export async function parseExecutionConfig(
  config: unknown
): Promise<ExecutionConfig> {
  const configObj = config as Record<string, unknown> | undefined;

  return {
    resume: configObj?.resume === true,
    permissionMode: configObj?.permissionMode as
      | "default"
      | "acceptEdits"
      | "bypassPermissions"
      | undefined,
    model: configObj?.model as string | undefined,
  };
}
