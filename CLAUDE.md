# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Turborepo monorepo** for AI agent workflow tools, featuring:

- **`apps/web`**: Full-stack application (React + Vite frontend, Fastify backend) for managing and visualizing AI agent workflows with chat interface, file editor, and terminal
- **`@repo/agent-cli-sdk`**: TypeScript SDK for orchestrating AI-powered CLI tools (Claude Code, OpenAI Codex) programmatically
- **`@repo/agent-workflows`**: Core workflow utilities library with automatic state persistence, logging, and error handling
- **Shared packages**: UI components, ESLint configs, TypeScript configs

## Essential Commands

### Monorepo-Level Commands (from root)

```bash
# Install all dependencies
pnpm install

# Build all packages (Turborepo handles dependencies)
pnpm build

# Run all tests across monorepo
pnpm test

# Lint all packages
pnpm lint

# Type-check all packages
pnpm check-types

# Validate everything (lint + type-check + tests)
pnpm check

# Format code
pnpm format
```

### Web App Development (from `apps/web/`)

```bash
# First-time setup (creates .env, migrates database)
pnpm dev:setup

# Start dev servers (client + server)
pnpm dev

# Start only backend (port 3456)
pnpm dev:server

# Start only frontend (port 5173)
pnpm dev:client

# Database operations
pnpm prisma:generate     # Generate Prisma client
pnpm prisma:migrate      # Run migrations
pnpm prisma:studio       # Open database GUI

# Build and start production
pnpm build
pnpm start
```

### Package Development

```bash
# Build specific package
pnpm --filter @repo/agent-cli-sdk build
pnpm --filter @repo/agent-workflows build

# Run tests in specific package
cd packages/agent-cli-sdk
pnpm test                # Run all tests
pnpm test:watch          # Watch mode
pnpm test:e2e            # E2E tests with real CLI

# Run single test file
pnpm vitest run src/path/to/file.test.ts
```

## Architecture Overview

### Monorepo Structure

```
.
├── apps/
│   └── web/                    # Full-stack workflow UI application
│       ├── src/
│       │   ├── client/         # React frontend (Vite)
│       │   ├── server/         # Fastify backend
│       │   │   ├── domain/     # Domain-driven business logic
│       │   │   │   ├── project/    # Project management
│       │   │   │   ├── session/    # Agent sessions
│       │   │   │   ├── file/       # File operations
│       │   │   │   ├── git/        # Git operations
│       │   │   │   └── shell/      # Shell/terminal
│       │   │   ├── routes/     # HTTP route handlers (thin)
│       │   │   ├── websocket.ts # WebSocket transport (thin)
│       │   │   ├── plugins/    # Fastify plugins
│       │   │   └── config.ts   # Centralized configuration
│       │   └── shared/         # Shared types, Prisma client
│       ├── prisma/             # Database schema and migrations
│       └── logs/               # Server logs (apps/web/logs/app.log)
│
├── packages/
│   ├── agent-cli-sdk/          # SDK for AI CLI tools
│   │   ├── src/
│   │   │   ├── claude/         # Claude Code integration
│   │   │   ├── types/          # Unified types across tools
│   │   │   └── utils/          # Process spawning, JSON extraction
│   │   └── tests/
│   │       ├── fixtures/       # JSONL examples for testing
│   │       └── e2e/            # Integration tests with real CLI
│   │
│   ├── agent-workflows/        # Workflow orchestration library
│   │   ├── src/
│   │   │   ├── workflow/       # Workflow class
│   │   │   ├── storage/        # Storage adapters (FileStorage)
│   │   │   ├── types/          # Core type definitions
│   │   │   └── utils/          # Helpers (logging, formatting)
│   │   └── examples/           # Reference implementations
│   │
│   ├── ui/                     # Shared React components
│   ├── eslint-config/          # Shared ESLint configs
│   └── typescript-config/      # Shared TypeScript configs
│
├── turbo.json                  # Turborepo task configuration
├── pnpm-workspace.yaml         # pnpm workspace definition
└── CLAUDE.md                   # This file
```

### Key Architectural Concepts

**1. Turborepo Build Pipeline**

- Tasks depend on each other: `build` → `lint` → `check-types` → `test`
- Use `^build` syntax to ensure dependencies build first
- Caching enabled for faster rebuilds
- Run tasks with `pnpm build` from root or `turbo run build`

**2. Workspace Dependencies**

