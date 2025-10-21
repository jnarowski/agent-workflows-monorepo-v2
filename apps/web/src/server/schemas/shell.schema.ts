import { z } from 'zod';

/**
 * Message sent by client to initialize a shell session
 */
export const initMessageSchema = z.object({
  type: z.literal('init'),
  projectId: z.string().min(1),
  cols: z.number().int().positive(),
  rows: z.number().int().positive(),
});

/**
 * Message sent by client with user input
 */
export const inputMessageSchema = z.object({
  type: z.literal('input'),
  data: z.string(),
});

/**
 * Message sent by client when terminal is resized
 */
export const resizeMessageSchema = z.object({
  type: z.literal('resize'),
  cols: z.number().int().positive(),
  rows: z.number().int().positive(),
});

/**
 * Union type for all possible client messages
 */
export const shellMessageSchema = z.union([
  initMessageSchema,
  inputMessageSchema,
  resizeMessageSchema,
]);

export type InitMessage = z.infer<typeof initMessageSchema>;
export type InputMessage = z.infer<typeof inputMessageSchema>;
export type ResizeMessage = z.infer<typeof resizeMessageSchema>;
export type ShellMessage = z.infer<typeof shellMessageSchema>;
