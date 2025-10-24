import { z } from 'zod';

/**
 * Slash Command Schemas
 * Zod validation schemas for slash command API routes
 */

export const slashCommandParamsSchema = z.object({
  id: z.string(),
});