- Packages use `workspace:*` protocol (e.g., `"@repo/agent-cli-sdk": "workspace:*"`)
- Changes to workspace packages require rebuilding dependents
- No builds happen during `pnpm install` (except Prisma generation)

**3. Module Resolution**

- All packages use ESM (`type: "module"`)
- TypeScript with `moduleResolution: "bundler"`
- Use `@/` path aliases in web app: `@/client/*`, `@/server/*`, `@/shared/*`

**Import Extensions:**

**DO NOT include file extensions in imports**:
- ✅ `import { foo } from "./bar"`
- ❌ `import { foo } from "./bar.js"`

**Why**: All packages use `moduleResolution: "bundler"` which tells TypeScript that bundlers (Vite, Bunchee, TSX) will handle extension resolution at build/runtime. Extensions are added automatically during transpilation.

**4. Multi-Agent Architecture**

The web app supports multiple AI CLI tools:
- **Claude Code** (primary): Full integration with session loading, JSONL parsing
- **OpenAI Codex**: Planned integration via agent-cli-sdk
- **Cursor, Gemini**: Stubbed for future support

All agents normalized to `UnifiedMessage` format via agent-cli-sdk.

**5. Tool Result Matching Pattern**

All interactive tools in the web app follow a standardized pattern:
- Tool results are matched to tool invocations via `tool_use_id` automatically
- Matching happens once during message enrichment (O(1) Map-based lookup)
- Results are nested into `tool_use` blocks before rendering
- Components receive enriched `{input, result}` props - no manual lookups required
- Images auto-parse to `UnifiedImageBlock`, other content stays as strings
- Pattern documented in `.agent/docs/claude-tool-result-patterns.md`

**6. Domain-Driven Backend Architecture**

The web app backend (`apps/web/src/server/`) follows a domain-driven functional architecture:

**Domain Structure:**
```
server/
├── domain/                 # Business logic organized by domain
│   ├── project/           # Project management domain
│   │   ├── services/      # Pure functions (one per file)
│   │   ├── types/         # Domain-specific types
│   │   └── schemas/       # Zod validation schemas
│   ├── session/           # Agent session domain
│   ├── file/              # File operations domain
│   ├── git/               # Git operations domain
│   └── shell/             # Shell/terminal domain
├── routes/                # Thin HTTP route handlers
├── websocket.ts           # Thin WebSocket transport
├── plugins/               # Fastify plugins (auth, etc.)
└── config.ts              # Centralized configuration
```

**Key Principles:**
- **One function per file** in `domain/*/services/` - file name matches exported function
- **Group by domain**, not by technical layer (no generic "services/" folder)
- **Pure functions** - all dependencies passed as parameters, no classes
- **Routes are thin orchestrators** - delegate to domain services
- **WebSocket is transport** - business logic stays in domain layer
- **Centralized config** - all environment variables accessed via `config.ts`

**Example Domain Function:**
```typescript
// domain/project/services/getProjectById.ts
export async function getProjectById(id: string): Promise<Project | null> {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return null;

  const currentBranch = await getCurrentBranch(project.path);
  return transformProject(project, currentBranch);
}
```

**Import Pattern:**
```typescript
// ✅ GOOD - Import from domain
import { getProjectById } from '@/server/domain/project/services/getProjectById.js';
import { readFile } from '@/server/domain/file/services/readFile.js';

// ❌ BAD - Don't import from old services/ directory
import { getProjectById } from '@/server/services/project.service.js';
```

## Important Rules & Conventions

### General Monorepo Rules

1. **Build packages before using them**: If you see "module not found" errors, run `pnpm build`
2. **Use workspace protocol**: Always use `workspace:*` for internal package dependencies
3. **Turborepo caching**: Second builds complete in <2s due to caching
4. **Import extensions**: Use `.js` in imports even for `.ts` files
5. **Unit tests are co-located**: Place `*.test.ts` next to source files, not in separate `tests/` folder

### Web App Specific Rules

**Backend Domain Organization:**
- ✅ **One function per file** in `domain/*/services/` - file name MUST match exported function name
  - Example: `getProjectById.ts` exports `export async function getProjectById()`
