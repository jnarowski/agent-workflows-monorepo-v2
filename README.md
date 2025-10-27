# Agent Workflows Monorepo

A Turborepo-based monorepo for AI agent workflow tools, including a full-stack web application for managing and visualizing AI agent workflows, and TypeScript SDKs for orchestrating AI-powered CLI tools.

## What's Inside?

This monorepo includes the following packages and apps:

### Apps

- **`web`** - Full-stack application (React + Vite frontend, Fastify backend) for managing AI agent workflows
- **`claudecodeui`** - Standalone UI application (currently not active)

### Packages

- **`@repo/agent-cli-sdk`** - TypeScript SDK for orchestrating AI-powered CLI tools (Claude Code, OpenAI Codex)
- **`@repo/agent-workflows`** - Core workflow utilities library with automatic state persistence and logging
- **`@repo/ui`** - Shared UI components library
- **`@repo/eslint-config`** - Shared ESLint configurations
- **`@repo/typescript-config`** - Shared TypeScript configurations

## Getting Started

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 8.0.0

### First-Time Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd agent-workflows-monorepo-v2
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```
   This will:
   - Install all dependencies across the monorepo
   - Automatically generate Prisma client (for database access)

3. **Set up the web application** (first-time only)
   ```bash
   cd apps/web
   pnpm setup
   ```
   This will:
   - Create `.env` file with secure JWT_SECRET (if it doesn't exist)
   - Create and migrate the database (`prisma/dev.db`)
   - Set up the development environment

4. **Configure environment variables** (optional)
   ```bash
   # Edit .env and add your API keys (especially ANTHROPIC_API_KEY)
   ```

5. **Build all packages**
   ```bash
   # From monorepo root
   pnpm build
   ```
   This builds all workspace packages that other apps depend on.

6. **Start development server**
   ```bash
   cd apps/web
   pnpm dev
   ```
   The application will be available at:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3456

## Development Workflow

### Common Commands

**Install Dependencies:**
```bash
# From monorepo root
pnpm install
```
Note: This is now much faster! TypeScript packages no longer build during install.

**Build Everything:**
```bash
# From monorepo root
pnpm build
```

**Build Specific Package:**
```bash
# Build just one workspace package
pnpm --filter @repo/agent-cli-sdk build
pnpm --filter @repo/agent-workflows build
```

**Clean Build (from scratch):**
```bash
# Remove all build artifacts
rm -rf packages/*/dist apps/*/dist

# Rebuild everything
pnpm build
```

**Start Web Application:**
```bash
cd apps/web
pnpm dev              # Both client and server
pnpm dev:server       # Backend only
pnpm dev:client       # Frontend only
```

**Run Tests:**
```bash
# From monorepo root
pnpm test

# From specific package
cd packages/agent-cli-sdk
pnpm test
```

**Lint and Type Check:**
```bash
# From monorepo root
pnpm lint
pnpm check-types
```

## When Do Builds Happen?

Understanding when TypeScript packages are built is important for efficient development:

### ✅ Builds DO Happen:

- **Explicit builds** - When you run `pnpm build` (from root or in a package)
- **Development mode** - Turborepo rebuilds packages when you change source code
- **Publishing** - Before publishing to npm (via `prepublishOnly` hook)
- **Prisma generation** - Always runs after `pnpm install` in `apps/web` (via `postinstall` hook, required for TypeScript types)

### ❌ Builds DON'T Happen:

- **During `pnpm install`** - TypeScript packages are NOT built automatically
  - Exception: Prisma client generation in `apps/web` (runs via `postinstall`, intentional and required)
  - This makes `pnpm install` ~80% faster!

### Why This Design?

The old behavior (`prepare` scripts) caused TypeScript packages to build on every `pnpm install`, which:
- Made fresh installs take 2+ minutes instead of ~30 seconds
- Rebuilt packages unnecessarily when you only needed to install dependencies
- Slowed down CI/CD pipelines

The new behavior:
- ✅ Fast installs (no unnecessary builds)
- ✅ On-demand builds via Turborepo (only when needed)
- ✅ Automatic builds before publishing (via `prepublishOnly`)
- ✅ Prisma generation uses `postinstall` (Prisma's recommended pattern, only runs in apps/web)
- ✅ First-time setup is explicit via `pnpm setup` command

### Troubleshooting

If you see import errors or "module not found" errors:
```bash
# Make sure packages are built
pnpm build

# Or build just the packages you need
pnpm --filter @repo/agent-cli-sdk build
pnpm --filter @repo/agent-workflows build
```

## Turborepo Caching

This monorepo uses Turborepo for intelligent build caching:

- **Local caching** - Build artifacts are cached on your machine
- **Incremental builds** - Only changed packages rebuild
- **Task dependencies** - Packages build in the correct order

Example:
```bash
# First build (builds everything)
pnpm build

# Second build (uses cache, completes in <2 seconds)
pnpm build
```

## Project Structure

```
.
├── apps/
│   ├── web/                    # Main web application
│   │   ├── src/
│   │   │   ├── client/         # React frontend
│   │   │   ├── server/         # Fastify backend
│   │   │   └── shared/         # Shared code
│   │   ├── prisma/             # Database schema
│   │   └── scripts/            # Build/setup scripts
│   └── claudecodeui/           # Standalone UI (inactive)
│
├── packages/
│   ├── agent-cli-sdk/          # SDK for AI CLI tools
│   ├── agent-workflows/        # Workflow orchestration
│   ├── ui/                     # Shared UI components
│   ├── eslint-config/          # ESLint configs
│   └── typescript-config/      # TypeScript configs
│
├── turbo.json                  # Turborepo configuration
├── pnpm-workspace.yaml         # pnpm workspace config
└── README.md                   # This file
```

## Publishing Packages

### `@repo/agent-cli-sdk`

```bash
cd packages/agent-cli-sdk
pnpm ship
```

This will:
1. Build the package (via `prepublishOnly` hook)
2. Run all checks (tests, lint, type-check)
3. Bump version
4. Create git commit and tag
5. Push to GitHub
6. Publish to npm

### `@repo/agent-workflows`

```bash
cd packages/agent-workflows
pnpm ship
```

This package publishes to both npm (`@repo/agent-workflows`) and a private registry (`@spectora/agent-workflows`).

## Database (Prisma)

The web app uses Prisma with SQLite:

```bash
cd apps/web

# Generate Prisma client (after schema changes)
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Open Prisma Studio (database GUI)
pnpm prisma:studio
```

Database file location: `apps/web/prisma/dev.db`

## Environment Variables

The web app requires environment variables. When you run `pnpm setup` for the first time, a `.env` file is created automatically from `.env.example` with:
- **JWT_SECRET** - Auto-generated secure random value
- **ANTHROPIC_API_KEY** - Placeholder (you need to add your own)

See `apps/web/.env.example` for all available options.

## Useful Links

### Turborepo
- [Tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Filtering](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters)

### Package Documentation
- See `packages/agent-cli-sdk/README.md` for SDK documentation
- See `packages/agent-workflows/README.md` for workflow utilities documentation
- See `apps/web/CLAUDE.md` for web application development guide

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `pnpm lint` and `pnpm check-types`
4. Test your changes
5. Create a pull request

## License

MIT
