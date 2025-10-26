# Fastify Cleanup and Standardization Spec

## Overview
This specification outlines improvements to standardize and implement best practices for the Fastify server implementation in `apps/web/src/server`.

## Current State Analysis

### Strengths
- Well-organized file structure with separation of concerns
- Type-safe request/response handling
- Proper use of plugins for modularity
- WebSocket integration working

### Issues to Address
1. Inconsistent authentication patterns (duplicate vs decorated methods)
2. No schema validation at Fastify level (Zod used separately)
3. Limited global error handling
4. Mixed middleware approaches
5. No request validation middleware
6. Inconsistent route registration patterns
7. Missing environment-based configuration
8. No rate limiting or security headers
9. Logging not consistently used

---

## Tasks

### 1. Standardize Authentication Pattern

**Priority:** HIGH
**Affected Files:**
- `src/server/plugins/auth.ts`
- `src/server/routes/auth.ts`
- All routes using authentication

**Current Issue:**
Routes duplicate the authenticate function instead of using the plugin's decorated method.

**Changes:**
- Remove duplicate `authenticate` function from `routes/auth.ts`
- Use `fastify.authenticate` consistently across all protected routes
- Ensure type augmentation is properly imported in all route files
- Update all `preHandler` hooks to use the decorated method

**Example:**
```typescript
// Before (auth.ts)
const authenticate = async (request, reply) => { ... }
fastify.get('/api/auth/user', { preHandler: authenticate }, ...)

// After
fastify.get('/api/auth/user', { preHandler: fastify.authenticate }, ...)
```

---

### 2. Integrate Schema Validation with Fastify

**Priority:** MEDIUM
**Affected Files:**
- `src/server/routes/projects.ts`
- `src/server/routes/auth.ts`
- `src/server/schemas/project.schema.ts` (may need conversion)

**Current Issue:**
Zod schemas exist but aren't integrated with Fastify's validation system.

**Changes:**
- Install `@fastify/type-provider-zod` for Zod integration
- Convert existing Zod schemas to Fastify schema format OR
- Use Zod schemas directly with type provider
- Add schema validation to all routes
- Remove manual validation code from route handlers

**Dependencies to Add:**
```json
"@fastify/type-provider-zod": "^2.0.0"
```

**Example:**
```typescript
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from '@fastify/type-provider-zod';

// In server initialization
fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// In routes
fastify.withTypeProvider<ZodTypeProvider>().post('/api/projects', {
  schema: {
    body: createProjectSchema,
    response: {
      201: projectResponseSchema
    }
  }
}, async (request, reply) => {
  // request.body is now fully typed and validated
})
```

---

### 3. Implement Global Error Handling

**Priority:** HIGH
**Affected Files:**
- `src/server/index.ts`
- New file: `src/server/plugins/error-handler.ts`

**Current Issue:**
Limited error middleware or global error handling.

**Changes:**
- Create custom error handler plugin
- Implement consistent error response format
- Add error logging with proper severity levels
- Handle validation errors separately
- Add custom error classes for different scenarios
- Ensure errors don't leak sensitive information in production

**Implementation:**
```typescript
// plugins/error-handler.ts
import fastifyPlugin from 'fastify-plugin';

export default fastifyPlugin(async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;

    fastify.log.error({
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method
    });

    // Don't leak error details in production
    const response = {
      error: statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : error.message,
      statusCode
    };

    reply.code(statusCode).send(response);
  });
});
```

---

### 4. Add Environment-Based Configuration

**Priority:** MEDIUM
**Affected Files:**
- `src/server/index.ts`
- New file: `src/server/config.ts`

**Current Issue:**
Configuration is hardcoded or scattered across files.

**Changes:**
- Create centralized config module
- Use environment variables with sensible defaults
- Validate configuration on startup
- Type-safe configuration object
- Document all environment variables

**Implementation:**
```typescript
// config.ts
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  JWT_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGIN: z.string().default('*'),
});

export const config = configSchema.parse(process.env);
export type Config = z.infer<typeof configSchema>;
```

---

### 5. Implement Security Best Practices

**Priority:** HIGH
**Affected Files:**
- `src/server/index.ts`
- `package.json`

**Current Issue:**
Missing security headers, CORS configuration, and rate limiting.

**Changes:**
- Install and configure `@fastify/helmet` for security headers
- Install and configure `@fastify/cors` properly
- Install and configure `@fastify/rate-limit`
- Configure CORS with proper origins (not wildcard in production)
- Add Content Security Policy headers

**Dependencies to Add:**
```json
"@fastify/helmet": "^12.0.0",
"@fastify/cors": "^10.0.1",
"@fastify/rate-limit": "^10.0.0"
```

**Implementation:**
```typescript
// index.ts
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

await fastify.register(helmet, {
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
});

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
  allowList: ['127.0.0.1'],
});
```

---

### 6. Standardize Route Registration

