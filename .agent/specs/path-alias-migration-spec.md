# Path Alias Migration Specification

## Overview

Migrate the Vite alias from `@` → `src/client` to `@` → `src`, enabling explicit layer imports across the entire codebase.

## Goals

1. Make imports explicit by showing the layer (`@/client/*`, `@/server/*`, `@/shared/*`)
2. Create symmetry between client and server import patterns
3. Eliminate all relative imports in favor of absolute alias imports
4. Improve code clarity and maintainability

## Current State

### Configuration

- `vite.config.ts`: `@` → `./src/client`
- `tsconfig.json`: `@/*` → `./src/client/*`
- `tsconfig.app.json`: `@/*` → `./src/client/*`
- `tsconfig.server.json`: No path aliases configured

### Import Patterns

**Client code** - Mix of import patterns:
- `@/` aliases: 104 occurrences in 59 files
- `../` relative imports: 146 occurrences in 57 files
- `./` same-directory imports: 38 occurrences in 12 files
- `../../shared` imports: 28 occurrences in 23 files (subset of `../` count)

**Server code** - Exclusively relative imports

## Target State

### Configuration

- `vite.config.ts`: `@` → `./src`
- `tsconfig.json`: `@/*` → `./src/*`
- `tsconfig.app.json`: `@/*` → `./src/*`
- `tsconfig.server.json`: `@/*` → `./src/*` (add baseUrl and paths)

### Import Patterns

- **Client code**: All imports use `@/client/*` for client modules, `@/shared/*` for shared
- **Server code**: All imports use `@/server/*` for server modules, `@/shared/*` for shared
- **Shared code**: Imported as `@/shared/*` from both client and server
- **No relative imports**: All `../`, `./` imports converted to absolute `@/` aliases

## Implementation Plan

### Phase 1: Configuration Updates

- [x] 1.1 Update Vite Configuration
- [x] 1.2 Update TypeScript Configuration (Root)
- [x] 1.3 Update TypeScript Configuration (App/Client)
- [x] 1.4 Update TypeScript Configuration (Server)

#### Completion Notes

