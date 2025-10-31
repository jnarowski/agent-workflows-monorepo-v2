# Backend Domain Organization Refactoring

**Status**: draft
**Created**: 2025-01-31
**Package**: apps/web (backend server)
**Estimated Effort**: 60-80 hours (3-4 weeks)

## Overview

Refactor the backend server architecture from large monolithic service files to a functional domain-driven architecture where each file exports a single function. This will dramatically improve code discoverability, maintainability, and testability by ensuring that file names match function names and all related code is grouped by domain.

## User Story

As a backend developer
I want business logic organized by domain with one function per file
So that I can easily find code, understand responsibilities, and maintain the codebase as it scales

## Technical Approach

Transition from class-based services to a **functional domain-driven architecture**:

1. **Create `domain/` directory** with subdirectories for each domain (git, session, project, file, websocket)
2. **One function per file** - File name matches exported function name
3. **Organize by domain** - Each domain has `services/`, `types/`, and `schemas/` subdirectories
4. **Migrate WebSocket services** into domains (Option 2) - WebSocket handlers become thin orchestrators
5. **Update all imports** across routes, handlers, and existing code
6. **Add supporting infrastructure** - Error handling, configuration, testing utilities

## Key Design Decisions

1. **Functional over class-based**: Functions are easier to test, compose, and tree-shake than classes
2. **One function per file**: Enforces small, focused modules and makes code easy to find
3. **Domain-driven organization**: Group by business domain (session, git, project) not technical layer (services, utils)
4. **WebSocket as thin transport layer**: Handlers orchestrate, domains contain business logic
5. **Collocated types and schemas**: Each domain owns its types and validation schemas

## Architecture

### File Structure

```
apps/web/src/server/
├── domain/                                 # NEW: Business logic by domain
│   ├── git/
│   │   ├── services/
│   │   │   ├── getCurrentBranch.ts        # export async function getCurrentBranch(...)
│   │   │   ├── createBranch.ts
│   │   │   ├── deleteBranch.ts
│   │   │   ├── checkoutBranch.ts
│   │   │   ├── mergeBranch.ts
│   │   │   ├── getStatus.ts
│   │   │   ├── getBranches.ts
│   │   │   ├── getRemoteBranches.ts
│   │   │   ├── commitChanges.ts
│   │   │   ├── getCommitHistory.ts
│   │   │   ├── getDiff.ts
│   │   │   ├── getFileHistory.ts
│   │   │   ├── push.ts
│   │   │   ├── pull.ts
│   │   │   ├── fetch.ts
│   │   │   ├── getRemotes.ts
│   │   │   ├── stashChanges.ts
│   │   │   ├── applyStash.ts
│   │   │   ├── listStashes.ts
│   │   │   ├── popStash.ts
│   │   │   ├── dropStash.ts
│   │   │   ├── cherryPick.ts
│   │   │   ├── revertCommit.ts
│   │   │   ├── createPullRequest.ts
│   │   │   ├── checkGhInstalled.ts
│   │   │   ├── generateCommitMessage.ts
│   │   │   └── index.ts                   # Re-export all functions
│   │   ├── types/
│   │   │   └── index.ts                   # Git domain types
│   │   └── schemas/
│   │       └── index.ts                   # Zod schemas for git operations
│   │
│   ├── session/
│   │   ├── services/
│   │   │   ├── getSessionById.ts
│   │   │   ├── getSessionsByProject.ts
│   │   │   ├── createSession.ts
│   │   │   ├── updateSession.ts
│   │   │   ├── updateSessionName.ts
│   │   │   ├── deleteSession.ts
│   │   │   ├── syncProjectSessions.ts     # From agentSession.ts
│   │   │   ├── findOrphanedSessions.ts
│   │   │   ├── cleanupOrphans.ts
│   │   │   ├── parseSessionJsonl.ts       # JSONL parsing
│   │   │   ├── extractMessages.ts
│   │   │   ├── enrichWithToolResults.ts
│   │   │   ├── updateMetadata.ts
│   │   │   ├── calculateUsage.ts
│   │   │   ├── extractFirstMessage.ts
│   │   │   ├── processSessionMessage.ts   # From session.handler.ts
│   │   │   ├── processImageUploads.ts     # From session.handler.ts
│   │   │   ├── executeAgent.ts            # From websocket/services/agent-executor.ts
│   │   │   ├── validateSessionOwnership.ts # From websocket/services/session-validator.ts
│   │   │   ├── extractUsageFromEvents.ts  # From websocket/services/usage-extractor.ts
│   │   │   ├── generateSessionName.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── index.ts                   # Session types
│   │   └── schemas/
│   │       └── index.ts                   # Session schemas
│   │
│   ├── project/
│   │   ├── services/
│   │   │   ├── getAllProjects.ts
│   │   │   ├── getProjectById.ts
│   │   │   ├── getProjectByPath.ts
│   │   │   ├── createProject.ts
│   │   │   ├── updateProject.ts
│   │   │   ├── deleteProject.ts
│   │   │   ├── toggleHidden.ts
│   │   │   ├── toggleStarred.ts
│   │   │   ├── syncClaudeProjects.ts
│   │   │   ├── getClaudeProjects.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── schemas/
│   │       └── index.ts
│   │
│   ├── file/
│   │   ├── services/
│   │   │   ├── getFileTree.ts
│   │   │   ├── readFile.ts
│   │   │   ├── writeFile.ts
│   │   │   ├── validatePath.ts
│   │   │   ├── shouldExclude.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── schemas/
│   │       └── index.ts
│   │
│   └── shell/
│       ├── services/
│       │   ├── createShellSession.ts
│       │   ├── writeToShell.ts
│       │   ├── resizeShell.ts
│       │   ├── cleanupShellSession.ts
│       │   └── index.ts
│       ├── types/
│       │   └── index.ts
│       └── schemas/
│           └── index.ts
│
├── websocket/
│   ├── handlers/                           # MODIFIED: Thin orchestrators
│   │   ├── session.handler.ts             # Reduced from 722 → ~150 lines
│   │   ├── shell.handler.ts
│   │   └── global.handler.ts
│   ├── infrastructure/                     # RENAMED from utils/
│   │   ├── active-sessions.ts
│   │   ├── subscriptions.ts
│   │   ├── channels.ts
│   │   ├── metrics.ts
│   │   ├── reconnection.ts
│   │   ├── send-message.ts
│   │   └── cleanup.ts
│   └── types.ts
│
├── routes/                                 # MODIFIED: Update imports
│   ├── auth.ts
│   ├── projects.ts
│   ├── sessions.ts
│   ├── git.ts
│   ├── shell.ts
│   ├── slash-commands.ts
│   └── settings.ts
│
├── config/                                 # NEW: Configuration management
│   ├── Configuration.ts
│   ├── schemas.ts
│   └── types.ts
│
├── errors/                                 # ENHANCED: Add missing error types
│   ├── AppError.ts
│   ├── ConflictError.ts
│   ├── BadRequestError.ts
│   ├── InternalServerError.ts
│   └── ServiceUnavailableError.ts
│
├── strategies/                             # NEW: Strategy patterns
│   └── agents/
│       ├── AgentStrategy.ts
│       ├── ClaudeAgentStrategy.ts
│       ├── CodexAgentStrategy.ts
│       └── AgentStrategyRegistry.ts
│
├── schemas/                                # KEEP: Route-level schemas
│   └── ...
│
└── services/                               # DELETE: Migrate to domain/
    └── (all files will be deleted)
```

