import type { CodexOptions } from "./types";

/**
 * Build command arguments for Codex CLI
 * Based on Codex CLI 0.46.0 API
 * @param prompt The prompt to execute
 * @param options Execution options
 * @param sessionId Optional session ID for resumption
 * @returns Array of command arguments
 */
export function buildCodexArgs(
  prompt: string,
  options: CodexOptions,
  sessionId?: string
): string[] {
  const args: string[] = [];

  // Start with 'exec' subcommand
  args.push("exec");

  // Add all flags BEFORE the subcommand arguments

  // Model selection
  if (options.model) {
    args.push("-m", options.model);
  }

  // Sandbox mode
  if (options.sandbox) {
    args.push("-s", options.sandbox);
  }

  // NOTE: Approval policy flags are NOT supported in 'codex exec' mode
  // They're only available in interactive mode
  // Use --full-auto (safe) or --dangerously-bypass-approvals-and-sandbox (unsafe)

  // Full auto mode (convenience flag for programmatic execution)
  if (options.fullAuto) {
    args.push("--full-auto");
  }

  // Dangerous bypass (EXTREMELY DANGEROUS)
  if (options.dangerouslyBypassApprovalsAndSandbox) {
    args.push("--dangerously-bypass-approvals-and-sandbox");
  }

  // Working directory
  if (options.workingDir) {
    args.push("-C", options.workingDir);
  }

  // Images
  if (options.images && options.images.length > 0) {
    for (const image of options.images) {
      args.push("-i", image);
    }
  }

  // Web search
  if (options.search) {
    args.push("--search");
  }

  // Skip git repo check
  if (options.skipGitRepoCheck) {
    args.push("--skip-git-repo-check");
  }

  // Output schema
  if (options.outputSchema) {
    args.push("--output-schema", options.outputSchema);
  }

  // Color setting
  if (options.color) {
    args.push("--color", options.color);
  }

  // JSON output (JSONL streaming)
  if (options.json !== false) {
    // Enable JSON by default for programmatic use
    args.push("--json");
  }

  // Include plan tool
  if (options.includePlanTool) {
    args.push("--include-plan-tool");
  }

  // Output last message to file
  if (options.outputLastMessage) {
    args.push("-o", options.outputLastMessage);
  }

  // Configuration overrides
  if (options.config) {
    for (const [key, value] of Object.entries(options.config)) {
      args.push("-c", `${key}=${JSON.stringify(value)}`);
    }
  }

  // Profile
  if (options.profile) {
    args.push("-p", options.profile);
  }

  // OSS model provider
  if (options.oss) {
    args.push("--oss");
  }

  // Now add the subcommand (resume if sessionId, otherwise just the prompt)
  if (sessionId) {
    args.push("resume", sessionId);
  }

  // Add prompt (always last)
  args.push(prompt);

  return args;
}
