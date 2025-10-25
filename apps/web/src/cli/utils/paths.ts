import { homedir } from "os";
import { join, resolve } from "path";
import { mkdirSync } from "fs";

/**
 * Expands ~ to the user's home directory
 */
export function resolvePath(path: string): string {
  if (path.startsWith("~")) {
    return join(homedir(), path.slice(1));
  }
  return resolve(path);
}

/**
 * Returns the path to the config file
 */
export function getConfigPath(): string {
  return resolvePath("~/.agents/agent-workflows-ui-config.json");
}

/**
 * Returns the default database path
 */
export function getDefaultDbPath(): string {
  return resolvePath("~/.agent/database.db");
}

/**
 * Creates directory if it doesn't exist
 */
export function ensureDirectoryExists(dirPath: string): void {
  const resolvedPath = resolvePath(dirPath);
  mkdirSync(resolvedPath, { recursive: true });
}