- ✅ **Group by domain**, not by technical layer - use `domain/project/`, `domain/session/`, etc.
- ✅ **Pure functions** - pass all dependencies (logger, config) as parameters, no classes
- ✅ **Thin route handlers** - delegate all business logic to domain services
- ✅ **Import from domain/** - use `@/server/domain/project/services/getProjectById.js`
- ❌ **Never import from services/** - old pattern, being phased out
- ✅ **WebSocket handlers are thin** - orchestrate domain functions, don't contain business logic
- ✅ **Use centralized config** - import from `@/server/config.js`, don't access `process.env` directly

**Import Paths:**
- ✅ Always use `@/` aliases: `@/client/*`, `@/server/*`, `@/shared/*`
- ❌ Never use relative imports: `../`, `./`

**React Hooks:**
- Import directly: `import { useEffect, useState } from 'react'`
- Not: `React.useEffect`

**useEffect Dependencies:**
- Only include primitive values (strings, numbers, booleans)
- ❌ Bad: `[user, project, data]` (objects cause infinite loops)
- ✅ Good: `[userId, projectId, isEnabled]`
- Zustand store functions are stable - safe to omit from deps

**Zustand State Management:**
- Always update state immutably
- Return new state from `set()` function
- Create new arrays/objects for updates:
  ```typescript
  // ❌ BAD - Mutation
  set((state) => {
    state.messages.push(newMsg);
    return { messages: state.messages };
  });

  // ✅ GOOD - Immutable
  set((state) => ({
    messages: [...state.messages, newMsg]
  }));
  ```

**Fastify Response Schemas:**
- When adding fields to API responses, update Zod schema:
  ```typescript
  schema: {
    response: {
      200: projectResponseSchema,  // Must match response structure
    }
  }
  ```

**File Organization:**
- Feature-based structure under `pages/{feature}/`
- Each feature has: `components/`, `hooks/`, `stores/`, `lib/`, `utils/`
- Only truly shared components go in top-level `components/`
- PascalCase for components, kebab-case only for shadcn/ui components

**Testing:**
- Tests go next to the file: `component.tsx` → `component.test.tsx`
- Use `@testing-library/react` for component tests
- Use `happy-dom` as test environment

### Package-Specific Rules

**agent-cli-sdk:**
- Files in camelCase: `loadSession.ts`, `parseFormat.ts`
- One primary export per file matching filename
- Use exhaustive type checking with `never` for tool selection
- E2E tests run sequentially (`singleFork: true`)
- Permission modes: `default` (safe), `acceptEdits` (auto-accept), `bypassPermissions` (dangerous)

**agent-workflows:**
- Config-based API (pass config objects, not individual params)
- Result pattern for error handling: `Result<T, E>`
- Use `unwrap()` for fail-fast, or handle `result.ok` explicitly
- Auto-incrementing step numbers via `workflow.currentStepNumber`
- Automatic `completedAt` timestamp when status becomes "completed"

## Development Workflow

### Starting Development

**First Time:**
```bash
# From root
pnpm install
pnpm build

# Set up web app
cd apps/web
pnpm dev:setup    # Creates .env, runs migrations
pnpm dev          # Start both client and server
```

**Ongoing:**
```bash
# From apps/web
pnpm dev          # Runs both client and server with watch mode
```

**Frontend**: http://localhost:5173
**Backend API**: http://localhost:3456
**Logs**: `apps/web/logs/app.log`

### Making Changes

**To Web App Code:**
- Frontend changes: Hot reload automatically
- Backend changes: Server auto-restarts via `tsx watch`

**To Workspace Packages:**
```bash
# Rebuild the package
cd packages/agent-cli-sdk
pnpm build

# Or from root
pnpm --filter @repo/agent-cli-sdk build

# Web app will pick up changes on next import
```

**To Database Schema:**
```bash
cd apps/web
# Edit prisma/schema.prisma
pnpm prisma:generate    # Regenerate client
pnpm prisma:migrate     # Create and run migration
```

### Running Tests

```bash
# All tests across monorepo
pnpm test

# Specific package
cd packages/agent-cli-sdk
pnpm test               # Unit tests
pnpm test:watch         # Watch mode
pnpm test:e2e           # E2E with real CLI (180s timeout)

# Single test file
pnpm vitest run src/claude/parse.test.ts

# Web app tests
cd apps/web
pnpm test
```

### Build System Details

**When Builds Happen:**
- ✅ Explicit: `pnpm build`
- ✅ Development: Turborepo rebuilds on changes
- ✅ Publishing: `prepublishOnly` hook
- ✅ Prisma: Always after `pnpm install` in apps/web
- ❌ NOT during `pnpm install` for TypeScript packages

**Build Tools:**
- **Turborepo**: Orchestrates builds with caching
- **Vite**: Frontend bundling (web app)
- **TSC**: Server-side TypeScript compilation (web app)
- **Bunchee**: Package bundling (agent-cli-sdk, agent-workflows)

**Clean Build:**
```bash
# Remove all build artifacts
rm -rf packages/*/dist apps/*/dist

# Rebuild everything
pnpm build
```

## Debugging & Troubleshooting

### Web App Debugging

**Check Server Logs:**
```bash
# Real-time log watching
tail -f apps/web/logs/app.log

# Pretty-printed with jq
tail -f apps/web/logs/app.log | jq .

# Filter for errors
tail -f apps/web/logs/app.log | jq 'select(.level >= 50)'
```

**Common Issues:**

1. **WebSocket connection failures**: Check logs, verify server running, check JWT token
2. **Database locked**: Kill node processes, restart dev server
3. **Agent not streaming**: Verify Claude CLI installed (`which claude`), check WebSocket events
4. **File operations failing**: Check permissions, verify project path
5. **Auth issues**: Check JWT_SECRET, regenerate token

**Health Check:**
```bash
curl http://localhost:3456/api/health
```

**Test Authentication:**
```bash
curl -X POST http://localhost:3456/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

### Package Debugging

**TypeScript Errors:**
```bash
# Regenerate Prisma client
cd apps/web
pnpm prisma:generate

# Check TypeScript across all packages
pnpm check-types

# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Module Not Found:**
```bash
# Build the missing package
pnpm --filter @repo/agent-cli-sdk build

# Or build all packages
pnpm build
```

**Test Failures:**
```bash
# Run with verbose output
pnpm test --reporter=verbose

# Run specific test
pnpm vitest run path/to/test.test.ts
```

## Technology Stack

### Web App
- **Frontend**: React 19, Vite, React Router, TanStack Query, Zustand
- **Backend**: Fastify, WebSocket, Prisma (SQLite), JWT auth
- **UI**: Tailwind CSS v4, shadcn/ui (Radix UI components)
- **Code Editor**: CodeMirror with syntax highlighting
- **Terminal**: xterm.js with node-pty

### Packages
- **agent-cli-sdk**: TypeScript, cross-spawn, Zod, Vitest
- **agent-workflows**: TypeScript, simple-git, gray-matter, Vitest
- **Build Tools**: Turborepo, Bunchee, TSX, ESBuild

## Environment Variables

### Web App (apps/web/.env)

**Required:**
- `JWT_SECRET`: JWT signing key (generate: `openssl rand -base64 32`)

**Optional (with defaults):**
- `PORT`: Backend port (default: 3456)
- `VITE_PORT`: Frontend port (default: 5173)
- `HOST`: Server host (default: 127.0.0.1)
- `LOG_LEVEL`: Logging level (default: info)
- `ALLOWED_ORIGINS`: CORS origins (default: http://localhost:5173)
- `NODE_ENV`: Environment (default: development)
- `ANTHROPIC_API_KEY`: For AI features (optional)

**First-time setup:**
```bash
cd apps/web
pnpm dev:setup    # Auto-generates .env from .env.example
```

## Publishing Packages

### agent-cli-sdk
```bash
cd packages/agent-cli-sdk
pnpm ship
# Runs: build → tests → version bump → commit → tag → push → publish
```

### agent-workflows
```bash
cd packages/agent-workflows
pnpm ship
# Publishes to both npm (@repo/agent-workflows) and private registry (@spectora/agent-workflows)
```

## Additional Resources

- **Web App Guide**: See `apps/web/CLAUDE.md` for detailed web app architecture
- **agent-cli-sdk Guide**: See `packages/agent-cli-sdk/CLAUDE.md` for SDK details
- **agent-workflows Guide**: See `packages/agent-workflows/CLAUDE.md` for workflow utilities
- **README**: See `README.md` for getting started and project overview
- **Turborepo Docs**: https://turborepo.com/docs

## Quick Reference

**File Locations:**
- Server logs: `apps/web/logs/app.log`
- Database: `apps/web/prisma/dev.db`
- Workflow logs: `.agent/workflows/logs/{workflowId}/`
- Build output: `dist/` in each package/app

**Port Numbers:**
- Frontend dev server: 5173
- Backend API: 3456
- Prisma Studio: 5555

**Common Tasks:**
- Add new dependency: `pnpm add <package>` (in specific workspace)
- Add dev dependency: `pnpm add -D <package>`
- Remove dependency: `pnpm remove <package>`
- Update dependencies: `pnpm update`
- Clear Turborepo cache: `rm -rf .turbo`
