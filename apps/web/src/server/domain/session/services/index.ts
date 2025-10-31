// Session CRUD operations
export { getSessionsByProject } from './getSessionsByProject';
export { getSessionMessages } from './getSessionMessages';
export { createSession } from './createSession';
export { updateSessionName } from './updateSessionName';
export { updateSessionMetadata } from './updateSessionMetadata';

// Session sync operations
export { syncProjectSessions } from './syncProjectSessions';
export { parseJSONLFile } from './parseJSONLFile';

// WebSocket operations
export { executeAgent } from './executeAgent';
export { validateSessionOwnership } from './validateSessionOwnership';
export { extractUsageFromEvents } from './extractUsageFromEvents';
export { processImageUploads } from './processImageUploads';

// Session utilities
export { generateSessionName } from './generateSessionName';

// Re-export types for convenience
export type {
  AgentExecuteConfig,
  AgentExecuteResult,
  UsageData,
  SessionWithProject,
  ImageProcessingResult,
  GenerateSessionNameOptions,
} from '../types/index';
