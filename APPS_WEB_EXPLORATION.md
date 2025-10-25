# Agent Workflows Web Application - Comprehensive Exploration

## 1. Application Purpose & Overview

**Name:** Agent Workflows UI (formerly @repo/web)

**Main Purpose:** A visual, full-stack web application that serves as a unified interface for orchestrating and managing AI-powered code workflows using multiple AI agents (Claude Code, OpenAI Codex, Cursor, Gemini).

**Key Features:**
- Multi-agent support (Claude Code, Codex, Cursor, Gemini)
- Project-based organization and management
- Interactive chat sessions with AI agents
- File explorer and editor with syntax highlighting
- Terminal/shell integration with PTY support
- Git/source control integration
- Real-time WebSocket streaming
- Session persistence and synchronization
- User authentication with JWT

**Architecture Type:** Full-stack monorepo package with:
- **Frontend:** React 19 + Vite + TypeScript
- **Backend:** Fastify + SQLite (Prisma ORM)
- **CLI:** Node.js/Commander-based CLI tool for installation

---

## 2. Technology Stack & Dependencies

### Core Frameworks
- **React 19.1.1** - UI library with hooks
- **Vite 7.1.12** - Frontend bundler with HMR
- **Fastify 5.6.1** - Lightweight Node.js server
- **TypeScript ~5.9.3** - Type safety

### Frontend Libraries
- **React Router 7.9.4** - Client-side routing
- **TanStack React Query 5.90.5** - Server state management (queries, caching)
- **Zustand 5.0.8** - Client state management
- **next-themes** - Dark/light theme management
- **react-hook-form 7.65.0** - Form state management
- **@xyflow/react 12.9.0** - Flow/graph visualization (for workflows)

### UI Components & Styling
- **Radix UI** - Accessible headless UI components (accordion, alert-dialog, avatar, checkbox, dialog, dropdown, etc.)
- **Tailwind CSS 4.1.15** - Utility-first CSS framework
- **Lucide React 0.544.0** - Icon library
- **Sonner 2.0.7** - Toast notifications
- **Recharts 2.15.4** - Data visualization charts
- **React Markdown 10.1.0** - Markdown rendering
- **CodeMirror + UIW** - Code editor with syntax highlighting
- **xterm.js 5.5.0** - Terminal emulator for shell interface

### Database & ORM
- **Prisma 6.17.1** - ORM for SQLite
- **@prisma/client 6.17.1** - Type-safe database client
- **SQLite** - Lightweight database (via Prisma)

### AI & API Integration
- **@ai-sdk/anthropic 2.0.35** - Vercel AI SDK for Anthropic Claude
- **@ai-sdk/openai 2.0.53** - Vercel AI SDK for OpenAI
- **ai 5.0.76** - Vercel AI SDK core
- **@repo/agent-cli-sdk** - Custom SDK for orchestrating Claude Code & Codex CLIs

### Real-Time Communication
- **@fastify/websocket 11.2.0** - WebSocket support for Fastify
- **ws 8.14.2** - WebSocket client/server
- **node-pty 1.0.0** - Pseudo-terminal for shell integration

### Authentication & Security
- **@fastify/jwt 10.0.0** - JWT authentication plugin
- **bcrypt 6.0.0** - Password hashing
- **@fastify/cors 11.1.0** - CORS middleware
- **@fastify/rate-limit 10.3.0** - Rate limiting

### Utilities
- **zod 4.1.12** - TypeScript-first schema validation
- **date-fns 4.1.0** - Date manipulation
- **nanoid 5.1.6** - Unique ID generation
- **uuid 13.0.0** - UUID generation
- **fuse.js 7.1.0** - Fuzzy search
- **simple-git 3.28.0** - Git operations
- **diff 8.0.2** - Diff parsing
- **gray-matter 4.0.3** - YAML/frontmatter parsing
- **motion 12.23.24** - Animation library
- **shiki 3.13.0** - Syntax highlighting

### Server Plugins & Utilities
- **fastify-type-provider-zod 6.0.0** - Zod schema validation for Fastify
- **fastify-plugin 5.1.0** - Fastify plugin utilities
- **@fastify/static 8.3.0** - Static file serving
- **pino-pretty 13.1.2** - Pretty console logging

### Testing
- **Vitest 4.0.3** - Unit test framework
- **@testing-library/react 16.3.0** - React testing utilities
- **@testing-library/user-event 14.6.1** - User interaction testing
- **Playwright 1.56.1** - E2E testing
- **happy-dom 20.0.8** - Lightweight DOM implementation for tests

