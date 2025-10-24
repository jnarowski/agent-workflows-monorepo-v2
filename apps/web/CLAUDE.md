# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Turborepo monorepo** for agent workflow tools. The `web` app is a full-stack application with a React + Vite frontend and a Fastify backend, designed to manage and visualize AI agent workflows.

## Important Rules

- **Do not add `.js` or `.ts` extensions to file imports** - TypeScript/ESM resolution handles this automatically
- **Always use `@/` path aliases for imports** - Never use relative imports (`../`, `./`)
  - Client imports: `@/client/*` (components, hooks, pages, contexts, etc.)
  - Server imports: `@/server/*` (routes, services, schemas, plugins, etc.)
  - Shared imports: `@/shared/*` (types, utilities, Prisma client)

### useEffect Dependency Rules

**Critical**: Incorrect useEffect dependencies cause infinite re-renders, unnecessary API calls, and performance issues.

**Golden Rules:**
1. **Only include primitive values and stable references** in dependency arrays
   - ✅ Good: `[id, userId, isEnabled]` (primitives)
   - ❌ Bad: `[user, project, data]` (object references change every render)

2. **Object/Array dependencies from React Query or props will cause infinite loops**
   - Problem: `const { data: project } = useQuery(...)` creates a new object reference each render
   - ✅ Solution: Extract the primitive you need: `[project?.id]` or use only the ID
   - ✅ Better: Don't depend on the object at all if you only need it for the initial check

3. **Functions from hooks/stores are stable - don't include them**
   - ✅ Zustand store functions: `const handleInvalidToken = useAuthStore(s => s.handleInvalidToken)` (stable)
   - ✅ React Router: `navigate`, `location` from `useNavigate()` (stable)
   - ✅ Use `// eslint-disable-next-line react-hooks/exhaustive-deps` when intentionally omitting stable functions

4. **Common Patterns:**
   ```typescript
   // ❌ BAD - Runs on every render because 'project' object changes
   useEffect(() => {
     if (!id || !project) return;
     doSomething();
   }, [id, project, handleInvalidToken, navigate]);

   // ✅ GOOD - Only runs when ID changes
   useEffect(() => {
     if (!id) return;
     doSomething();
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [id]);
   ```

5. **When in doubt**: Use only primitive values (strings, numbers, booleans) in the dependency array

### Zustand State Management Rules

**Critical**: This project uses Zustand for global state management. Following these principles is essential for proper state updates and re-renders.

**Golden Rules:**

1. **Always Update State Immutably**
   - ❌ **BAD - Mutation**:
     ```typescript
     set((state) => {
       const messages = [...state.messages];
       messages[0].content = "new";  // Mutates object!
       return { messages };
     });
     ```
   - ✅ **GOOD - Immutable**:
     ```typescript
     set((state) => ({
       messages: state.messages.map((msg, i) =>
         i === 0 ? { ...msg, content: "new" } : msg
       ),
     }));
     ```

2. **Return New State from set()**
   - The `set()` function takes a callback that **returns** the new state
   - Zustand merges the returned object with current state
   - Example:
     ```typescript
     set((state) => ({
       count: state.count + 1,  // Returns new state
     }));
     ```

3. **Create New Arrays/Objects for Updates**
   - Spreading arrays: `[...array, newItem]` or `[...array.slice(0, -1), updatedItem]`
   - Spreading objects: `{ ...obj, field: newValue }`
   - Never modify arrays/objects in place

4. **Zustand Store Functions are Stable**
   - Store functions don't change between renders
   - Safe to omit from useEffect dependencies
   - Example:
     ```typescript
     const addMessage = useSessionStore((s) => s.addMessage);

     useEffect(() => {
       // addMessage is stable, don't include in deps
       // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [id]);  // Only include primitives
     ```

5. **Common Patterns:**
   ```typescript
   // ❌ BAD - Mutating nested object
   set((state) => {
     const session = { ...state.currentSession };
     session.messages.push(newMsg);  // Mutation!
     return { currentSession: session };
   });

   // ✅ GOOD - Fully immutable update
   set((state) => ({
     currentSession: state.currentSession
       ? {
           ...state.currentSession,
           messages: [...state.currentSession.messages, newMsg],
         }
       : null,
   }));
   ```

6. **Selector Performance**
   - Use selectors to subscribe to specific state slices
   - Prevents unnecessary re-renders when unrelated state changes
   - Example:
     ```typescript
     // ✅ Only re-renders when messages change
     const messages = useSessionStore((s) => s.currentSession?.messages);

     // ❌ Re-renders on ANY store change
     const store = useSessionStore();
     const messages = store.currentSession?.messages;
     ```

## Development Commands

### Starting the Application

```bash
# Development mode (runs both client and server concurrently)
pnpm dev

# Development server only (Fastify backend on port 3456)
pnpm dev:server

# Development client only (Vite dev server on port 5173)
pnpm dev:client

# Production mode
pnpm start
```

### Building

```bash
# Build both client and server
pnpm build

# Build from monorepo root (builds all packages)
cd ../.. && pnpm build
```

### Code Quality

```bash
# Lint code
pnpm lint

# Type checking
pnpm check-types  # From monorepo root

# Format code
pnpm format  # From monorepo root
```

### Database (Prisma)

```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Open Prisma Studio
pnpm prisma:studio
```

Database file: `prisma/dev.db` (SQLite)

## Architecture

### Monorepo Structure

