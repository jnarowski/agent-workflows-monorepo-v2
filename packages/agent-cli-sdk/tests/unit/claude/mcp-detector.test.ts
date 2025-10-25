import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import {
  detectMCPServers,
  getClaudeConfigPath,
  isMCPServerInstalled,
  getMCPServerConfig,
  validateMCPServer,
  type MCPServer,
} from "../../../src/claude/mcp-detector";

// Mock fs module
vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

describe("MCP Detector", () => {
  const mockConfig = {
    mcpServers: {
      filesystem: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      },
      postgres: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-postgres"],
        env: {
          POSTGRES_URL: "postgresql://localhost/mydb",
        },
      },
      github: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: {
          GITHUB_TOKEN: "ghp_xxxxxxxxxxxxx",
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Removed: Platform-specific path tests - these test Node.js path APIs
  // and platform detection, not business logic behavior

  describe("detectMCPServers", () => {
    it("should detect MCP servers from config file", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

      const servers = await detectMCPServers();

      expect(servers).toHaveLength(3);
      expect(servers[0].name).toBe("filesystem");
      expect(servers[0].command).toBe("npx");
      expect(servers[1].name).toBe("postgres");
      expect(servers[2].name).toBe("github");
    });

    it("should return empty array if config file doesn't exist", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(
        new Error("ENOENT: no such file")
      );

      const servers = await detectMCPServers();

      expect(servers).toEqual([]);
    });

    it("should return empty array if config has no mcpServers", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({}));

      const servers = await detectMCPServers();

      expect(servers).toEqual([]);
    });

    it("should handle malformed JSON gracefully", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("invalid json {{{");

      const servers = await detectMCPServers();

      expect(servers).toEqual([]);
    });

    it("should include server environment variables", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

      const servers = await detectMCPServers();
      const postgres = servers.find((s) => s.name === "postgres");

      expect(postgres?.env).toBeDefined();
      expect(postgres?.env?.POSTGRES_URL).toBe("postgresql://localhost/mydb");
    });

    it("should include server args", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

      const servers = await detectMCPServers();
      const filesystem = servers.find((s) => s.name === "filesystem");

      expect(filesystem?.args).toBeDefined();
      expect(filesystem?.args).toContain("/tmp");
    });
  });

  describe("isMCPServerInstalled", () => {
    it("should return true if server is installed", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

      const isInstalled = await isMCPServerInstalled("filesystem");

      expect(isInstalled).toBe(true);
    });

    it("should return false if server is not installed", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

      const isInstalled = await isMCPServerInstalled("nonexistent");

      expect(isInstalled).toBe(false);
    });

    it("should return false if config file doesn't exist", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(
        new Error("ENOENT: no such file")
      );

      const isInstalled = await isMCPServerInstalled("filesystem");

      expect(isInstalled).toBe(false);
    });
  });

  describe("getMCPServerConfig", () => {
    it("should return server config if found", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

      const config = await getMCPServerConfig("postgres");

      expect(config).toBeDefined();
      expect(config?.name).toBe("postgres");
      expect(config?.command).toBe("npx");
      expect(config?.env?.POSTGRES_URL).toBe("postgresql://localhost/mydb");
    });

    it("should return undefined if server not found", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

      const config = await getMCPServerConfig("nonexistent");

      expect(config).toBeUndefined();
    });

    it("should return undefined if config file doesn't exist", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(
        new Error("ENOENT: no such file")
      );

      const config = await getMCPServerConfig("filesystem");

      expect(config).toBeUndefined();
    });
  });

  describe("validateMCPServer", () => {
    it("should return empty array for valid server", () => {
      const server: MCPServer = {
        name: "test-server",
        command: "npx",
        args: ["-y", "@test/server"],
      };

      const errors = validateMCPServer(server);

      expect(errors).toEqual([]);
    });

    it("should return error if name is missing", () => {
      const server: MCPServer = {
        name: "",
        command: "npx",
      };

      const errors = validateMCPServer(server);

      expect(errors).toContain("Server name is required");
    });

    it("should return error if name is whitespace only", () => {
      const server: MCPServer = {
        name: "   ",
        command: "npx",
      };

      const errors = validateMCPServer(server);

      expect(errors).toContain("Server name is required");
    });

    it("should return error if command is missing", () => {
      const server: MCPServer = {
        name: "test-server",
        command: "",
      };

      const errors = validateMCPServer(server);

      expect(errors).toContain("Server command is required");
    });

    it("should return error if command is whitespace only", () => {
      const server: MCPServer = {
        name: "test-server",
        command: "   ",
      };

      const errors = validateMCPServer(server);

      expect(errors).toContain("Server command is required");
    });

    it("should return multiple errors if both name and command are invalid", () => {
      const server: MCPServer = {
        name: "",
        command: "",
      };

      const errors = validateMCPServer(server);

      expect(errors).toHaveLength(2);
      expect(errors).toContain("Server name is required");
      expect(errors).toContain("Server command is required");
    });

    it("should validate server with optional fields", () => {
      const server: MCPServer = {
        name: "test-server",
        command: "npx",
        args: ["-y", "@test/server"],
        env: {
          API_KEY: "test-key",
        },
      };

      const errors = validateMCPServer(server);

      expect(errors).toEqual([]);
    });
  });
});
