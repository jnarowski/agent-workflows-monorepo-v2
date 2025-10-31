// Re-export session schemas from server schemas
// Schemas remain in routes/schemas/ for now as they are route-specific validation
// This file exists for consistency with domain structure
// If needed, schemas can be moved here in future refactoring

export {
  createSessionSchema,
  sessionIdSchema,
  projectIdSchema,
  updateSessionNameSchema,
} from '@/server/schemas/session.js';
