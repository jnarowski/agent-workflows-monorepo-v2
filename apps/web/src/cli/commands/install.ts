import { existsSync, unlinkSync } from "fs";
import { spawnSync } from "child_process";
import { getDefaultDbPath, ensureDirectoryExists, resolvePath } from "../utils/paths.js";
import { getDefaultConfig, saveConfig } from "../utils/config.js";

interface InstallOptions {
  force?: boolean;
}

export async function installCommand(options: InstallOptions): Promise<void> {
  try {
    // 1. Check for existing database
    const dbPath = resolvePath(getDefaultDbPath());
    if (existsSync(dbPath)) {
      if (!options.force) {
        throw new Error(
          `Database already exists at ${dbPath}. Use --force to overwrite.`
        );
      }
      // Delete existing database if --force is specified
      unlinkSync(dbPath);
    }

    // 2. Create necessary directories
    ensureDirectoryExists("~/.agents/");
    ensureDirectoryExists("~/.agent/");

    // 3. Run Prisma migrations
    process.env.DATABASE_URL = `file:${dbPath}`;

    const result = spawnSync(
      "npx",
      ["prisma", "migrate", "deploy", "--schema=./dist/prisma/schema.prisma"],
      {
        stdio: "inherit",
        env: process.env,
      }
    );

    if (result.error) {
      throw new Error(`Failed to run Prisma migrations: ${result.error.message}`);
    }

    if (result.status !== 0) {
      throw new Error(`Prisma migrations failed with exit code ${result.status}`);
    }

    // 4. Create config file
    const defaultConfig = getDefaultConfig();
    saveConfig(defaultConfig);

    // 5. Success messaging
    console.log("✓ Created ~/.agent/ directory");
    console.log("✓ Created database at ~/.agent/database.db");
    console.log("✓ Applied database migrations");
    console.log("✓ Created config at ~/.agents/agent-workflows-ui-config.json");
    console.log("");
    console.log("Next steps:");
    console.log("  1. (Optional) Edit ~/.agents/agent-workflows-ui-config.json to customize ports");
    console.log("  2. Run: agent-workflows-ui start");
    console.log("");
    console.log("Default configuration:");
    console.log("  UI Port:     5173");
    console.log("  Server Port: 3456");
    console.log("  Database:    ~/.agent/database.db");
  } catch (error) {
    console.error("Installation failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
