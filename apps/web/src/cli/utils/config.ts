import { readFileSync, writeFileSync, existsSync } from "fs";
import { getConfigPath, resolvePath, ensureDirectoryExists } from "./paths.js";

export interface AgentWorkflowsConfig {
  uiPort: number;
  serverPort: number;
  dbPath: string;
  logLevel: string;
}

/**
 * Returns the default configuration
 */
export function getDefaultConfig(): AgentWorkflowsConfig {
  return {
    uiPort: 5173,
    serverPort: 3456,
    dbPath: "~/.agent/database.db",
    logLevel: "info",
  };
}

/**
 * Loads config from ~/.agents/agent-workflows-ui-config.json
 * Returns empty object if file doesn't exist
 */
export function loadConfig(): Partial<AgentWorkflowsConfig> {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load config from ${configPath}:`, error);
    return {};
  }
}

/**
 * Saves config to ~/.agents/agent-workflows-ui-config.json
 */
export function saveConfig(config: AgentWorkflowsConfig): void {
  const configPath = getConfigPath();
  const configDir = resolvePath("~/.agents/");

  // Ensure directory exists
  ensureDirectoryExists(configDir);

  // Write config with pretty formatting
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}
