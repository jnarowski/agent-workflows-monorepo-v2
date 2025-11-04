# Workflow Engine - Missing Components Analysis

**Created**: 2025-11-04
**Status**: Implementation blocked by missing dependencies

## Summary

The workflow engine implementation (65% complete) is **blocked** by missing database infrastructure and domain services. While the core workflow SDK and engine are implemented, the system cannot function without:

1. Database schema (Prisma models)
2. Domain services (git, session management)
3. Database setup (schema.prisma, migrations)

## Example Workflow Created

✅ **Created**: `.agent/workflows/example-workflow.ts`

This is a simple text-output workflow demonstrating:
- Three phases: initialize, process, complete
- Text annotations at each phase
- Artifact creation (text file output)
- Console logging for testing
- All using SDK step methods (annotation, run, artifact)
- **Direct import from source**: Uses `import { defineWorkflow } from "../../packages/workflow-sdk/src/index"` (no package dependency needed)

**Note**: This workflow does NOT use agent/git steps since those services don't exist yet.

## Critical Missing Components

### 1. Database Schema & Models (BLOCKER)

**Status**: ❌ **Not implemented**

**Required Models**:
```prisma
model Project {
  id          String   @id @default(cuid())
  name        String
  path        String   // Filesystem path
  user_id     String
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  workflowDefinitions WorkflowDefinition[]
  workflowExecutions  WorkflowExecution[]
}

model WorkflowDefinition {
  id            String   @id @default(cuid())
  project_id    String
  name          String   // Workflow ID (from config.id)
  display_name  String   // Human-readable name
  description   String?
  type          String   // "code"
  path          String   // Filesystem path to .ts file
  phases        Json     // Array of phase names
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  project       Project  @relation(fields: [project_id], references: [id], onDelete: Cascade)
  executions    WorkflowExecution[]

  @@unique([project_id, name])
}

model WorkflowExecution {
  id                    String   @id @default(cuid())
  project_id            String
  workflow_definition_id String
  user_id               String
  name                  String   // Execution name/title
  args                  Json     // Execution arguments
  status                String   // pending, running, paused, completed, failed
  current_phase         String?  // Current phase name
  started_at            DateTime?
  completed_at          DateTime?
  error_message         String?
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  project     Project            @relation(fields: [project_id], references: [id], onDelete: Cascade)
  definition  WorkflowDefinition @relation(fields: [workflow_definition_id], references: [id], onDelete: Cascade)
  steps       WorkflowExecutionStep[]
  events      WorkflowEvent[]
  artifacts   WorkflowArtifact[]
}

model WorkflowExecutionStep {
  id                      String   @id @default(cuid())
  workflow_execution_id   String
  name                    String   // Step name
  phase                   String?  // Phase name (tagged)
  type                    String   // agent, git, cli, artifact, annotation
  status                  String   // pending, running, completed, failed
  started_at              DateTime?
  completed_at            DateTime?
  error_message           String?
  input_data              Json?    // Step input
  output_data             Json?    // Step output
  created_at              DateTime @default(now())
  updated_at              DateTime @updatedAt

  execution   WorkflowExecution @relation(fields: [workflow_execution_id], references: [id], onDelete: Cascade)
  artifacts   WorkflowArtifact[]
}

model WorkflowEvent {
  id                    String   @id @default(cuid())
  workflow_execution_id String
  event_type            String   // workflow_started, phase_started, step_completed, etc.
  event_data            Json     // Event-specific data
  created_at            DateTime @default(now())

  execution WorkflowExecution @relation(fields: [workflow_execution_id], references: [id], onDelete: Cascade)
}

model WorkflowArtifact {
  id                        String   @id @default(cuid())
  workflow_execution_id     String
  workflow_execution_step_id String?
  name                      String
  file_type                 String   // text, image, file
  file_path                 String?  // Path on filesystem
  content                   String?  // Text content (if applicable)
  size                      Int?     // File size in bytes
  created_at                DateTime @default(now())

  execution WorkflowExecution       @relation(fields: [workflow_execution_id], references: [id], onDelete: Cascade)
  step      WorkflowExecutionStep?  @relation(fields: [workflow_execution_step_id], references: [id], onDelete: Cascade)
}

model User {
  id         String   @id @default(cuid())
  username   String   @unique
  password   String   // Hashed
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
```