### Integration Points

**Routes**:
- `routes/projects.ts` - Update imports to use `domain/project/services/*`
- `routes/sessions.ts` - Update imports to use `domain/session/services/*`
- `routes/git.ts` - Update imports to use `domain/git/services/*`
- All other route files - Update imports accordingly

**WebSocket Handlers**:
- `websocket/handlers/session.handler.ts` - Becomes thin orchestrator, calls domain functions
- `websocket/handlers/shell.handler.ts` - Update imports to use `domain/shell/services/*`

**Existing Services**:
- Delete `services/` directory entirely after migration complete

## Implementation Details

### 1. Domain Structure Pattern

Each domain follows this consistent pattern:

```typescript
// domain/{domain}/services/{functionName}.ts
import { prisma } from '@/shared/prisma';
import type { FunctionParams, FunctionResult } from '../types';

export async function functionName(
  params: FunctionParams
): Promise<FunctionResult> {
  // Implementation
}

// domain/{domain}/services/index.ts
export * from './functionName.js';
export * from './anotherFunction.js';

// domain/{domain}/types/index.ts
export interface FunctionParams { ... }
export interface FunctionResult { ... }

// domain/{domain}/schemas/index.ts
import { z } from 'zod';
export const FunctionParamsSchema = z.object({ ... });
```

**Key Points**:
- Each service file exports exactly one function
- Function name matches file name (e.g., `createBranch.ts` exports `createBranch`)
- All types for a domain in one `types/index.ts` file
- All Zod schemas in one `schemas/index.ts` file
- Each domain has an `index.ts` to re-export all functions

### 2. WebSocket Handler Migration

Transform handlers from containing business logic to orchestrating domain functions:

**Before** (722 lines with embedded logic):
```typescript
export async function handleSessionSendMessage(socket, data, userId) {
  // 183 lines of inline logic for validation, image processing, execution, etc.
}
```

