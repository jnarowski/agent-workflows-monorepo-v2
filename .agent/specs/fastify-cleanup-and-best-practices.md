# Fastify Cleanup with Zod Type Provider

**Status:** Planned
**Estimated Time:** ~3 hours
**Priority:** High
**Date:** 2025-10-21

## Overview

Modernize the Fastify server implementation using type-safe schemas, eliminate code duplication, and establish clean patterns without over-engineering. Focus on leveraging existing tools (Zod, TypeScript, Fastify plugins) for a startup-appropriate approach.

## Current Issues

### Code Duplication
- **3 copies of authenticate function**: Found in `routes/auth.ts:17-37`, `routes/projects.ts:15-21`, and `plugins/auth.ts:17-43`
- **Duplicate type augmentations**: User type declared in both `routes/auth.ts:6-14` and `plugins/auth.ts:52-67`
- **Backup file**: `routes/shell.ts.bak` should be removed

### Manual Validation Everywhere
- 6+ instances of manual `safeParse` calls in `routes/projects.ts`
- Boilerplate validation error handling repeated in every route
- No automatic TypeScript type inference for request bodies
- Easy to forget validation or handle errors inconsistently

### Inconsistent Logging
- Mixed use of `console.log/error/warn` and `fastify.log`
- Found in: `auth.ts:39`, `file.service.ts:103,109`, `shell.service.ts:118`

### Type Safety Issues
- Type assertions: `(request.user as { userId: number }).userId`
- Any types in error handling: `(error as any).code`
- Missing proper Prisma error types

### Security Gaps
- Hardcoded JWT secret default in `plugins/auth.ts:7-8`
- No CORS configuration
- No rate limiting on auth endpoints
- WebSocket auth uses query params (gets logged)

## Implementation Plan

### Phase 1: Install & Setup Type Provider (10 min)

**Install dependency:**
```bash
pnpm add fastify-type-provider-zod
```

**Update `server/index.ts`:**
```typescript
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider
} from 'fastify-type-provider-zod';
import { z } from 'zod';

export async function createServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  }).withTypeProvider<ZodTypeProvider>();

  // Set up Zod validation
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Custom error handler for Zod validation
  fastify.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      return reply.status(400).send({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.validation,
        },
      });
    }

    const statusCode = error.statusCode || 500;
    fastify.log.error({
      err: error,
      url: request.url,
      method: request.method,
    }, 'Request error');

    return reply.status(statusCode).send({
      error: {
        message: error.message,
        statusCode,
      },
    });
  });

  // ... rest of setup
}
```

### Phase 2: Create Response Schemas (30 min)

**Create `server/schemas/response.schema.ts`:**
```typescript
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
```

### Phase 3: Refactor Projects Routes (20 min)

**Update `routes/projects.ts`:**

Before:
```typescript
fastify.get("/api/projects", { preHandler: authenticate }, async (request, reply) => {
  try {
    const projects = await projectService.getAllProjects();
    return reply.send({ data: projects });
  } catch (error) {
    fastify.log.error("Error fetching projects:", error);
    return reply.code(500).send({ error: "Failed to fetch projects" });
  }
});
```

After:
```typescript
import { projectsResponseSchema, projectResponseSchema } from '../schemas/response.schema';

fastify.get("/api/projects", {
  preHandler: fastify.authenticate,
  schema: {
    response: {
      200: projectsResponseSchema,
    },
  },
}, async (request, reply) => {
  const projects = await projectService.getAllProjects();
  return reply.send({ data: projects });
});

fastify.post<{ Body: CreateProjectRequest }>("/api/projects", {
  preHandler: fastify.authenticate,
  schema: {
    body: createProjectSchema,
    response: {
      201: projectResponseSchema,
      409: errorResponse,
    },
  },
}, async (request, reply) => {
  // request.body is automatically typed and validated!
  const exists = await projectService.projectExistsByPath(request.body.path);
  if (exists) {
    return reply.code(409).send({
      error: {
        message: "A project with this path already exists",
        code: "PROJECT_EXISTS",
        statusCode: 409,
      },
    });
  }

  const project = await projectService.createProject(request.body);
  return reply.code(201).send({ data: project });
});
```

**Remove all manual validation:**
- Delete 6 `safeParse` calls
- Remove manual error responses for validation
- Use `fastify.authenticate` instead of local `authenticate`

### Phase 4: Refactor Auth Routes (20 min)

**Create `server/schemas/auth.schema.ts`:**
```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

**Update `routes/auth.ts`:**
- Add schema validation for login/register
- Remove manual validation checks
- Remove local `authenticate` function
- Use `fastify.authenticate` from plugin
- Keep existing Prisma error handling for unique constraints

### Phase 5: Clean Up Duplicates (20 min)

**Remove duplicate authenticate functions:**
1. Delete `authenticate` function from `routes/auth.ts:17-37`
2. Delete `authenticate` function from `routes/projects.ts:15-21`
3. Use only `fastify.authenticate` from plugin everywhere

**Remove duplicate type augmentations:**
1. Delete User type from `routes/auth.ts:6-14`
2. Keep only the version in `plugins/auth.ts:52-67`

**Delete backup file:**
```bash
rm apps/web/src/server/routes/shell.ts.bak
```

**Standardize to `{ data: T }` response format:**
- Update auth routes to return `{ data: { user, token } }` instead of `{ success: true, user, token }`
- Keep error format consistent across all routes

### Phase 6: Fix Logging (15 min)

**Replace all console.* with fastify.log:**

1. `plugins/auth.ts:39` - Remove `console.error('err', err)`
2. `file.service.ts:103,109` - Replace `console.warn` with logger parameter
3. `shell.service.ts:118` - Replace `console.error` with logger

**Update FileService to accept logger:**
```typescript
export class FileService {
  constructor(private logger?: FastifyBaseLogger) {}