**Files Needed**:
- `apps/web/prisma/schema.prisma` - Main schema file
- `apps/web/prisma/migrations/` - Migration files
- `apps/web/src/shared/prisma.ts` - Prisma client singleton

**Why Critical**:
- Scanner uses `prisma.project.findMany()` to discover projects
- Scanner uses `prisma.workflowDefinition.upsert()` to store workflows
- Step helpers use `prisma.workflowExecutionStep.findFirst()` and `.create()`
- All workflow tracking depends on database

### 2. Domain Services (BLOCKER)

**Status**: ❌ **Not implemented**

**Required Services**:

#### `apps/web/src/server/domain/session/services/executeAgent.ts`
```typescript
export async function executeAgent(params: {
  sessionId: string;
  message: string;
  agent: 'claude' | 'codex' | 'gemini';
  projectPath: string;
  onStream?: (chunk: string) => void;
}): Promise<{ success: boolean; messageId: string }> {
  // Execute AI agent CLI tool
  // Stream output via onStream callback
  // Create AgentSession record
  // Return result
}
```

**Used by**: `apps/web/src/server/workflows/engine/steps/agent.ts`

#### `apps/web/src/server/domain/git/services/createCommit.ts`
```typescript
export async function createCommit(params: {
  projectPath: string;
  message: string;
  files?: string[];
}): Promise<{ sha: string; message: string }> {
  // Create git commit using simple-git
  // Return commit SHA and message
}
```

**Used by**: `apps/web/src/server/workflows/engine/steps/git.ts`

#### `apps/web/src/server/domain/git/services/createBranch.ts`
```typescript
export async function createBranch(params: {
  projectPath: string;
  branchName: string;
  checkout?: boolean;
}): Promise<{ branch: string; created: boolean }> {
  // Create git branch using simple-git
  // Optionally checkout the new branch
}
```

**Used by**: `apps/web/src/server/workflows/engine/steps/git.ts`

#### `apps/web/src/server/domain/git/services/createPullRequest.ts`
```typescript
export async function createPullRequest(params: {
  projectPath: string;
  title: string;
  body?: string;
  base?: string;
}): Promise<{ url: string; number: number }> {
  // Create GitHub PR using gh CLI
  // Return PR URL and number
}
```

**Used by**: `apps/web/src/server/workflows/engine/steps/git.ts`

**Why Critical**:
- Workflow steps delegate to domain services
- Agent step cannot execute without executeAgent service
- Git step cannot function without git services
- These are the primary value of workflows

### 3. WebSocket Infrastructure (MAY EXIST)

**Status**: ⚠️ **Needs verification**

**Required Exports**:

#### `apps/web/src/server/websocket/infrastructure/subscriptions.ts`
```typescript
export function broadcast(channel: string, message: { type: string; data: unknown }): void {
  // Broadcast WebSocket message to all subscribers on channel
}
```

**Used by**: Step helper functions for real-time updates

#### `apps/web/src/shared/websocket/channels.ts`
```typescript
export class Channels {
  static project(projectId: string): string {
    return `project:${projectId}`;
  }

  static workflow(executionId: string): string {
    return `workflow:${executionId}`;
  }
}
```

**Used by**: Step helpers, phase step, artifact step

**Action Required**:
1. Check if these files exist
2. If not, create minimal implementations
3. If yes, verify exports match expected signature

### 4. Configuration

**Status**: ⚠️ **Partially exists**

**File**: `apps/web/src/server/config.ts`

**Required Exports**:
```typescript
export const config = {
  workflow: {
    enabled: true,
    inngestEventKey: process.env.INNGEST_EVENT_KEY,
    memoizationDbPath: process.env.INNGEST_MEMOIZATION_DB_PATH || './prisma/workflows.db',
    servePath: process.env.INNGEST_SERVE_PATH || '/api/workflows/inngest',
    devMode: process.env.INNGEST_DEV_MODE !== 'false',
  },
  // ... other config
};
```

**Current Status**: File exists (apps/web/src/server/config.ts:52) but workflow config may be missing

**Action Required**:
1. Read existing config file
2. Add workflow section if missing
3. Update .env.example with workflow variables

## Non-Critical Missing Components

### 5. Unit Tests