**After** (thin orchestrator):
```typescript
import { validateSessionOwnership } from '@/server/domain/session/services/validateSessionOwnership';
import { processSessionMessage } from '@/server/domain/session/services/processSessionMessage';

export async function handleSessionSendMessage(socket, data, userId) {
  const { sessionId, message, images, config } = data;

  // Validate ownership (domain logic)
  await validateSessionOwnership(sessionId, userId);

  // Process message (domain logic)
  const result = await processSessionMessage({
    sessionId,
    message,
    images,
    config,
    userId,
    projectPath: activeSessions.get(sessionId).projectPath,
  });

  // Broadcast result (transport logic)
  broadcast(Channels.session(sessionId), {
    type: SessionEventTypes.STREAM_COMPLETE,
    data: result,
  });
}
```

### 3. Error Handling Standardization

Add missing error classes and standardize error responses:

```typescript
// errors/AppError.ts
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  constructor(message: string, public readonly context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
  }
}

// errors/ConflictError.ts
export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = 'CONFLICT';
}
```

### 4. Configuration Service

Centralize all environment variable access:

```typescript
// config/Configuration.ts
import { z } from 'zod';
import { ConfigSchema } from './schemas';

class Configuration {
  private static instance: Configuration;
  private config: z.infer<typeof ConfigSchema>;

  private constructor() {
    this.config = ConfigSchema.parse({
      server: {
        port: process.env.PORT,
        host: process.env.HOST,
      },
      // ... all config
    });
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new Configuration();
    }
    return this.instance;
  }

  get<K extends keyof typeof this.config>(key: K) {
    return this.config[key];
  }
}

export const config = Configuration.getInstance();
```

### 5. Agent Strategy Pattern

Replace hardcoded agent checks with strategy pattern:

```typescript
// strategies/agents/AgentStrategy.ts
export interface AgentStrategy {
  readonly name: string;
  execute(params: ExecuteParams): Promise<ExecuteResult>;
  isSupported(agent: string): boolean;
}

// strategies/agents/ClaudeAgentStrategy.ts
export class ClaudeAgentStrategy implements AgentStrategy {
  readonly name = 'claude';

  async execute(params: ExecuteParams): Promise<ExecuteResult> {
    // Claude-specific execution logic
  }

  isSupported(agent: string): boolean {
    return agent === 'claude';
  }
}

// strategies/agents/AgentStrategyRegistry.ts
export class AgentStrategyRegistry {
  private static strategies = new Map<string, AgentStrategy>();

  static register(strategy: AgentStrategy) {
    this.strategies.set(strategy.name, strategy);
  }

  static get(agent: string): AgentStrategy {
    const strategy = this.strategies.get(agent);
    if (!strategy) {
      throw new Error(`Unsupported agent: ${agent}`);
    }
    return strategy;
  }
}
```

## Files to Create/Modify

### New Files (90+)

**Domain Structure:**
1. `apps/web/src/server/domain/git/services/*.ts` - 27 git operation files
2. `apps/web/src/server/domain/git/types/index.ts` - Git types
3. `apps/web/src/server/domain/git/schemas/index.ts` - Git schemas
4. `apps/web/src/server/domain/session/services/*.ts` - 20 session operation files
5. `apps/web/src/server/domain/session/types/index.ts` - Session types
6. `apps/web/src/server/domain/session/schemas/index.ts` - Session schemas
7. `apps/web/src/server/domain/project/services/*.ts` - 10 project operation files
8. `apps/web/src/server/domain/project/types/index.ts` - Project types
9. `apps/web/src/server/domain/project/schemas/index.ts` - Project schemas
10. `apps/web/src/server/domain/file/services/*.ts` - 5 file operation files
11. `apps/web/src/server/domain/file/types/index.ts` - File types
12. `apps/web/src/server/domain/file/schemas/index.ts` - File schemas
13. `apps/web/src/server/domain/shell/services/*.ts` - 4 shell operation files
14. `apps/web/src/server/domain/shell/types/index.ts` - Shell types
15. `apps/web/src/server/domain/shell/schemas/index.ts` - Shell schemas

**Configuration:**
16. `apps/web/src/server/config/Configuration.ts` - Config service
17. `apps/web/src/server/config/schemas.ts` - Config Zod schemas
18. `apps/web/src/server/config/types.ts` - Config types

**Error Handling:**
19. `apps/web/src/server/errors/AppError.ts` - Base error class
20. `apps/web/src/server/errors/ConflictError.ts` - 409 errors
21. `apps/web/src/server/errors/BadRequestError.ts` - 400 errors
22. `apps/web/src/server/errors/InternalServerError.ts` - 500 errors
23. `apps/web/src/server/errors/ServiceUnavailableError.ts` - 503 errors

**Strategies:**
24. `apps/web/src/server/strategies/agents/AgentStrategy.ts` - Interface
25. `apps/web/src/server/strategies/agents/ClaudeAgentStrategy.ts` - Claude impl
26. `apps/web/src/server/strategies/agents/CodexAgentStrategy.ts` - Codex impl
27. `apps/web/src/server/strategies/agents/AgentStrategyRegistry.ts` - Registry

