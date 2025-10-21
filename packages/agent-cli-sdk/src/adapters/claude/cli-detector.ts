/**
 * Claude CLI detection and validation
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { CLIDetectionResult } from '../../types';

/**
 * Detect Claude CLI installation
 */
export function detectClaudeCLI(): string | null {
  // Check environment variable first
  const envPath = process.env.CLAUDE_CLI_PATH;
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  // Try to find in PATH
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

  // Check common installation paths
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

/**
 * Get Claude CLI version
 */
export function getClaudeCLIVersion(cliPath: string): string | undefined {
  try {
    const result = execSync(`"${cliPath}" --version`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    // Extract version number (e.g., "claude 1.2.3" -> "1.2.3")
    const match = result.trim().match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Detect and validate Claude CLI
 */
export function detectAndValidateClaudeCLI(): CLIDetectionResult {
  const path = detectClaudeCLI();

  if (!path) {
    return { found: false };
  }

  const version = getClaudeCLIVersion(path);

  return {
    found: true,
    path,
    version,
  };
}