**Status**: ❌ **Not implemented**

**Test Files Needed**:
- `phase.test.ts` - Phase retry logic
- `helpers.test.ts` - Dynamic step creation
- `scanner.test.ts` - Workflow scanning
- `registry.test.ts` - Workflow execution
- `workflow-execution.e2e.test.ts` - Full E2E test

**Why Not Critical**: Tests can be written after core functionality works

### 6. Documentation Updates

**Status**: ⚠️ **Partially complete**

**Completed**:
- ✅ SDK README (packages/workflow-sdk/README.md)

**Missing**:
- ❌ Update apps/web/CLAUDE.md with workflow engine section
- ❌ Create apps/web/docs/workflows.md implementation guide

**Why Not Critical**: Docs can be written after core functionality works

## Recommendations

### Option 1: Stub Missing Services (Fast Path)

Create minimal stub implementations to unblock testing:

**1. Create stub domain services** (30 min):
```typescript
// apps/web/src/server/domain/session/services/executeAgent.ts
export async function executeAgent(params: any) {
  console.log('STUB: executeAgent called', params);
  return { success: true, messageId: 'stub-123' };
}

// Similar stubs for git services
```

**2. Create stub WebSocket infrastructure** (15 min):
```typescript
// apps/web/src/server/websocket/infrastructure/subscriptions.ts
export function broadcast(channel: string, message: any) {
  console.log('STUB: broadcast', { channel, message });
}

// apps/web/src/shared/websocket/channels.ts
export class Channels {
  static project(projectId: string) { return `project:${projectId}`; }
  static workflow(executionId: string) { return `workflow:${executionId}`; }
}
```

**3. Create Prisma schema and run migrations** (45 min):
- Copy schema from spec
- Run `prisma migrate dev`
- Generate Prisma client

**4. Create test project in database** (15 min):
- Use Prisma Studio or SQL to insert Project record
- Point to apps/web/test-project path

**Total Time**: ~2 hours

**Result**: Can test workflow loading, scanning, and execution with example workflow

### Option 2: Implement Real Services (Long Path)

Implement all missing components fully:

**Estimated Time**: 8-12 hours

**Components**:
1. Database schema and migrations (1 hour)
2. Git services with simple-git (2 hours)
3. Agent execution service (3 hours)
4. WebSocket infrastructure (1 hour)
5. Configuration updates (30 min)
6. Testing and debugging (3-5 hours)

**Result**: Fully functional workflow engine

### Option 3: Hybrid Approach (Recommended)

Start with stubs, replace incrementally:

**Phase 1** (2 hours):
- Stub all missing services
- Complete database setup
- Test workflow scanning and loading
- Verify example workflow can be triggered (with stubs)

**Phase 2** (4 hours):
- Implement git services (most straightforward)
- Test git step in workflows
- Replace git service stubs

**Phase 3** (6 hours):
- Implement agent execution service
- Integrate with existing CLI adapters
- Test agent step in workflows
- Replace agent service stub

**Total Time**: ~12 hours spread over 3 phases

**Result**: Incremental progress, testable at each phase

## Next Steps

1. **Choose approach** (Option 1, 2, or 3)
2. **Create Prisma schema** (required for all options)
3. **Implement stubs or services** based on chosen approach
4. **Test example workflow** to verify integration
5. **Write unit tests** for implemented components
6. **Update documentation** with workflow patterns

## Updated Implementation Status

Based on this analysis, the implementation is:

- ✅ **SDK Package**: 100% complete
- ✅ **Infrastructure**: 100% complete (all step types implemented)
- ✅ **Discovery & Loading**: 100% complete
- ⚠️ **API Routes**: 100% complete (but unused without database)
- ❌ **Server Integration**: 80% complete (integrated but missing dependencies)
- ❌ **Database Setup**: 0% complete (BLOCKER)
- ❌ **Domain Services**: 0% complete (BLOCKER)
- ⚠️ **WebSocket**: Unknown (needs verification)
- ✅ **Example Workflow**: 100% complete
- ❌ **Tests**: 0% complete
- ⚠️ **Documentation**: 50% complete (SDK done, app docs missing)

**Overall**: ~50% complete (down from 65% due to missing blockers)

**Critical Path**: Database schema → Stubs → Test → Implement services → Full functionality