**Testing Infrastructure:**
28. `apps/web/tests/integration/setup.ts` - Test setup
29. `apps/web/tests/integration/helpers/TestServer.ts` - Server harness
30. `apps/web/tests/integration/helpers/TestDatabase.ts` - DB utilities
31. `apps/web/tests/factories/ProjectFactory.ts` - Project factory
32. `apps/web/tests/factories/SessionFactory.ts` - Session factory
33. `apps/web/tests/factories/UserFactory.ts` - User factory

### Modified Files (20+)

**Routes (update imports):**
1. `apps/web/src/server/routes/projects.ts` - Import from domain/project
2. `apps/web/src/server/routes/sessions.ts` - Import from domain/session
3. `apps/web/src/server/routes/git.ts` - Import from domain/git
4. `apps/web/src/server/routes/shell.ts` - Import from domain/shell
5. `apps/web/src/server/routes/settings.ts` - Import config service

**WebSocket (thin orchestrators):**
6. `apps/web/src/server/websocket/handlers/session.handler.ts` - Reduce to ~150 lines
7. `apps/web/src/server/websocket/handlers/shell.handler.ts` - Import from domain/shell
8. `apps/web/src/server/websocket/handlers/global.handler.ts` - Update imports

**Infrastructure:**
9. `apps/web/src/server/websocket/index.ts` - Update imports
10. Rename `apps/web/src/server/websocket/utils/` → `infrastructure/`

**Error Handling:**
11. `apps/web/src/server/utils/error.ts` - Add new error types
12. `apps/web/src/server/index.ts` - Update error handler for new types

**Cleanup:**
13. Delete `apps/web/src/server/services/` directory (after migration)
14. Replace all `console.log` with `fastify.log.*`
15. Fix all `catch (error: any)` → `catch (error: unknown)`

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Setup Domain Structure

<!-- prettier-ignore -->
- [ ] domain-1.1: Create domain directory structure
  - Create `apps/web/src/server/domain/` directory
  - Create subdirectories: `git/`, `session/`, `project/`, `file/`, `shell/`
  - For each domain, create: `services/`, `types/`, `schemas/`
- [ ] domain-1.2: Create index.ts files for each domain
  - File: `apps/web/src/server/domain/git/services/index.ts`
  - File: `apps/web/src/server/domain/git/types/index.ts`
  - File: `apps/web/src/server/domain/git/schemas/index.ts`
  - Repeat for session, project, file, shell domains

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 2: Migrate Git Domain (Week 1)

<!-- prettier-ignore -->
- [ ] git-2.1: Extract getCurrentBranch from git.service.ts
  - Create `domain/git/services/getCurrentBranch.ts`
  - Export `async function getCurrentBranch(projectPath: string)`
  - Add to `domain/git/services/index.ts`
- [ ] git-2.2: Extract createBranch
  - Create `domain/git/services/createBranch.ts`
  - Add to index.ts
- [ ] git-2.3: Extract deleteBranch
  - Create `domain/git/services/deleteBranch.ts`
- [ ] git-2.4: Extract checkoutBranch
  - Create `domain/git/services/checkoutBranch.ts`
- [ ] git-2.5: Extract mergeBranch
  - Create `domain/git/services/mergeBranch.ts`
- [ ] git-2.6: Extract getStatus
  - Create `domain/git/services/getStatus.ts`
- [ ] git-2.7: Extract getBranches
  - Create `domain/git/services/getBranches.ts`
- [ ] git-2.8: Extract getRemoteBranches
  - Create `domain/git/services/getRemoteBranches.ts`
- [ ] git-2.9: Extract commitChanges
  - Create `domain/git/services/commitChanges.ts`
- [ ] git-2.10: Extract getCommitHistory
  - Create `domain/git/services/getCommitHistory.ts`
- [ ] git-2.11: Extract getDiff
  - Create `domain/git/services/getDiff.ts`
- [ ] git-2.12: Extract getFileHistory
  - Create `domain/git/services/getFileHistory.ts`
- [ ] git-2.13: Extract push
  - Create `domain/git/services/push.ts`
- [ ] git-2.14: Extract pull
  - Create `domain/git/services/pull.ts`
- [ ] git-2.15: Extract fetch
  - Create `domain/git/services/fetch.ts`
- [ ] git-2.16: Extract getRemotes
  - Create `domain/git/services/getRemotes.ts`
- [ ] git-2.17: Extract stashChanges
  - Create `domain/git/services/stashChanges.ts`
- [ ] git-2.18: Extract applyStash
  - Create `domain/git/services/applyStash.ts`
- [ ] git-2.19: Extract listStashes
  - Create `domain/git/services/listStashes.ts`
