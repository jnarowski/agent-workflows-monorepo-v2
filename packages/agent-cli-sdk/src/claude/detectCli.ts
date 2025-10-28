import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * Detects the Claude CLI by checking multiple sources
 *
 * @returns The path to the Claude CLI executable, or null if not found
 *
 * @example
 * ```ts
 * import { detectCli } from '@repo/agent-cli-sdk-two';
 *
 * const cliPath = detectCli();
 * if (cliPath) {
 *   console.log('Claude CLI found at:', cliPath);
 * } else {
 *   console.error('Claude CLI not found');
 * }
 * ```
 */
export function detectCli(): string | null {
  // 1. Check environment variable first
  const envPath = process.env.CLAUDE_CLI_PATH;
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  // 2. Try to find in PATH
  try {
    const which = process.platform === 'win32' ? 'where' : 'which';
    const result = execSync(`${which} claude`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    const output = result.trim();

    // Handle shell aliases (e.g., "claude: aliased to /path/to/claude")
    let path = output.split('\n')[0];
    if (path) {
      if (path.includes('aliased to')) {
        const match = path.match(/aliased to (.+)$/);
        if (match?.[1]) {
          path = match[1].trim();
        }
      }

      if (existsSync(path)) {
        return path;
      }
    }
  } catch {
    // CLI not found in PATH
  }

  // 3. Check common installation paths
  const commonPaths = [
    '/usr/local/bin/claude',
    '/usr/bin/claude',
    '/opt/homebrew/bin/claude',
    `${process.env.HOME}/.local/bin/claude`,
    `${process.env.HOME}/bin/claude`,
    `${process.env.HOME}/.claude/local/claude`, // Claude Code local installation
  ];

  for (const path of commonPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}
