#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { installCommand } from "./commands/install.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "package.json"), "utf-8")
);

const program = new Command();

program
  .name("agent-workflows-ui")
  .description("Visual UI for agent workflows")
  .version(packageJson.version);

program
  .command("install")
  .description("Initialize database and configuration")
  .option("--force", "Overwrite existing database")
  .action(installCommand);

program.parse();