- [ ] git-2.20: Extract popStash
  - Create `domain/git/services/popStash.ts`
- [ ] git-2.21: Extract dropStash
  - Create `domain/git/services/dropStash.ts`
- [ ] git-2.22: Extract cherryPick
  - Create `domain/git/services/cherryPick.ts`
- [ ] git-2.23: Extract revertCommit
  - Create `domain/git/services/revertCommit.ts`
- [ ] git-2.24: Extract createPullRequest
  - Create `domain/git/services/createPullRequest.ts`
- [ ] git-2.25: Extract checkGhInstalled
  - Create `domain/git/services/checkGhInstalled.ts`
- [ ] git-2.26: Extract generateCommitMessage
  - Create `domain/git/services/generateCommitMessage.ts`
- [ ] git-2.27: Create git domain types
  - File: `domain/git/types/index.ts`
  - Move all Git-related types from services
- [ ] git-2.28: Create git domain schemas
  - File: `domain/git/schemas/index.ts`
  - Move relevant Zod schemas
- [ ] git-2.29: Update routes/git.ts imports
  - Replace `import { ... } from '@/server/services/git.service'`
  - With `import { ... } from '@/server/domain/git/services'`
- [ ] git-2.30: Verify git routes still work
  - Test all git endpoints manually or with integration tests
- [ ] git-2.31: Delete services/git.service.ts
  - Only after all imports updated and tested

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 3: Migrate Session Domain (Week 2)

<!-- prettier-ignore -->
- [ ] session-3.1: Extract getSessionById from agentSession.ts
  - Create `domain/session/services/getSessionById.ts`
  - Export `async function getSessionById(id: string)`
- [ ] session-3.2: Extract getSessionsByProject
  - Create `domain/session/services/getSessionsByProject.ts`
- [ ] session-3.3: Extract createSession
  - Create `domain/session/services/createSession.ts`
- [ ] session-3.4: Extract updateSession
  - Create `domain/session/services/updateSession.ts`
- [ ] session-3.5: Extract updateSessionName
  - Create `domain/session/services/updateSessionName.ts`
- [ ] session-3.6: Extract deleteSession
  - Create `domain/session/services/deleteSession.ts`
- [ ] session-3.7: Extract syncProjectSessions
  - Create `domain/session/services/syncProjectSessions.ts`
  - This is the large sync function from agentSession.ts
- [ ] session-3.8: Extract findOrphanedSessions
  - Create `domain/session/services/findOrphanedSessions.ts`
- [ ] session-3.9: Extract cleanupOrphans
  - Create `domain/session/services/cleanupOrphans.ts`
- [ ] session-3.10: Extract parseSessionJsonl
  - Create `domain/session/services/parseSessionJsonl.ts`
  - From agentSession.ts JSONL parsing logic
- [ ] session-3.11: Extract extractMessages
  - Create `domain/session/services/extractMessages.ts`
- [ ] session-3.12: Extract enrichWithToolResults
  - Create `domain/session/services/enrichWithToolResults.ts`
- [ ] session-3.13: Extract updateMetadata
  - Create `domain/session/services/updateMetadata.ts`
- [ ] session-3.14: Extract calculateUsage
  - Create `domain/session/services/calculateUsage.ts`
- [ ] session-3.15: Extract extractFirstMessage
  - Create `domain/session/services/extractFirstMessage.ts`
- [ ] session-3.16: Extract processSessionMessage from session.handler.ts
  - Create `domain/session/services/processSessionMessage.ts`
  - Extract main message processing logic (currently ~183 lines)
- [ ] session-3.17: Extract processImageUploads
  - Create `domain/session/services/processImageUploads.ts`
  - Image handling logic from session.handler.ts
- [ ] session-3.18: Migrate executeAgent from websocket/services/
  - Move to `domain/session/services/executeAgent.ts`
  - Update imports in websocket code
- [ ] session-3.19: Migrate validateSessionOwnership
  - Move to `domain/session/services/validateSessionOwnership.ts`
- [ ] session-3.20: Migrate extractUsageFromEvents
  - Move to `domain/session/services/extractUsageFromEvents.ts`
- [ ] session-3.21: Extract generateSessionName
  - Create `domain/session/services/generateSessionName.ts`
- [ ] session-3.22: Create session domain types
  - File: `domain/session/types/index.ts`
- [ ] session-3.23: Create session domain schemas
  - File: `domain/session/schemas/index.ts`
- [ ] session-3.24: Update routes/sessions.ts imports
  - Import from domain/session/services
- [ ] session-3.25: Refactor websocket/handlers/session.handler.ts
  - Make it a thin orchestrator (~150 lines)
  - Call domain functions for all business logic
- [ ] session-3.26: Delete websocket/services/ directory
  - After all functions migrated to domain
- [ ] session-3.27: Delete services/agentSession.ts
  - After all imports updated

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 4: Migrate Project Domain (Week 2.5)