```
apps/
  web/              # This app - full-stack workflow UI
  claudecodeui/     # Separate UI app
packages/
  agent-workflows/  # Core workflow utilities (@sourceborn/agent-workflows)
  agent-cli-sdk/    # CLI SDK for AI tools (@repo/agent-cli-sdk)
  ui/               # Shared UI components
  eslint-config/    # Shared ESLint configuration
  typescript-config/# Shared TypeScript configuration
```

### Web App Structure

```
src/
  client/           # React frontend (Vite root)
    components/     # React components
      ui/           # shadcn/ui components (Radix UI + Tailwind)
      ai-elements/  # AI chat interface components (Conversation, Message, etc.)
      projects/     # Project-specific components
    pages/          # Route pages (Dashboard, Projects, Login, Shell, etc.)
    layouts/        # Layout components (ProtectedLayout, AuthLayout)
    contexts/       # React contexts (AuthContext)
    hooks/          # Custom React hooks
    lib/            # Client utilities
  server/           # Fastify backend
    routes/         # API route handlers (auth, projects, shell)
    plugins/        # Fastify plugins (auth/JWT)
    schemas/        # Zod validation schemas
    services/       # Business logic services (ShellService, etc.)
    websocket.ts    # WebSocket handler
    index.ts        # Server entry point
  shared/           # Code shared between client and server
    types/          # Shared TypeScript types
    prisma.ts       # Prisma client singleton
```

### Technology Stack

**Frontend:**
- React 19 with TypeScript
- Vite for development and bundling
- React Router for routing
- TanStack Query (React Query) for server state
- Tailwind CSS v4 + shadcn/ui (Radix UI components)
- Zod for validation

**Backend:**
- Fastify (HTTP server)
- Fastify WebSocket support
- JWT authentication (@fastify/jwt)
- Prisma ORM with SQLite
- bcrypt for password hashing
- node-pty for terminal/shell sessions

**Build System:**
- Turborepo for monorepo orchestration
- pnpm for package management
- tsx for running TypeScript directly

### Key Architectural Patterns

1. **Client-Server Split**: Frontend (Vite dev server on `:5173`) proxies API requests to backend (Fastify on `:3456`) during development

2. **Authentication Flow**:
   - JWT tokens issued by `/api/auth/login` endpoint
   - Protected routes use `authPlugin` to verify JWT
   - Client stores token in `AuthContext` and includes in API requests

3. **Database Models** (Prisma):
   - `User` - User authentication
   - `Project` - Project management
   - `Workflow` - Workflow execution tracking
   - `WorkflowStep` - Individual workflow steps

4. **API Routes**:
   - `/api/auth/*` - Authentication endpoints (login, signup)
   - `/api/projects/*` - Project CRUD operations
   - `/api/workflows` - Workflow data (currently mock data)
   - `/ws` - WebSocket endpoint for real-time updates
   - `/shell` - WebSocket endpoint for terminal/shell sessions (JWT authenticated via query param)

5. **Import Aliases**:
   - `@/*` resolves to `src/*` (used across client, server, and shared code)
   - Client code: Use `@/client/*` for all client modules
   - Server code: Use `@/server/*` for all server modules
   - Shared code: Use `@/shared/*` for types, utilities, and Prisma client
   - **Never use relative imports** (`../`, `./`) - always use the `@/` alias

6. **Production Mode**: Built client assets are served from `dist/client/` by Fastify with SPA fallback

## Workspace Dependencies

The web app depends on workspace packages:
- `@repo/agent-cli-sdk` - SDK for orchestrating AI CLI tools
- `@repo/agent-workflows` - Agent workflow utilities

Use `workspace:*` protocol in package.json for workspace dependencies.

## Running Tests

Currently no test scripts configured in the web app. Tests are configured at the package level for workspace packages.

## Environment Variables

**Required:**
- `JWT_SECRET` - Secret key for signing JWT tokens (generate with `openssl rand -base64 32`)

**Optional (with defaults):**
- `PORT` - Backend server port (default: 3456)
- `VITE_PORT` - Vite dev server port (default: 5173)
- `HOST` - Server host (default: 127.0.0.1)
- `LOG_LEVEL` - Logging level: trace, debug, info, warn, error, fatal (default: info)
- `ALLOWED_ORIGINS` - Comma-separated CORS origins (default: http://localhost:5173)
- `NODE_ENV` - Node environment (default: development)

See `.env.example` for complete configuration template.

## Common Gotchas

1. **Server restarts**: Changes to server code require manual restart unless using `tsx watch` (which `pnpm dev:server` uses)

2. **Prisma schema changes**: Run `pnpm prisma:generate` after modifying `schema.prisma`

3. **Path aliases**: Always use `@/` aliases for imports across all code:
   - `@/client/*` in client code
   - `@/server/*` in server code
   - `@/shared/*` in both client and server
   - This applies to both Vite bundling (client) and tsx execution (server)

4. **Empty JSON bodies**: Server is configured to handle empty JSON bodies (e.g., DELETE with Content-Type: application/json)

5. **Development workflow**: Use `pnpm dev` from the web app directory to run both client and server together

6. **WebSocket authentication**: The `/shell` endpoint requires JWT authentication passed as a query parameter (`?token=...`) since browser WebSocket API doesn't support custom headers

7. **AI Elements components**: The `ai-elements/` directory contains reusable chat UI components (Conversation, Message, PromptInput, etc.) for building AI chat interfaces
- Debugging tip: server outputs to log/app.log agent can use it to see the latest output