---

## 3. Project Structure

```
apps/web/
├── src/
│   ├── client/                          # React frontend (Vite)
│   │   ├── pages/                       # Page components
│   │   │   ├── auth/                    # Login/Signup pages
│   │   │   ├── Projects.tsx             # Project list page
│   │   │   ├── ProjectHome.tsx          # Project home
│   │   │   └── projects/                # Project feature pages
│   │   │       ├── sessions/            # Chat session pages
│   │   │       │   ├── ProjectSession.tsx    # Main chat interface
│   │   │       │   └── components/      # Session components
│   │   │       │       ├── ChatPromptInput.tsx
│   │   │       │       ├── CodeBlock.tsx
│   │   │       │       ├── session/
│   │   │       │       │   └── claude/  # Claude-specific rendering
│   │   │       │       │       ├── MessageRenderer.tsx
│   │   │       │       │       ├── ThinkingBlock.tsx
│   │   │       │       │       ├── ContentBlockRenderer.tsx
│   │   │       │       │       ├── ToolBlockRenderer.tsx
│   │   │       │       │       └── tools/ # Tool renderers (read, write, web search, etc.)
│   │   │       ├── files/               # File explorer & editor
│   │   │       │   ├── ProjectFiles.tsx
│   │   │       │   └── components/
│   │   │       │       ├── FileTree.tsx
│   │   │       │       ├── FileEditor.tsx
│   │   │       │       └── ImageViewer.tsx
│   │   │       ├── shell/               # Terminal interface
│   │   │       │   ├── ProjectShell.tsx
│   │   │       │   ├── components/
│   │   │       │   │   └── Terminal.tsx
│   │   │       │   └── contexts/
│   │   │       │       └── ShellContext.tsx
│   │   │       ├── git/                 # Source control
│   │   │       │   ├── ProjectSourceControl.tsx
│   │   │       │   └── components/
│   │   │       │       ├── ChangesView.tsx
│   │   │       │       ├── CommitCard.tsx
│   │   │       │       ├── CreateBranchDialog.tsx
│   │   │       │       └── ... (git features)
│   │   │       └── components/
│   │   │           └── ProjectDialog.tsx
│   │   ├── layouts/                     # Layout wrappers
│   │   │   ├── AuthLayout.tsx
│   │   │   ├── ProtectedLayout.tsx
│   │   │   └── ProjectDetailLayout.tsx
│   │   ├── components/                  # Reusable components
│   │   │   ├── ui/                      # UI primitives (Radix-based)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── textarea.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── file-badge.tsx
│   │   │   │   └── ... (20+ UI components)
│   │   │   ├── ai-elements/             # AI-specific components
│   │   │   │   ├── message.tsx
│   │   │   │   ├── response.tsx
│   │   │   │   ├── PromptInput.tsx
│   │   │   │   ├── conversation.tsx
│   │   │   │   ├── Reasoning.tsx
│   │   │   │   ├── Sources.tsx
│   │   │   │   └── branch.tsx
│   │   │   ├── AppSidebar.tsx           # Main sidebar
│   │   │   ├── AppSidebarMain.tsx
│   │   │   ├── AppInnerSidebar.tsx
│   │   │   ├── ProjectHeader.tsx
│   │   │   ├── CommandMenu.tsx          # Command palette
│   │   │   ├── NavUser.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── lib/                         # Utilities & helpers
│   │   │   ├── api-client.ts            # API request wrapper
│   │   │   ├── api-types.ts             # Type definitions for API
│   │   │   ├── auth.ts                  # Auth utilities
│   │   │   ├── query-client.ts          # React Query setup
│   │   │   ├── projectSync.ts
│   │   │   ├── WebSocketEventBus.ts     # WebSocket event management
│   │   │   ├── utils.ts                 # Helper functions
│   │   │   ├── agents/                  # Agent-specific transforms
│   │   │   │   ├── claude/
│   │   │   │   │   ├── transformMessages.ts
│   │   │   │   │   └── transformStreaming.ts
│   │   │   │   ├── codex/
│   │   │   │   ├── cursor/
│   │   │   │   └── gemini/
│   │   │   └── __mocks__/               # Mock data for testing
│   │   ├── stores/                      # Zustand state stores
│   │   ├── hooks/                       # Custom React hooks
│   │   ├── providers/                   # Context providers
│   │   │   └── WebSocketProvider.tsx
│   │   ├── assets/                      # Images, icons, etc.
│   │   ├── contexts/                    # React contexts
│   │   ├── main.tsx                     # Entry point
│   │   ├── App.tsx                      # Router setup
│   │   └── index.html
│   │
│   ├── server/                          # Fastify backend
│   │   ├── index.ts                     # Server factory & setup
│   │   ├── routes/                      # API endpoints
│   │   │   ├── auth.ts                  # POST /api/auth/register, /api/auth/status, /api/auth/login
│   │   │   ├── projects.ts              # Project CRUD endpoints
│   │   │   ├── sessions.ts              # Session management endpoints
│   │   │   ├── shell.ts                 # Shell/terminal endpoints
│   │   │   ├── git.ts                   # Git operations endpoints
│   │   │   └── slash-commands.ts        # Slash command endpoints
│   │   ├── services/                    # Business logic
│   │   │   ├── agentSession.ts          # Session management
│   │   │   ├── project.ts               # Project operations
│   │   │   ├── file.ts                  # File operations
│   │   │   ├── shell.ts                 # Shell/PTY management
│   │   │   ├── git.service.ts           # Git operations
│   │   │   ├── slashCommand.ts          # Slash command processing
│   │   │   ├── projectSync.ts           # Project/session sync
│   │   │   ├── *.test.ts                # Unit tests
│   │   ├── agents/                      # Agent adapters
│   │   │   ├── claude/
│   │   │   │   ├── parseFormat.ts       # Parse Claude output format
│   │   │   │   └── loadSession.ts       # Load existing Claude session
│   │   │   ├── codex/
│   │   │   ├── cursor/
│   │   │   └── gemini/
│   │   ├── plugins/                     # Fastify plugins
│   │   │   └── auth.ts                  # JWT authentication plugin
│   │   ├── schemas/                     # Zod validation schemas
│   │   │   ├── auth.ts
│   │   │   ├── project.ts
│   │   │   ├── session.ts
│   │   │   ├── response.ts
│   │   │   ├── shell.ts
│   │   │   ├── git.ts
│   │   │   └── slashCommand.ts
│   │   ├── utils/                       # Utility functions
│   │   │   ├── auth.ts                  # JWT utilities
│   │   │   ├── error.ts                 # Error classes & handlers
│   │   │   ├── path.ts                  # Path utilities
│   │   │   ├── response.ts              # Response builders
│   │   │   ├── generateSessionName.ts   # AI-generated session names
│   │   │   └── shutdown.ts              # Graceful shutdown
│   │   ├── websocket.ts                 # WebSocket event handlers
│   │   ├── websocket.types.ts           # WebSocket type definitions
│   │   └── routes.ts                    # Route registration
│   │
│   ├── shared/                          # Shared backend/frontend code
│   │   ├── types/                       # Shared TypeScript interfaces
│   │   │   ├── agent.types.ts
│   │   │   ├── agent-session.types.ts
│   │   │   ├── message.types.ts
│   │   │   ├── chat.ts
│   │   │   ├── project.types.ts
│   │   │   ├── file.types.ts
│   │   │   ├── git.types.ts
│   │   │   ├── tool.types.ts
│   │   │   ├── slash-command.types.ts
│   │   │   ├── websocket.ts
│   │   │   ├── project-sync.types.ts
│   │   │   ├── claude-session.types.ts
│   │   │   └── index.ts
│   │   ├── prisma.ts                    # Prisma client setup
│   │   └── utils/
│   │
│   └── components/                      # (legacy or shared components)
│
├── dist/                                # Build output
│   ├── client/                          # Vite build output
│   └── cli.js                           # CLI executable
│
├── prisma/
│   └── schema.prisma                    # Database schema
│
├── src/cli/                             # CLI tool for installation
│   ├── index.ts                         # CLI entry point (agent-workflows-ui command)
│   ├── commands/
│   │   └── install.ts                   # install command
│   └── utils/
│       ├── paths.ts                     # Path utilities
│       └── config.ts                    # Config utilities
│
├── public/                              # Static assets
├── package.json                         # Dependencies & scripts
├── vite.config.ts                       # Vite configuration
├── tsconfig.json                        # TypeScript base config
├── tsconfig.app.json                    # Client TypeScript config
├── tsconfig.server.json                 # Server TypeScript config
├── tsconfig.cli.json                    # CLI TypeScript config
├── tsconfig.node.json                   # Build tools config
├── tsconfig.shared.json                 # Shared config
├── .env.example                         # Environment template
├── .env                                 # Environment variables (not in git)
├── .eslintrc.js                         # ESLint config
├── .agent-workflows.config.example      # CLI config template
└── README.md                             # Project documentation
```

