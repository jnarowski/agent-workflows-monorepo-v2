import { Command } from "commander";
import { installCommand } from "./commands/install.js";

const program = new Command();

program
  .name("agent-workflows-ui")
  .description("Visual UI for agent workflows")
  .version("0.0.0");

program
  .command("install")
  .description("Initialize database and configuration")
  .option("--force", "Overwrite existing database")
  .action(installCommand);

program.parse();
