import { execSync } from "child_process";

/**
 * Detect Codex CLI installation
 * @returns Path to codex CLI or null if not found
 */
export function detectCodexCLI(): string | null {
  // Check environment variable first
  const envPath = process.env.CODEX_CLI_PATH;
  if (envPath) {
    return envPath;
  }

  // Try common installation paths
  const commonPaths = [
    "/usr/local/bin/codex",
    "/opt/homebrew/bin/codex",
    `${process.env.HOME}/.local/bin/codex`,
    `${process.env.HOME}/bin/codex`,
  ];

  for (const path of commonPaths) {
    try {
      execSync(`test -f "${path}"`, { stdio: "ignore" });
      return path;
    } catch {
      continue;
    }
  }

  // Try to find in PATH
  try {
    const result = execSync("which codex", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const path = result.trim();
    if (path) {
      return path;
    }
  } catch {
    // Not found in PATH
  }

  return null;
}

/**
 * Check if Codex CLI is installed
 * @returns True if codex CLI is available
 */
export function isCodexCLIInstalled(): boolean {
  return detectCodexCLI() !== null;
}

/**
 * Get Codex CLI version
 * @param cliPath Path to codex CLI
 * @returns Version string or null if unavailable
 */
export function getCodexCLIVersion(cliPath: string): string | null {
  try {
    const output = execSync(`"${cliPath}" --version`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return output.trim();
  } catch {
    return null;
  }
}