---

## 4. Key Features & Functionality

### Project Management
- **Create/Read/Update/Delete projects** - Organize AI workflows by project
- **Project details** - Name, path, creation date, starred/hidden status
- **Project synchronization** - Sync projects with filesystem

### Chat Sessions
- **Multi-agent support** - Claude Code, Codex, Cursor, Gemini
- **Session persistence** - Store session history with metadata
- **Session continuation** - Resume existing sessions
- **AI-generated session names** - Auto-name sessions using Claude API
- **Session metadata** - Track token usage, message count, timestamps

### File Management
- **File explorer** - Browse project directory tree
- **Code editor** - Edit files with CodeMirror syntax highlighting
- **Image viewer** - Display images inline
- **File support** - CSS, HTML, JavaScript, Python, Markdown, JSON, etc.

### Terminal Integration
- **Pseudo-terminal (PTY)** - Full terminal emulation with xterm.js
- **Shell interaction** - Run commands in project directory
- **Real-time output** - WebSocket streaming of terminal output

### Source Control (Git)
- **Commit history** - View and navigate commits
- **File changes** - Show diffs and file status
- **Branch management** - Create and switch branches
- **Pull requests** - Create PRs
- **Raw diff viewer** - View git diffs

### Authentication & Security
- **JWT-based auth** - Token-based authentication
- **Single-user system** - Only one user can register (single-user deployment)
- **Password hashing** - Bcrypt with 12 salt rounds
- **Protected routes** - Auth-required endpoints
- **Rate limiting** - Global and per-route rate limits

