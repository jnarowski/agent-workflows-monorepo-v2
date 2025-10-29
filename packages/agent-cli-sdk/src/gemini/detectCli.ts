/**
 * Detects Gemini CLI installation.
 *
 * Environment Variable: GEMINI_CLI_PATH
 *
 * Common Paths:
 * - /usr/local/bin/gemini
 * - ~/.local/share/mise/installs/node/* /bin/gemini
 * - ~/.npm-global/bin/gemini
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ============================================================================
// Public API
// ============================================================================

/**
 * Detect Gemini CLI installation path.
 *
 * Checks in order:
 * 1. GEMINI_CLI_PATH environment variable
 * 2. PATH (using which/where command)
 * 3. Common installation paths
 *
 * @returns Path to Gemini CLI executable, or null if not found
 */
export function detectCli(): string | null {
  // 1. Check env var
  if (process.env.GEMINI_CLI_PATH && existsSync(process.env.GEMINI_CLI_PATH)) {
    return process.env.GEMINI_CLI_PATH;
  }

  // 2. Try PATH
  const whichCmd = process.platform === 'win32' ? 'where' : 'which';
  try {
    const result = execSync(`${whichCmd} gemini`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const detectedPath = result.trim().split('\n')[0];
    if (detectedPath && existsSync(detectedPath)) {
      return detectedPath;
    }
  } catch {
    // Command failed, continue to next method
  }

  // 3. Check common paths
  const commonPaths = [
    '/usr/local/bin/gemini',
    path.join(os.homedir(), '.local', 'share', 'mise', 'installs', 'node', '*', 'bin', 'gemini'),
    path.join(os.homedir(), '.npm-global', 'bin', 'gemini'),
  ];

  for (const searchPath of commonPaths) {
    // Skip glob patterns (would need glob library to resolve)
    if (searchPath.includes('*')) continue;

    if (existsSync(searchPath)) {
      return searchPath;
    }
  }

  return null;
}