<!-- prettier-ignore -->
- [ ] project-4.1: Extract getAllProjects from project.ts
  - Create `domain/project/services/getAllProjects.ts`
- [ ] project-4.2: Extract getProjectById
  - Create `domain/project/services/getProjectById.ts`
- [ ] project-4.3: Extract getProjectByPath
  - Create `domain/project/services/getProjectByPath.ts`
- [ ] project-4.4: Extract createProject
  - Create `domain/project/services/createProject.ts`
- [ ] project-4.5: Extract updateProject
  - Create `domain/project/services/updateProject.ts`
- [ ] project-4.6: Extract deleteProject
  - Create `domain/project/services/deleteProject.ts`
- [ ] project-4.7: Extract toggleHidden
  - Create `domain/project/services/toggleHidden.ts`
- [ ] project-4.8: Extract toggleStarred
  - Create `domain/project/services/toggleStarred.ts`
- [ ] project-4.9: Extract syncClaudeProjects
  - Create `domain/project/services/syncClaudeProjects.ts`
- [ ] project-4.10: Extract getClaudeProjects
  - Create `domain/project/services/getClaudeProjects.ts`
- [ ] project-4.11: Create project domain types
  - File: `domain/project/types/index.ts`
- [ ] project-4.12: Create project domain schemas
  - File: `domain/project/schemas/index.ts`
- [ ] project-4.13: Update routes/projects.ts imports
  - Import from domain/project/services
- [ ] project-4.14: Delete services/project.ts

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 5: Migrate File and Shell Domains (Week 2.5)

<!-- prettier-ignore -->
- [ ] file-5.1: Extract getFileTree from file.ts
  - Create `domain/file/services/getFileTree.ts`
- [ ] file-5.2: Extract readFile
  - Create `domain/file/services/readFile.ts`
- [ ] file-5.3: Extract writeFile
  - Create `domain/file/services/writeFile.ts`
- [ ] file-5.4: Extract validatePath
  - Create `domain/file/services/validatePath.ts`
- [ ] file-5.5: Extract shouldExclude
  - Create `domain/file/services/shouldExclude.ts`
- [ ] file-5.6: Create file domain types and schemas
  - Files: `domain/file/types/index.ts`, `domain/file/schemas/index.ts`
- [ ] file-5.7: Update routes imports for file operations
- [ ] file-5.8: Delete services/file.ts
- [ ] shell-5.9: Extract createShellSession from shell.ts
  - Create `domain/shell/services/createShellSession.ts`
- [ ] shell-5.10: Extract writeToShell
  - Create `domain/shell/services/writeToShell.ts`
- [ ] shell-5.11: Extract resizeShell
  - Create `domain/shell/services/resizeShell.ts`
- [ ] shell-5.12: Extract cleanupShellSession
  - Create `domain/shell/services/cleanupShellSession.ts`
- [ ] shell-5.13: Create shell domain types and schemas
  - Files: `domain/shell/types/index.ts`, `domain/shell/schemas/index.ts`
- [ ] shell-5.14: Update websocket/handlers/shell.handler.ts imports
- [ ] shell-5.15: Delete services/shell.ts

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 6: Add Configuration Service (Week 3)

<!-- prettier-ignore -->
- [ ] config-6.1: Create Configuration class
  - File: `config/Configuration.ts`
  - Singleton pattern with Zod validation
- [ ] config-6.2: Create config schemas
  - File: `config/schemas.ts`
  - Define ConfigSchema with all env vars
- [ ] config-6.3: Create config types
  - File: `config/types.ts`
  - Export inferred types from schemas
- [ ] config-6.4: Replace process.env in routes
  - Update all route files to use `config.get()`
- [ ] config-6.5: Replace process.env in services
  - Update domain services to receive config as params
- [ ] config-6.6: Replace process.env in websocket code
  - Update handlers and infrastructure
- [ ] config-6.7: Update index.ts to validate config on startup
  - Fail fast if required config missing

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 7: Add Error Handling (Week 3)

<!-- prettier-ignore -->
- [ ] error-7.1: Create AppError base class
  - File: `errors/AppError.ts`
  - Abstract class with statusCode and code
- [ ] error-7.2: Create ConflictError
  - File: `errors/ConflictError.ts`
  - 409 status code
- [ ] error-7.3: Create BadRequestError
  - File: `errors/BadRequestError.ts`
  - 400 status code
- [ ] error-7.4: Create InternalServerError
  - File: `errors/InternalServerError.ts`
  - 500 status code
- [ ] error-7.5: Create ServiceUnavailableError
  - File: `errors/ServiceUnavailableError.ts`
  - 503 status code
- [ ] error-7.6: Update global error handler in index.ts
  - Handle new error types
