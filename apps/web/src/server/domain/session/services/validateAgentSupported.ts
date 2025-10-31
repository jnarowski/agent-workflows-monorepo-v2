/**
 * Validate that an agent type is supported
 *
 * Checks if the agent type is one of the supported agent implementations.
 * Used before executing agent commands to prevent errors.
 *
 * @param agent - The agent type to validate
 * @returns Success/error result with error message if not supported
 */
export async function validateAgentSupported(
  agent: string
): Promise<{ supported: boolean; error?: string }> {
  // Supported agents
  const supportedAgents = ["claude", "codex"];

  if (!supportedAgents.includes(agent)) {
    return {
      supported: false,
      error: `Agent type '${agent}' is not yet implemented`,
    };
  }

  return { supported: true };
}