  private async scanDirectory(...) {
    // Replace console.warn with:
    this.logger?.warn(`Skipping ${fullPath} due to error:`, error);
  }
}

// In routes, pass logger:
const fileService = new FileService(fastify.log);
```

### Phase 7: Type Safety Improvements (20 min)

**Define JWT payload interface:**
```typescript
// plugins/auth.ts
interface JWTPayload {
  userId: number;
  username: string;
}

// In authenticate function:
const decoded = await request.jwtVerify<JWTPayload>();
const userId = decoded.userId; // No assertion needed
```

**Fix Prisma error handling:**
```typescript
import { Prisma } from '@prisma/client';

// In project.service.ts
catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return null;
    }
  }
  throw error;
}
```

**Add route type definitions where needed:**
```typescript
interface CreateProjectRoute {
  Body: CreateProjectInput;
  Reply: { data: Project };
}

fastify.post<CreateProjectRoute>('/api/projects', ...)
```

### Phase 8: Security Essentials (20 min)

**Require JWT_SECRET:**
```typescript
// plugins/auth.ts
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

**Install security dependencies:**
```bash
pnpm add @fastify/cors @fastify/rate-limit
```

**Add CORS:**
```typescript
// server/index.ts
import cors from '@fastify/cors';

await fastify.register(cors, {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
  credentials: true,
});
```

**Add rate limiting to auth:**
```typescript
import rateLimit from '@fastify/rate-limit';

await fastify.register(rateLimit, {
  global: false, // Only on specific routes
});

// In auth routes:
fastify.post('/api/auth/login', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '1 minute',
    },
  },
  schema: { body: loginSchema },
}, handler);
```

**Fix WebSocket auth (move from query to header):**
```typescript
// routes/shell.ts
const token = request.headers.authorization?.replace('Bearer ', '');
// Remove query.token fallback
```

### Phase 9: Documentation (15 min)

**Add JSDoc to routes:**
```typescript
/**
 * Get all projects for the authenticated user
 *
 * @route GET /api/projects
 * @authentication Required - JWT token
 * @returns Array of projects ordered by creation date
 */
fastify.get('/api/projects', ...)
```

**Document WebSocket protocol in schema:**
```typescript
// schemas/shell.schema.ts
/**
 * WebSocket Shell Protocol
 *
 * Client → Server Messages:
 * - init: Initialize new shell session
 *   { type: 'init', projectId: string, cols: number, rows: number }
 * - input: Send user input to shell
 *   { type: 'input', data: string }
 * - resize: Notify terminal resize
 *   { type: 'resize', cols: number, rows: number }
 *
 * Server → Client Messages:
 * - initialized: Session created successfully
 *   { type: 'initialized', sessionId: string }
 * - output: Shell output data
 *   { type: 'output', data: string }
 * - exit: Shell process terminated
 *   { type: 'exit', exitCode: number, signal?: number }
 * - error: Error occurred
 *   { type: 'error', message: string }
 */
```

**Create server README:**
```markdown
# Server Architecture

## Structure
- `index.ts` - Server setup and configuration
- `routes/` - API route handlers
- `plugins/` - Fastify plugins (auth, etc.)
- `schemas/` - Zod validation schemas
- `services/` - Business logic layer

## Authentication
JWT-based authentication using @fastify/jwt
- Register/login at `/api/auth/*`
- Protected routes use `fastify.authenticate` preHandler

## Type Safety
Uses fastify-type-provider-zod for automatic validation and type inference
- Define schemas in `schemas/`
- Add to route config
- Get automatic TypeScript types

## WebSocket
- Main WebSocket at `/ws`
- Shell WebSocket at `/shell`
- Authenticated via JWT in Authorization header
```

## Expected Outcomes

### Code Quality
- ✅ Zero code duplication for auth middleware
- ✅ Single source of truth for types
- ✅ Consistent logging throughout
- ✅ Automatic request validation
- ✅ Full TypeScript inference

### Developer Experience
- ✅ Less boilerplate code
- ✅ Fewer manual validation checks
- ✅ Better IDE autocomplete
- ✅ Catches bugs at compile time
- ✅ Clear documentation

### Security
- ✅ No hardcoded secrets
- ✅ Rate limiting on auth endpoints
- ✅ CORS configured
- ✅ Proper error handling

### Maintainability
- ✅ Clear patterns established
- ✅ Documented architecture
- ✅ Type-safe schemas
- ✅ Consistent code style

## New Dependencies

```json
{
  "dependencies": {
    "fastify-type-provider-zod": "^2.0.0",
    "@fastify/cors": "^10.0.1",
    "@fastify/rate-limit": "^10.1.1"
  }
}
```

## Environment Variables Required

```bash
# Required
JWT_SECRET=your-secret-key-here

# Optional
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
```

## Testing the Changes

After implementation:

1. **Type safety**: `pnpm check-types` should pass
2. **Linting**: `pnpm lint` should pass
3. **Manual testing**:
   - Login/register still works
   - Rate limiting triggers after 5 attempts
   - CORS works from Vite dev server
   - All routes validate input correctly
   - Error responses are consistent

## Out of Scope (Not Needed Yet)

- OpenAPI/Swagger generation
- Metrics/monitoring systems
- Response compression
- API versioning
- Connection pooling tuning
- Caching layers
- Advanced session management

These can be added later when actually needed.
