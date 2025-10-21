# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Turborepo monorepo** for agent workflow tools. The `web` app is a full-stack application with a React + Vite frontend and a Fastify backend, designed to manage and visualize AI agent workflows.

## Important Rules

- **Do not add `.js` or `.ts` extensions to file imports** - TypeScript/ESM resolution handles this automatically

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
      projects/     # Project-specific components
    pages/          # Route pages (Dashboard, Projects, Login, etc.)
    layouts/        # Layout components (ProtectedLayout, AuthLayout)
    contexts/       # React contexts (AuthContext)
    hooks/          # Custom React hooks
    lib/            # Client utilities
  server/           # Fastify backend
    routes/         # API route handlers (auth, projects)
    plugins/        # Fastify plugins (auth/JWT)
    schemas/        # Zod validation schemas
    services/       # Business logic services
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
   - `/api/auth/*` - Authentication endpoints
   - `/api/projects/*` - Project CRUD operations
   - `/api/workflows` - Workflow data (currently mock data)
   - `/ws` - WebSocket endpoint

5. **Import Aliases**:
   - `@/*` resolves to `src/client/*` (client-side only)

6. **Production Mode**: Built client assets are served from `dist/client/` by Fastify with SPA fallback

## Workspace Dependencies

The web app depends on workspace packages:
- `@repo/agent-cli-sdk` - SDK for orchestrating AI CLI tools
- `@repo/agent-workflows` - Agent workflow utilities

Use `workspace:*` protocol in package.json for workspace dependencies.

## Running Tests

Currently no test scripts configured in the web app. Tests are configured at the package level for workspace packages.

## Environment Variables

- `PORT` - Backend server port (default: 3456)
- `VITE_PORT` - Vite dev server port (default: 5173)
- `HOST` - Server host (default: 127.0.0.1)

## Common Gotchas

1. **Server restarts**: Changes to server code require manual restart unless using `tsx watch` (which `pnpm dev:server` uses)

2. **Prisma schema changes**: Run `pnpm prisma:generate` after modifying `schema.prisma`

3. **Path aliases**: The `@/*` alias only works in client code; server code uses relative imports

4. **Empty JSON bodies**: Server is configured to handle empty JSON bodies (e.g., DELETE with Content-Type: application/json)

5. **Development workflow**: Use `pnpm dev` from the web app directory to run both client and server together
