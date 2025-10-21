import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";

/**
 * MCP server configuration
 */
export interface MCPServer {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * Claude config file structure
 */
interface ClaudeConfig {
  mcpServers?: Record<string, MCPServer>;
}

/**
 * Detect installed MCP servers from Claude config
 * @returns Array of configured MCP servers
 */
export async function detectMCPServers(): Promise<MCPServer[]> {
  try {
    const configPath = getClaudeConfigPath();
    const configContent = await fs.readFile(configPath, "utf-8");
    const config: ClaudeConfig = JSON.parse(configContent);

    if (!config.mcpServers) {
      return [];
    }

    return Object.entries(config.mcpServers).map(([serverName, server]) => ({
      ...server,
      name: serverName,
    }));
  } catch {
    // Config file doesn't exist or can't be read
    return [];
  }
}

/**
 * Get the path to Claude config file
 * @returns Path to claude_desktop_config.json
 */
export function getClaudeConfigPath(): string {
  const home = homedir();

  // macOS
  if (process.platform === "darwin") {
    return join(
      home,
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json"
    );
  }

  // Windows
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || join(home, "AppData", "Roaming");
    return join(appData, "Claude", "claude_desktop_config.json");
  }

  // Linux
  return join(home, ".config", "Claude", "claude_desktop_config.json");
}

/**
 * Check if a specific MCP server is installed
 * @param serverName The name of the MCP server to check
 * @returns True if server is configured
 */
export async function isMCPServerInstalled(
  serverName: string
): Promise<boolean> {
  const servers = await detectMCPServers();
  return servers.some((server) => server.name === serverName);
}

/**
 * Get configuration for a specific MCP server
 * @param serverName The name of the MCP server
 * @returns Server configuration or undefined
 */
export async function getMCPServerConfig(
  serverName: string
): Promise<MCPServer | undefined> {
  const servers = await detectMCPServers();
  return servers.find((server) => server.name === serverName);
}

/**
 * Validate MCP server configuration
 * @param server MCP server config to validate
 * @returns Validation errors or empty array if valid
 */
export function validateMCPServer(server: MCPServer): string[] {
  const errors: string[] = [];

  if (!server.name || server.name.trim().length === 0) {
    errors.push("Server name is required");
  }

  if (!server.command || server.command.trim().length === 0) {
    errors.push("Server command is required");
  }

  return errors;
}