**Priority:** MEDIUM
**Affected Files:**
- `src/server/routes.ts`
- `src/server/routes/auth.ts`
- `src/server/routes/projects.ts`

**Current Issue:**
Some routes in routes.ts directly, others via plugins - inconsistent pattern.

**Changes:**
- Move all routes to plugin-based registration
- Remove direct route registration from routes.ts
- Create consistent route plugin template
- Use route prefixing for API versioning
- Group related routes together

**Example Structure:**
```typescript
// routes/auth.ts
export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', { schema: registerSchema }, registerHandler);
  fastify.post('/login', { schema: loginSchema }, loginHandler);
  fastify.get('/user', {
    preHandler: fastify.authenticate,
    schema: userSchema
  }, userHandler);
  fastify.post('/logout', {
    preHandler: fastify.authenticate
  }, logoutHandler);
}

// routes.ts
export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(projectRoutes, { prefix: '/api/projects' });
}
```

---

### 7. Improve Logging Strategy

**Priority:** MEDIUM
**Affected Files:**
- `src/server/index.ts`
- All route files

**Current Issue:**
Logging not consistently used across routes.

**Changes:**
- Configure Fastify logger with proper levels
- Use structured logging (JSON in production)
- Add request ID tracking
- Log important events consistently (auth attempts, errors, etc.)
- Use appropriate log levels (info, warn, error, debug)
- Configure log rotation for production

**Implementation:**
```typescript
// index.ts
const server = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport: config.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
  requestIdLogLabel: 'requestId',
  genReqId: (req) => req.headers['x-request-id'] || nanoid(),
});

// In routes
fastify.log.info({ userId: request.user.id }, 'User logged in');
fastify.log.error({ error, userId }, 'Failed to create project');
```

---

### 8. Add Request/Response Interceptors

**Priority:** LOW
**Affected Files:**
- New file: `src/server/plugins/interceptors.ts`

**Current Issue:**
No request/response lifecycle hooks for cross-cutting concerns.

**Changes:**
- Add request timing middleware
- Add request/response logging
- Add correlation ID to all responses
- Add performance monitoring hooks

**Implementation:**
```typescript
// plugins/interceptors.ts
export default fastifyPlugin(async (fastify) => {
  fastify.addHook('onRequest', async (request) => {
    request.startTime = Date.now();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - request.startTime;
    fastify.log.info({
      url: request.url,
      method: request.method,
      statusCode: reply.statusCode,
      duration,
    }, 'Request completed');
  });
});
```

---

### 9. Improve Type Safety

**Priority:** MEDIUM
**Affected Files:**
- All route files
- `src/server/plugins/auth.ts`

**Current Issue:**
Some type assertions and inconsistent typing.

**Changes:**
- Remove all `as any` or type assertions
- Properly type all route handlers
- Use Fastify's TypeScript generics consistently
- Ensure request.user is properly typed everywhere
- Add types for WebSocket messages

**Example:**
```typescript
// Define types
interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: number;
    username: string;
    is_active: boolean;
  };
}

// Use in routes
fastify.get<{
  Reply: { user: User } | { error: string }
}>('/api/auth/user', {
  preHandler: fastify.authenticate,
}, async (request: AuthenticatedRequest, reply) => {
  return { user: request.user };
});
```

---

### 10. Optimize Custom Content-Type Parser

**Priority:** LOW
**Affected Files:**
- `src/server/index.ts`

**Current Issue:**
Custom JSON parser is a workaround for empty bodies.

**Changes:**
- Investigate if still necessary with schema validation
- If needed, document why it exists
- Consider using `@fastify/formbody` for form handling
- Ensure it doesn't conflict with other parsers

---

### 11. Add Health Check and Metrics Endpoints

**Priority:** MEDIUM
**Affected Files:**
- New file: `src/server/routes/health.ts`
- `src/server/routes.ts`

**Current Issue:**
No health check endpoint for monitoring.

**Changes:**
- Add `/health` endpoint for liveness checks
- Add `/ready` endpoint for readiness checks
- Add basic metrics endpoint (request counts, etc.)
- Check database connectivity in readiness

**Implementation:**
```typescript
// routes/health.ts
export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  fastify.get('/ready', async () => {
    // Check dependencies (database, etc.)
    try {
      // await checkDatabaseConnection();
      return { status: 'ready' };
    } catch (error) {
      throw fastify.httpErrors.serviceUnavailable('Service not ready');
    }
  });
}
```

---

### 12. Improve WebSocket Implementation

**Priority:** MEDIUM
**Affected Files:**
- `src/server/websocket.ts`

**Current Issue:**
Basic WebSocket implementation without error handling or typing.

**Changes:**
- Add error handling for WebSocket connections
- Type WebSocket messages properly
- Add connection authentication
- Implement heartbeat/ping-pong
- Add connection limits
- Document WebSocket protocol

