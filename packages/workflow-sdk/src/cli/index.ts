#!/usr/bin/env node

/**
 * CLI entry point for workflow-sdk
 * Supports subcommands like: workflow-sdk generate-slash-types
 */

import { parseSlashCommands } from "../utils/parseSlashCommands";
import { generateSlashCommandTypesCode } from "../utils/generateSlashCommandTypes";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

interface CliOptions {
  input: string;
  output: string;
}

/**
 * Parse CLI arguments
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    input: ".claude/commands",
    output: "src/types/slash-commands.ts",
  };

  // Simple argument parsing
  for (let i = 0; i < args.length; i++) {
    const nextArg = args[i + 1];
    if (args[i] === "--input" && nextArg !== undefined) {
      options.input = nextArg;
      i++;
    } else if (args[i] === "--output" && nextArg !== undefined) {
      options.output = nextArg;
      i++;
    }
  }

  return options;
}

/**
 * Main CLI logic
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "generate-slash-types") {
    const options = parseArgs();

    try {
      console.log("🔍 Scanning slash commands in:", options.input);

      // Parse slash commands from .md files
      const commands = await parseSlashCommands(options.input);

      console.log(`✅ Found ${commands.length} command(s)`);

      // Generate TypeScript code
      const code = generateSlashCommandTypesCode(commands);

      // Ensure output directory exists
      const outputDir = path.dirname(options.output);
      await mkdir(outputDir, { recursive: true });

      // Write generated code to file
      await writeFile(options.output, code, "utf-8");

      console.log(`✨ Generated types at: ${options.output}`);
      process.exit(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error: ${message}`);
      process.exit(1);
    }
  } else {
    console.log("Usage: workflow-sdk <command> [options]");
    console.log("");
    console.log("Commands:");
    console.log("  generate-slash-types  Generate TypeScript types from .claude/commands/*.md");
    console.log("");
    console.log("Options:");
    console.log("  --input <dir>         Input directory (default: .claude/commands)");
    console.log("  --output <file>       Output file path (default: src/types/slash-commands.ts)");
    process.exit(command ? 1 : 0);
  }
}

main();