- [ ] error-7.7: Standardize service error returns
  - All services return null for not found
  - Throw specific errors for failures
- [ ] error-7.8: Update routes to use new errors
  - Replace manual error responses with throw statements
- [ ] error-7.9: Replace silent catch blocks
  - Add proper error logging everywhere

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 8: Add Agent Strategy Pattern (Week 3)

<!-- prettier-ignore -->
- [ ] strategy-8.1: Create AgentStrategy interface
  - File: `strategies/agents/AgentStrategy.ts`
  - Define execute(), isSupported() methods
- [ ] strategy-8.2: Create ClaudeAgentStrategy
  - File: `strategies/agents/ClaudeAgentStrategy.ts`
  - Implement interface for Claude
- [ ] strategy-8.3: Create CodexAgentStrategy
  - File: `strategies/agents/CodexAgentStrategy.ts`
  - Implement interface for Codex
- [ ] strategy-8.4: Create AgentStrategyRegistry
  - File: `strategies/agents/AgentStrategyRegistry.ts`
  - Map of agent name → strategy
- [ ] strategy-8.5: Update executeAgent to use strategy
  - In `domain/session/services/executeAgent.ts`
  - Get strategy from registry, call execute()
- [ ] strategy-8.6: Remove hardcoded if/else agent checks
  - Search for `if (agent === 'claude')` patterns

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 9: Rename WebSocket utils to infrastructure (Week 3)

<!-- prettier-ignore -->
- [ ] websocket-9.1: Rename directory
  - `websocket/utils/` → `websocket/infrastructure/`
- [ ] websocket-9.2: Update all imports
  - Find and replace `from './utils/'` → `from './infrastructure/'`
  - In websocket/index.ts and handlers
- [ ] websocket-9.3: Verify WebSocket still works
  - Test connection, subscription, messaging

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 10: Code Cleanup (Week 4)

<!-- prettier-ignore -->
- [ ] cleanup-10.1: Replace all console.log with fastify.log
  - Search: `console.log`, `console.error`, `console.warn`, `console.debug`
  - Replace with appropriate fastify.log methods
  - Files: All domain services, handlers, routes
- [ ] cleanup-10.2: Fix TypeScript any types
  - Search: `catch (error: any)`
  - Replace: `catch (error: unknown)` with type guards
- [ ] cleanup-10.3: Remove commented debug code
  - File: `routes/settings.ts` lines 43-93
- [ ] cleanup-10.4: Verify no old service imports remain
  - Search: `from '@/server/services/'`
  - Should only be `from '@/server/domain/'`
- [ ] cleanup-10.5: Delete empty services/ directory
  - Confirm all files migrated first

#### Completion Notes

(This will be filled in by the agent implementing this task group)

### Task Group 11: Testing Infrastructure (Week 4)

<!-- prettier-ignore -->
- [ ] test-11.1: Create integration test setup
  - File: `tests/integration/setup.ts`
  - Configure test database, beforeAll/afterAll hooks
- [ ] test-11.2: Create TestServer helper
  - File: `tests/integration/helpers/TestServer.ts`
  - Start/stop server for tests
- [ ] test-11.3: Create TestDatabase helper
  - File: `tests/integration/helpers/TestDatabase.ts`
  - Seed/clear database functions
- [ ] test-11.4: Create ProjectFactory
  - File: `tests/factories/ProjectFactory.ts`
  - Easy project creation for tests
- [ ] test-11.5: Create SessionFactory
  - File: `tests/factories/SessionFactory.ts`
  - Easy session creation for tests
- [ ] test-11.6: Create UserFactory
  - File: `tests/factories/UserFactory.ts`
  - Easy user creation for tests
- [ ] test-11.7: Write integration test for projects
  - File: `tests/integration/api/projects.test.ts`
  - Test GET, POST, PUT, DELETE endpoints
- [ ] test-11.8: Write integration test for sessions
  - File: `tests/integration/api/sessions.test.ts`
- [ ] test-11.9: Write integration test for git operations
  - File: `tests/integration/api/git.test.ts`

#### Completion Notes

(This will be filled in by the agent implementing this task group)

## Testing Strategy

### Unit Tests

**Domain Function Tests** (new pattern):

Each domain function should have a corresponding test file:

```typescript
// domain/git/services/getCurrentBranch.test.ts
import { getCurrentBranch } from './getCurrentBranch';

describe('getCurrentBranch', () => {
  it('should return current branch name', async () => {
    const branch = await getCurrentBranch('/test/project');
    expect(branch).toBe('main');
  });

  it('should return null if not a git repo', async () => {
    const branch = await getCurrentBranch('/not/a/repo');
    expect(branch).toBeNull();
  });
});
```

### Integration Tests

Test actual API endpoints with real database:

