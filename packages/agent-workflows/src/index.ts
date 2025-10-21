// Core workflow orchestration
export { Workflow, type WorkflowConfig } from "./workflow/Workflow";

// Storage
export { FileStorage, type FileStorageConfig } from "./storage";

// Types
export type {
  Cli,
  CliResponse,
  ExecutionResponse,
  AIAdapter,
  WorkflowStateData,
  StepStatus,
  CommandArgument,
  CommandDefinition,
  CheckpointResult,
} from "./types/workflow";

// Utilities
export { generateWorkflowId } from "./utils/generateWorkflowId";
export { formatConsoleJson } from "./utils/formatConsoleJson";
export { renderConsoleBox } from "./utils/renderConsoleBox";
export { parseSlashCommands } from "./utils/parseSlashCommands";
export {
  generateSlashCommandTypesCode,
  generateSlashCommandTypesFromDir,
} from "./utils/generateSlashCommandTypes";
export {
  parseJsonResponse,
  parseJsonResponseStrict,
} from "./utils/parseJsonResponse";
export { unwrap, unwrapOr, unwrapOrElse, type Result } from "./utils/result";

export const version = "0.1.0";
