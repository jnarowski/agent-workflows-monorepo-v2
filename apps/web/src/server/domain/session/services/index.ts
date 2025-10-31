// Session CRUD operations
export { getSessionsByProject } from './getSessionsByProject.js';
export { getSessionMessages } from './getSessionMessages.js';
export { createSession } from './createSession.js';
export { updateSessionName } from './updateSessionName.js';
export { updateSessionMetadata } from './updateSessionMetadata.js';

// Session sync operations
export { syncProjectSessions } from './syncProjectSessions.js';
export { parseJSONLFile } from './parseJSONLFile.js';

// WebSocket operations
export { executeAgent } from './executeAgent.js';
export { validateSessionOwnership } from './validateSessionOwnership.js';
export { extractUsageFromEvents } from './extractUsageFromEvents.js';
export { processImageUploads } from './processImageUploads.js';

// Session utilities
export { generateSessionName } from './generateSessionName.js';

// Re-export types for convenience
export type {
  AgentExecuteConfig,
  AgentExecuteResult,
  UsageData,
  SessionWithProject,
  ImageProcessingResult,
  GenerateSessionNameOptions,
} from '../types/index.js';
