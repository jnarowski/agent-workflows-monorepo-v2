import { z } from 'zod';

// Standard success response wrapper
export const successResponse = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema,
  });

// Standard error response
export const errorResponse = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    statusCode: z.number(),
    details: z.unknown().optional(),
  }),
});

// Project schemas
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const projectResponseSchema = successResponse(projectSchema);
export const projectsResponseSchema = successResponse(z.array(projectSchema));

// Auth schemas
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
});

// Auth status response (for /api/auth/status)
export const authStatusResponseSchema = z.object({
  needsSetup: z.boolean(),
  isAuthenticated: z.boolean(),
});

// Auth login/register response (does not use standard wrapper)
export const authResponseSchema = z.object({
  success: z.boolean(),
  user: userSchema,
  token: z.string(),
});

export const userResponseSchema = successResponse(userSchema);

// File tree schemas
export const fileTreeItemSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string(),
    path: z.string(),
    type: z.enum(['file', 'directory']),
    size: z.number().optional(),
    modified: z.date(),
    permissions: z.string(),
    children: z.array(fileTreeItemSchema).optional(),
  })
);

export const fileTreeResponseSchema = successResponse(z.array(fileTreeItemSchema));