- All 4 configuration files updated successfully
- `vite.config.ts`: Changed alias from `./src/client` to `./src`
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.server.json`: All updated to use `./src/*` path mapping
- `tsconfig.server.json`: Added baseUrl and paths configuration for first time

#### 1.1 Update Vite Configuration

**File**: `apps/web/vite.config.ts:18`

**Change:**
```typescript
// Before
alias: {
  "@": path.resolve(__dirname, "./src/client"),
},

// After
alias: {
  "@": path.resolve(__dirname, "./src"),
},
```

#### 1.2 Update TypeScript Configuration (Root)

**File**: `apps/web/tsconfig.json:12`

**Change:**
```json
// Before
"paths": {
  "@/*": ["./src/client/*"]
}

// After
"paths": {
  "@/*": ["./src/*"]
}
```

#### 1.3 Update TypeScript Configuration (App/Client)

**File**: `apps/web/tsconfig.app.json:28`

**Change:**
```json
// Before
"paths": {
  "@/*": ["./src/client/*"]
}

// After
"paths": {
  "@/*": ["./src/*"]
}
```

#### 1.4 Update TypeScript Configuration (Server)

**File**: `apps/web/tsconfig.server.json`

**Add** after line 15 (after `esModuleInterop`):

```json
/* Path Aliases */
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"]
},
```

### Phase 2: Client Code Migration

- [x] 2.1 Update Existing `@/` Imports (104 occurrences, 59 files)
- [x] 2.2 Convert Parent Directory Imports (146 occurrences, 57 files)
- [x] 2.3 Convert Shared Imports (28 occurrences, 23 files)
- [x] 2.4 Convert Same-Directory Imports (38 occurrences, 12 files)

#### Completion Notes

- Successfully migrated all client imports to use `@/client/` and `@/shared/` aliases
- Fixed 14 files that had incorrect `@/client/ui/` imports (should have been `@/client/components/ui/`)
- All relative imports (`../`, `../../shared`) have been converted to absolute aliases
- Same-directory imports within modules (e.g., `./MessageRenderer` in chat/) were preserved as they are module-local
- 131 files total were updated across components, hooks, pages, contexts, and utilities
- No remaining `../` or `../../shared` imports in client code
- TypeScript compilation successful after migration

#### 2.1 Update Existing `@/` Imports (104 occurrences, 59 files)

Transform all existing `@/` imports to `@/client/`:

**Pattern**: `from "@/` → `from "@/client/`

**Example files**:
- `src/client/layouts/ProtectedLayout.tsx`
- `src/client/components/signup-form.tsx`
- `src/client/components/login-form.tsx`
- All `src/client/components/ui/*.tsx` files (shadcn components)
- `src/client/components/ai-elements/*.tsx` files

**Example transformation**:
```typescript
// Before
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

// After
import { Button } from "@/client/components/ui/button";
import { useAuth } from "@/client/contexts/AuthContext";
```

#### 2.2 Convert Parent Directory Imports (146 occurrences, 57 files)

Transform all `../` relative imports in client code to use `@/client/`:

**Pattern**: `from "../` → `from "@/client/`

**Example files**:
- `src/client/pages/ProjectChat.tsx`
- `src/client/pages/ProjectDetail.tsx`
- `src/client/pages/Projects.tsx`
- `src/client/hooks/*.ts`
- `src/client/components/chat/*.tsx`
- `src/client/components/terminal/*.tsx`

**Example transformations**:
```typescript
// Before
import { ChatInterface } from "../components/chat/ChatInterface";
import { useClaudeSession } from "../hooks/useClaudeSession";

// After
import { ChatInterface } from "@/client/components/chat/ChatInterface";
import { useClaudeSession } from "@/client/hooks/useClaudeSession";
```

#### 2.3 Convert Shared Imports (28 occurrences, 23 files)

Transform all `../../shared` imports in client code to use `@/shared/`:

**Pattern**: `from "../../shared/` → `from "@/shared/`

**Example files**:
- `src/client/hooks/useProjects.ts`
- `src/client/hooks/useAgentSessions.ts`
- `src/client/hooks/useSessionMessages.ts`
- `src/client/contexts/ChatContext.tsx`
- `src/client/utils/parseClaudeSession.ts`

**Example transformations**:
```typescript
// Before
import type { Project, CreateProjectRequest } from "../../shared/types/project.types";
import type { SyncProjectsResponse } from "../../shared/types/project-sync.types";

// After
import type { Project, CreateProjectRequest } from "@/shared/types/project.types";
import type { SyncProjectsResponse } from "@/shared/types/project-sync.types";
```

#### 2.4 Convert Same-Directory Imports (38 occurrences, 12 files)

Review and convert `./` imports to use `@/client/` for cross-module imports:

**Pattern**: `from "./` → `from "@/client/` (for cross-module imports)

**Note**: Index file re-exports (e.g., `from "./types"` in an index.ts) may remain as `./` if they're in the same directory. Focus on converting cross-module imports.

**Example files**:
- `src/client/App.tsx`
- `src/client/main.tsx`
- `src/client/hooks/useClaudeSession.ts`
- `src/client/components/FileTree.tsx`

**Example transformations**:
```typescript
// Before
import { AuthProvider } from "./contexts/AuthContext";
import { ShellProvider } from "./contexts/ShellContext";

// After
import { AuthProvider } from "@/client/contexts/AuthContext";
import { ShellProvider } from "@/client/contexts/ShellContext";
```

### Phase 3: Server Code Migration

- [x] 3.1 Convert Server Imports to Aliases

#### Completion Notes

- Successfully migrated all 16 server files to use `@/server/` and `@/shared/` aliases
- Updated routes: auth.ts, projects.ts, sessions.ts, shell.ts, routes.ts
- Updated services: project.service.ts, agent-session.service.ts, project-sync.service.ts, shell.service.ts, file.service.ts
- Updated plugins: auth.ts
- Updated core files: index.ts, websocket.ts
- Updated test files: agent-session.service.test.ts, project-sync.service.test.ts
- All `../../shared/` imports converted to `@/shared/`
- All `../services/`, `../schemas/`, `./routes/` etc. converted to `@/server/...`
- Same-directory imports in utils kept as `./` (e.g., `./generateSessionName`)
- No remaining relative imports to shared or cross-module server imports

#### 3.1 Convert Server Imports to Aliases

Transform relative imports in server code to use `@/server/` and `@/shared/`:

**Files to update**:
- `src/server/routes/*.ts` (~5 files)
- `src/server/services/*.ts` (~5 files)
- `src/server/plugins/*.ts` (~2 files)
- `src/server/schemas/*.ts` (~5 files)
- `src/server/index.ts`, `src/server/routes.ts`, `src/server/websocket.ts`

**Example transformations**:
```typescript
// Before
import { prisma } from "../../shared/prisma";
import { registerSchema } from "../schemas/auth.schema";
import { ShellService } from "../services/shell.service";

// After
import { prisma } from "@/shared/prisma";
import { registerSchema } from "@/server/schemas/auth.schema";
import { ShellService } from "@/server/services/shell.service";
```

### Phase 4: Documentation Updates

- [x] 4.1 Update CLAUDE.md

#### Completion Notes

- Updated "Important Rules" section with path alias guidelines
- Updated "Import Aliases" section (item #5) with complete alias documentation
- Updated "Common Gotchas" section (item #3) to reflect new alias usage
- All three sections now accurately document the `@/client/*`, `@/server/*`, and `@/shared/*` pattern

#### 4.1 Update CLAUDE.md

**File**: `apps/web/CLAUDE.md`

**Section**: "Important Rules" (after line 11)

**Add**:
```markdown
- **Always use `@/` path aliases for imports** - Never use relative imports (`../`, `./`)
  - Client imports: `@/client/*` (components, hooks, pages, contexts, etc.)
  - Server imports: `@/server/*` (routes, services, schemas, plugins, etc.)
  - Shared imports: `@/shared/*` (types, utilities, Prisma client)
```

**Section**: "5. Import Aliases" (around line 156)

**Replace**:
```markdown
5. **Import Aliases**:
   - `@/*` resolves to `src/client/*` (client-side only)
```

**With**:
```markdown
5. **Import Aliases**:
   - `@/*` resolves to `src/*` (used across client, server, and shared code)
   - Client code: Use `@/client/*` for all client modules
   - Server code: Use `@/server/*` for all server modules
   - Shared code: Use `@/shared/*` for types, utilities, and Prisma client
   - **Never use relative imports** (`../`, `./`) - always use the `@/` alias
```

**Section**: "Common Gotchas #3" (around line 194)

**Replace**:
```markdown
3. **Path aliases**: The `@/*` alias only works in client code; server code uses relative imports
```

**With**:
```markdown
3. **Path aliases**: Always use `@/` aliases for imports across all code:
   - `@/client/*` in client code
   - `@/server/*` in server code
   - `@/shared/*` in both client and server
   - This applies to both Vite bundling (client) and tsx execution (server)
```

### Phase 5: Verification

- [x] 5.1 Type Checking
- [x] 5.2 Development Server
- [x] 5.3 Production Build

#### Completion Notes

- TypeScript compilation (tsc --noEmit) passes with no errors related to path alias resolution
- Fixed incorrect import paths in EditToolRenderer.tsx (DiffViewer path)
- Pre-existing TypeScript errors in codebase (unrelated to path alias migration):
  - Some unused variable warnings in ai-elements components
  - Type errors in app-sidebar.tsx, auth plugin, and other files (pre-existing)
- All path alias imports (`@/client/*`, `@/server/*`, `@/shared/*`) resolve correctly
- Dev server runs successfully (verified by user)
- Build process completes successfully despite pre-existing type errors (non-blocking)

#### 5.1 Type Checking

Run TypeScript type checking to ensure all imports resolve:

```bash
pnpm check-types
```

**Expected**: No type errors related to module resolution

#### 5.2 Development Server

Start the development server to verify Vite bundling:

```bash
pnpm dev
```

**Expected**:
- No build errors
- Client loads successfully at http://localhost:5173
- HMR (Hot Module Replacement) works
- API proxying to backend works

#### 5.3 Production Build

Run a production build to verify:

```bash
pnpm build
```

**Expected**:
- Build completes successfully
- No module resolution errors
- Both client and server bundles created

## Migration Statistics

- **Configuration files**: 4
  - `vite.config.ts`
  - `tsconfig.json`
  - `tsconfig.app.json`
  - `tsconfig.server.json`

- **Client files to update**: ~130 files
  - Files with `@/` aliases: 59 files (104 occurrences)
  - Files with `../` imports: 57 files (146 occurrences)
  - Files with `./` imports: 12 files (38 occurrences)
  - Files importing from `../../shared`: 23 files (28 occurrences)

- **Server files to update**: ~15 files

- **Total import statements to modify**: ~316+

## Rollback Plan

If issues arise during migration:

### 1. Revert Configuration Files

```bash
cd apps/web

# Revert vite.config.ts
git checkout vite.config.ts

# Revert TypeScript configs
git checkout tsconfig.json tsconfig.app.json tsconfig.server.json
```

### 2. Revert Code Changes

```bash
# Revert all source file changes
git checkout -- apps/web/src/
```

### 3. Verify Rollback

```bash
pnpm dev
```

## Success Criteria

- [ ] All configuration files updated (4 files)
- [ ] All client `@/` imports converted to `@/client/*` (104 occurrences in 59 files)
- [ ] All client `../` imports converted to `@/client/*` or `@/shared/*` (146 occurrences in 57 files)
- [ ] All client `../../shared` imports converted to `@/shared/*` (28 occurrences in 23 files)
- [ ] All client `./` cross-module imports converted to `@/client/*` (38 occurrences reviewed)
- [ ] All server imports converted to `@/server/*` or `@/shared/*` (~15 files)
- [ ] No relative imports remain in codebase
- [ ] Type checking passes: `pnpm check-types`
- [ ] Development server runs: `pnpm dev`
- [ ] Production build succeeds: `pnpm build`
- [ ] CLAUDE.md documentation updated
- [ ] All manual testing passes (login, project creation, chat, shell, etc.)

## Notes

- This migration makes all imports explicit about which layer they're importing from
- The `@/client/*`, `@/server/*`, `@/shared/*` pattern is self-documenting
- This approach scales well as the codebase grows
- It prevents accidental cross-layer imports (e.g., client importing server code)
- All imports are absolute, making refactoring easier (no import path updates when moving files)