### Real-Time Communication
- **WebSocket streaming** - Real-time chat and event streaming
- **Event-driven architecture** - Flat message types (session.{id}.send_message)
- **Active session tracking** - Maintain active session states
- **Graceful shutdown** - Clean WebSocket disconnects

### AI Integration
- **Agent CLI orchestration** - Execute Claude Code, Codex via their CLIs
- **Streaming responses** - Parse and stream agent responses
- **Tool execution** - Display and manage tool calls (read, write, web search, etc.)
- **Thinking blocks** - Claude extended thinking display
- **Structured output** - JSON extraction and validation

### Slash Commands
- **Dynamic commands** - Configurable command system
- **Auto-completion** - Command discovery and autocomplete
- **Command processing** - Handle special commands like /ask, /debug, etc.

---

## 5. Database Schema (Prisma/SQLite)

```prisma
# Users - Single-user system
User {
  id            String (UUID)
  username      String (unique)
  password_hash String
  created_at    DateTime
  last_login    DateTime?
  is_active     Boolean
  sessions      AgentSession[]
}

# Projects - Organize workflows
Project {
  id         String (CUID)
  name       String
  path       String (unique)
  is_hidden  Boolean
  is_starred Boolean
  created_at DateTime
  updated_at DateTime
  sessions   AgentSession[]
}

# Agent Sessions - Chat sessions with AI agents
AgentSession {
  id         String (UUID)
  projectId  String (FK)
  userId     String (FK)
  name       String?              # AI-generated session name
  agent      AgentType (enum)     # claude, codex, cursor, gemini
  metadata   Json                 # { totalTokens, messageCount, lastMessageAt, firstMessagePreview }
  created_at DateTime
  updated_at DateTime
  indexes: [projectId+updated_at, userId+updated_at]
}

# Workflows - Placeholder for future state storage
Workflow {
  id         String
  name       String
  status     String
  created_at DateTime
  updated_at DateTime
}

# WorkflowStep - Placeholder for workflow steps
WorkflowStep {
  id          String (UUID)
  workflow_id String
  name        String
  status      String
  result      String? (JSON)
  created_at  DateTime
  updated_at  DateTime
}

# Enums
AgentType = claude | codex | cursor | gemini
```

**Database Location:** `~/.agent/database.db` (SQLite)

---

## 6. API Routes & Endpoints

### Authentication Routes (`/api/auth`)
```
GET    /api/auth/status                    # Check setup & auth status
POST   /api/auth/register                  # Register user (single-user)
POST   /api/auth/login                     # Login (not fully shown)
```

### Project Routes (`/api/projects`)
```
GET    /api/projects                       # List user projects
POST   /api/projects                       # Create project
GET    /api/projects/:id                   # Get project details
PATCH  /api/projects/:id                   # Update project
DELETE /api/projects/:id                   # Delete project
POST   /api/projects/:id/sync              # Sync project sessions
```

