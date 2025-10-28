import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * Detects the Codex CLI by checking multiple sources.
 *
 * @returns The path to the Codex CLI executable, or null if not found
 *
 * @example
 * ```ts
 * import { detectCli } from '@repo/agent-cli-sdk';
 *
 * const cliPath = detectCli();
 * if (cliPath) {
 *   console.log('Codex CLI found at:', cliPath);
 * } else {
 *   console.error('Codex CLI not found');
 * }
 * ```
 */
export function detectCli(): string | null {
  // 1. Check environment variable first
  const envPath = process.env.CODEX_CLI_PATH;
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  // 2. Try to find in PATH
  try {
    const which = process.platform === 'win32' ? 'where' : 'which';
    const result = execSync(`${which} codex`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    const output = result.trim();

    // Handle shell aliases (e.g., "codex: aliased to /path/to/codex")
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
    '/opt/homebrew/bin/codex', // Homebrew on Apple Silicon
    '/usr/local/bin/codex', // Homebrew on Intel, or standard install
    '/usr/bin/codex',
    `${process.env.HOME}/.local/bin/codex`, // User local install
    `${process.env.HOME}/bin/codex`,
  ];

  for (const path of commonPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}