**Implementation:**
```typescript
// websocket.ts
interface WSMessage {
  type: 'ping' | 'pong' | 'data';
  payload?: unknown;
}

export async function registerWebSocket(fastify: FastifyInstance) {
  fastify.get('/ws', {
    websocket: true,
    preHandler: fastify.authenticate, // Require auth
  }, (socket, request) => {
    const userId = (request as AuthenticatedRequest).user.id;

    socket.send(JSON.stringify({ type: 'connected' }));

    // Heartbeat
    const interval = setInterval(() => {
      socket.ping();
    }, 30000);

    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as WSMessage;
        // Handle message
      } catch (error) {
        fastify.log.error({ error, userId }, 'Invalid WebSocket message');
        socket.send(JSON.stringify({ type: 'error', error: 'Invalid message' }));
      }
    });

    socket.on('close', () => {
      clearInterval(interval);
      fastify.log.info({ userId }, 'WebSocket disconnected');
    });

    socket.on('error', (error) => {
      fastify.log.error({ error, userId }, 'WebSocket error');
    });
  });
}
```

---

### 13. Add Testing Infrastructure

**Priority:** HIGH
**Affected Files:**
- New directory: `src/server/__tests__/`
- `package.json`

**Current Issue:**
No tests for server endpoints.

**Changes:**
- Add test setup using Vitest or Jest
- Add tests for all routes
- Test authentication flow
- Test error handling
- Test WebSocket connections
- Add test helpers for authenticated requests

**Dependencies to Add:**
```json
"vitest": "^1.0.0",
"@faker-js/faker": "^8.0.0"
```

**Example Test:**
```typescript
// __tests__/auth.test.ts
import { build } from '../index';

describe('Auth Routes', () => {
  let app;

  beforeAll(async () => {
    app = await build({ logger: false });
  });

  afterAll(() => app.close());

  test('POST /api/auth/register creates user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'testuser',
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toHaveProperty('token');
  });
});
```

---

### 14. Documentation

**Priority:** MEDIUM
**Affected Files:**
- New file: `apps/web/src/server/README.md`
- New file: `apps/web/src/server/API.md`

**Current Issue:**
No documentation for server architecture or API.

**Changes:**
- Document server architecture and file structure
- Document all API endpoints with examples
- Document authentication flow
- Document WebSocket protocol
- Add JSDoc comments to all routes and plugins
- Create developer onboarding guide

---

## Implementation Order

### Phase 1: Critical Security & Stability (Week 1)
1. Global Error Handling (Task 3)
2. Security Best Practices (Task 5)
3. Standardize Authentication Pattern (Task 1)

### Phase 2: Code Quality & Consistency (Week 2)
4. Environment-Based Configuration (Task 4)
5. Schema Validation Integration (Task 2)
6. Standardize Route Registration (Task 6)
7. Improve Type Safety (Task 9)

### Phase 3: Observability & Reliability (Week 3)
8. Improve Logging Strategy (Task 7)
9. Health Check Endpoints (Task 11)
10. Request/Response Interceptors (Task 8)

### Phase 4: Enhanced Features & Quality (Week 4)
11. Improve WebSocket Implementation (Task 12)
12. Testing Infrastructure (Task 13)
13. Documentation (Task 14)
14. Optimize Content-Type Parser (Task 10)

---

## Success Criteria

- [ ] All routes use consistent authentication pattern
- [ ] Schema validation on all endpoints
- [ ] Global error handler catches all errors
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] All configuration from environment variables
- [ ] Health check endpoints operational
- [ ] Comprehensive test coverage (>80%)
- [ ] All routes fully typed with no assertions
- [ ] Logging configured with structured output
- [ ] Documentation complete
- [ ] WebSocket connections properly authenticated
- [ ] No security vulnerabilities in dependencies

---

## Dependencies to Add

```json
{
  "@fastify/type-provider-zod": "^2.0.0",
  "@fastify/helmet": "^12.0.0",
  "@fastify/cors": "^10.0.1",
  "@fastify/rate-limit": "^10.0.0",
  "pino-pretty": "^11.0.0",
  "nanoid": "^5.0.0"
}
```

```json
{
  "vitest": "^1.0.0",
  "@faker-js/faker": "^8.0.0"
}
```

---

## Configuration Files to Add

### `.env.example`
```env
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Security
JWT_SECRET=your-super-secret-key-min-32-chars
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=info

# Database (if applicable)
DATABASE_URL=
```

### `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

---

## Notes

- Maintain backward compatibility where possible
- Update frontend to handle new error formats
- Consider API versioning for future changes
- Review Fastify documentation for latest best practices
- Monitor performance impact of new plugins
- Ensure changes don't break existing WebSocket clients

---

## References

- [Fastify Documentation](https://fastify.dev)
- [Fastify Best Practices](https://fastify.dev/docs/latest/Guides/Getting-Started/#your-first-plugin)
- [Fastify TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [Zod Type Provider](https://github.com/fastify/fastify-type-provider-zod)
- [OWASP Security Guidelines](https://owasp.org/www-project-api-security/)