### Session Routes (`/api/projects/:id/sessions`)
```
GET    /api/projects/:id/sessions          # Get sessions for project
POST   /api/projects/:id/sessions          # Create new session
GET    /api/projects/:id/sessions/:sessionId/messages  # Get session messages
PATCH  /api/projects/:id/sessions/:sessionId # Update session
```

### Shell Routes (`/api/shell`)
```
WebSocket: /shell/:sessionId               # PTY terminal streaming
```

### Git Routes (`/api/projects/:id/git`)
```
GET    /api/projects/:id/git/status        # Git status
GET    /api/projects/:id/git/history       # Commit history
GET    /api/projects/:id/git/diff/:commit  # Commit diff
POST   /api/projects/:id/git/commit        # Create commit
POST   /api/projects/:id/git/branch        # Create branch
```

### Slash Commands Routes (`/api/slash-commands`)
```
GET    /api/slash-commands                 # List available commands
```

### WebSocket Routes (`/ws`)
```
WebSocket: /ws                             # Main chat streaming
  Message types:
  - session.{id}.send_message              # Send chat message
  - session.{id}.message                   # Receive response
  - session.{id}.event                     # Stream events
  - session.{id}.error                     # Error handling
```

---

## 7. Environment Variables & Configuration

### Required Variables
```env
JWT_SECRET=your-secret-key-change-in-production    # JWT signing key
```

### Optional Variables (with defaults)
```env
LOG_LEVEL=info                             # Logging level
LOG_FILE=./logs/app.log                    # Log file path
ALLOWED_ORIGINS=http://localhost:5173     # CORS origins
PORT=3456                                  # Server port
HOST=127.0.0.1                            # Server host
VITE_PORT=5173                             # Vite dev server port
NODE_ENV=development                       # Environment
ANTHROPIC_API_KEY=...                      # For session name generation
DATABASE_URL=...                           # Set by CLI
```

### CLI Configuration
File: `~/.agents/agent-workflows-ui-config.json`
```json
{
  "uiPort": 5173,
  "serverPort": 3456,
  "dbPath": "~/.agent/database.db",
  "logLevel": "info"
}
```

---

## 8. Main Scripts

```bash
# Development
pnpm dev                    # Start both frontend (Vite) & backend (Fastify)
pnpm dev:server            # Start backend only (tsx watch)
pnpm dev:client            # Start frontend only (Vite)

# Building
pnpm build                 # Build everything (TypeScript + Vite + CLI)
pnpm build:cli             # Build CLI tool specifically
pnpm check-types           # Type check without emitting

# Testing
pnpm test                  # Run unit tests (Vitest)
pnpm test:watch            # Run tests in watch mode
pnpm test:ui               # Run tests with UI

# Code Quality
pnpm lint                  # Run ESLint
pnpm format                # Format with Prettier
pnpm check                 # Run lint + type-check + test

# Database
pnpm prisma:generate       # Generate Prisma client
pnpm prisma:migrate        # Run migrations
pnpm prisma:studio         # Open Prisma Studio GUI
```

---

## 9. Special Setup Requirements

### CLI Installation
The app includes a CLI tool (`agent-workflows-ui`) that handles initialization:

```bash
agent-workflows-ui install          # Initialize database and config
agent-workflows-ui install --force  # Overwrite existing database
```

This command:
1. Creates `~/.agent/` and `~/.agents/` directories
2. Runs Prisma migrations to create SQLite database
3. Creates config file at `~/.agents/agent-workflows-ui-config.json`

### Database Setup
- **Type:** SQLite (file-based)
- **Path:** `~/.agent/database.db`
- **Migrations:** Managed by Prisma
- **ORM:** Prisma with type safety

### External Services
- **Claude API** - Optional, for AI-generated session names
- **Git** - If using source control features
- **Agent CLIs** - Claude Code, Codex CLIs must be installed for agent execution

---

## 10. Key Components & Their Roles

### Frontend Components

**Pages:**
- `Projects.tsx` - Project listing and management
- `ProjectSession.tsx` - Main chat interface
- `ProjectFiles.tsx` - File explorer and editor
- `ProjectShell.tsx` - Terminal interface
- `ProjectSourceControl.tsx` - Git operations
- `Login.tsx / Signup.tsx` - Auth pages

**Layouts:**
- `ProtectedLayout` - Auth wrapper
- `AuthLayout` - Auth page wrapper
- `ProjectDetailLayout` - Project detail wrapper