```typescript
// tests/integration/api/projects.test.ts
import { TestServer } from '../helpers/TestServer';
import { ProjectFactory } from '../../factories/ProjectFactory';

describe('Projects API', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await TestServer.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should get all projects', async () => {
    await ProjectFactory.create({ name: 'Test Project' });

    const response = await server.get('/api/projects');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });
});
```

### WebSocket Integration Tests

Test WebSocket message flows:

```typescript
// tests/integration/websocket/session.test.ts
import { WebSocketTestClient } from '../helpers/WebSocketTestClient';

describe('Session WebSocket', () => {
  let client: WebSocketTestClient;

  beforeEach(async () => {
    client = new WebSocketTestClient();
    await client.connect(authToken);
  });

  it('should handle session message', async () => {
    await client.subscribe('session:123');
    await client.send('send_message', { message: 'Hello' });

    const response = await client.waitFor('stream_output');
    expect(response.data).toBeDefined();
  });
});
```

## Success Criteria

- [ ] All git operations moved to domain/git/services/ (27 functions)
- [ ] All session operations moved to domain/session/services/ (20+ functions)
- [ ] All project operations moved to domain/project/services/ (10 functions)
- [ ] All file operations moved to domain/file/services/ (5 functions)
- [ ] All shell operations moved to domain/shell/services/ (4 functions)
- [ ] WebSocket handlers are thin orchestrators (<200 lines each)
- [ ] Old services/ directory deleted
- [ ] All console.log replaced with fastify.log
- [ ] All TypeScript `any` types fixed
- [ ] Configuration service implemented and used
- [ ] Agent strategy pattern implemented
- [ ] Error handling standardized
- [ ] Integration test infrastructure in place
- [ ] All existing functionality still works
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] All tests pass

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
cd apps/web
pnpm build
# Expected: Successful build with no errors

# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Unit tests (if any written)
pnpm test
# Expected: All tests pass

# Start server and verify
pnpm dev:server
# Expected: Server starts without errors, logs show structured output
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Open browser: `http://localhost:5173`
3. Test project operations:
   - Create project
   - View projects list
   - Open project
4. Test git operations:
   - Check git status
   - View branches
   - Commit changes
5. Test session operations:
   - Start session
   - Send message
   - View session history
6. Test WebSocket:
   - Open browser console
   - Verify WebSocket connection
   - Send message, verify streaming works
7. Check server logs: `tail -f apps/web/logs/app.log`
   - Verify structured JSON logging (no console.log output)
   - Verify proper log levels

**Feature-Specific Checks:**

- File structure matches architecture diagram
- Each domain service file exports exactly one function
- Function name matches file name
- No services/ directory remains
- WebSocket handlers are thin (<200 lines)
- All imports use domain/ paths
- Configuration service used everywhere
- Error classes used consistently

## Implementation Notes

### 1. Migration Order is Critical

Follow this sequence to avoid breaking changes:
1. Create new domain structure
2. Migrate functions one at a time
3. Update imports immediately after each function
4. Test before moving to next function
5. Delete old files only after all imports updated

### 2. WebSocket Handler Refactoring

The session.handler.ts refactor is the most complex:
- Extract logic to domain functions first
- Then refactor handler to call those functions
- Test WebSocket functionality thoroughly after each extraction

### 3. Type Safety During Migration

Use `@ts-expect-error` temporarily if needed during migration:
```typescript
// @ts-expect-error - Will be fixed after domain migration
import { oldFunction } from '../services/old-service';
```

Remove all `@ts-expect-error` comments before completion.

### 4. Parallel Work Possible

These can be done in parallel after domain structure exists:
- Git domain migration
- Project domain migration
- File domain migration
- Configuration service
- Error handling updates

Session domain must be done sequentially due to WebSocket dependencies.

## Dependencies

- No new dependencies required
- Uses existing: Prisma, Zod, Fastify, simple-git
- Test infrastructure uses: vitest, @testing-library

## Timeline

| Task                      | Estimated Time |
| ------------------------- | -------------- |
| Git domain migration      | 16 hours       |
| Session domain migration  | 20 hours       |
| Project domain migration  | 8 hours        |
| File/Shell migration      | 6 hours        |
| Configuration service     | 4 hours        |
| Error handling            | 6 hours        |
| Agent strategy pattern    | 4 hours        |
| WebSocket refactoring     | 8 hours        |
| Testing infrastructure    | 8 hours        |
| Code cleanup              | 4 hours        |
| **Total**                 | **84 hours**   |

## References

- Current backend review analysis (this conversation)
- CLAUDE.md - Project conventions
- apps/web/CLAUDE.md - Web app specific docs
- Prisma schema: apps/web/prisma/schema.prisma

## Next Steps

1. Start with Task Group 1: Create domain directory structure
2. Begin Git domain migration (largest, most independent)
3. Run `/implement-spec 25` to begin implementation
4. Review after each task group completion
5. Test thoroughly before moving to next group