**Key Components:**
- `AppSidebar` - Main navigation sidebar
- `PromptInput` - Chat input component
- `MessageRenderer` (Claude) - Format and display agent messages
- `ToolBlockRenderer` (Claude) - Display tool calls
- `FileTree` - File browser
- `Terminal` - xterm.js wrapper
- `CodeBlock` - Syntax-highlighted code display

### Backend Services

**Core Services:**
- `agentSession.ts` - Session CRUD and persistence
- `project.ts` - Project management
- `file.ts` - File system operations
- `shell.ts` - PTY and terminal management
- `git.service.ts` - Git operations wrapper
- `slashCommand.ts` - Slash command processing
- `projectSync.ts` - Sync projects with filesystem

**Adapters:**
- Agent-specific implementations for Claude, Codex, Cursor, Gemini
- Format parsing and message transformation

**Plugins:**
- `auth.ts` - JWT authentication plugin

---

## 11. Key Implementation Details

### Real-Time Streaming (WebSocket)
- Uses flat event naming: `session.{id}.{action}`
- JSONL streaming for agent responses
- Event bus pattern for managing subscriptions

### Session Persistence
- Session files stored on filesystem
- Metadata in database (Prisma AgentSession model)
- Hybrid approach: DB for queries, FS for full conversation

### Authentication Flow
1. User registers first time (single-user system)
2. Password hashed with bcrypt (12 salt rounds)
3. JWT token generated (no expiration)
4. Token stored in localStorage on frontend
5. Token sent in Authorization header for API requests

### Agent Execution
1. CLI argument builder creates command flags
2. Process spawned with `cross-spawn`
3. JSONL output parsed line-by-line
4. Events streamed via WebSocket
5. Session metadata updated (tokens, message count)

### Type Safety
- Zod schemas for API validation (request/response)
- TypeScript interfaces for all data structures
- fastify-type-provider-zod for automatic validation
- Strict TypeScript config (noUncheckedIndexedAccess, noUnusedLocals, etc.)

---

## 12. Code Statistics

- **Total Lines of Code (src):** ~30,300 lines
- **Frontend:** React + Vite (client/)
- **Backend:** Fastify + Services + Routes (server/)
- **Shared:** Types and utilities

---

## 13. Testing

- **Unit Tests:** Vitest with Node environment
- **Test Location:** Tests live next to source files (`.test.ts` / `.test.tsx`)
- **E2E Tests:** Playwright (requires real CLI installations)
- **Test Examples:**
  - `agentSession.test.ts` - Session service tests
  - `projectSync.test.ts` - Project sync tests
  - `file-badge.test.tsx` - UI component tests

---

## 14. Development Workflow

1. **Start development servers:**
   ```bash
   pnpm dev
   ```
   This runs Vite (port 5173) and Fastify (port 3456) concurrently

2. **Vite proxies requests:**
   - `/api/*` → `http://localhost:3456/api`
   - `/ws/*` → `ws://localhost:3456/ws`

3. **Frontend development:**
   - React hooks (useState, useEffect, etc.)
   - React Query for server state
   - Zustand for client state
   - Tailwind CSS for styling

4. **Backend development:**
   - Fastify routes with Zod validation
   - Prisma for database access
   - WebSocket handlers for real-time features
   - Service layer for business logic

---

## 15. Deployment Considerations

### Build Output
- **Frontend:** Built to `dist/client/` (Vite)
- **Backend:** Compiled TypeScript
- **CLI:** Built to `dist/cli.js`

### Production Deployment
- Static files served from `dist/client/`
- SPA fallback redirects to `index.html`
- Fastify serves API and WebSocket routes
- Database stored at `~/.agent/database.db`

### Docker/Systemd
- Uses `tsx` for running TypeScript directly
- Can be containerized or run with systemd
- Logging to stdout + file for Docker/PM2 support

---

## Summary

**Agent Workflows Web** is a sophisticated, full-stack application that:

1. **Provides a unified UI** for multiple AI agents (Claude, Codex, Cursor, Gemini)
2. **Manages projects** as containers for organizing workflows
3. **Enables real-time chat** with agents via WebSocket streaming
4. **Integrates with file systems** for code editing and exploration
5. **Includes terminal access** with PTY support
6. **Tracks git operations** with source control integration
7. **Persists sessions** with metadata and conversation history
8. **Authenticates users** with JWT (single-user system)
9. **Validates all inputs** with Zod schemas
10. **Supports extensible agent adapters** for new AI services

The architecture emphasizes **type safety, real-time capabilities, modularity, and user experience**.
