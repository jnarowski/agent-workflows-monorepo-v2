# Workflow Engine Implementation Status

## ✅ Completed (65%)

### Task Group 1: SDK Package (100%)
- [x] SDK package structure created
- [x] TypeScript types defined (steps, workflow, phases)
- [x] defineWorkflow() builder implemented
- [x] WorkflowRuntime interface created
- [x] Public API exports complete
- [x] Package builds successfully
- [x] README documentation written

**Files Created:**
- `packages/workflow-sdk/src/types/steps.ts` - All step interfaces
- `packages/workflow-sdk/src/types/workflow.ts` - Workflow config types
- `packages/workflow-sdk/src/types/phases.ts` - Phase types
- `packages/workflow-sdk/src/builder/defineWorkflow.ts` - Workflow builder
- `packages/workflow-sdk/src/runtime/adapter.ts` - Runtime interface
- `packages/workflow-sdk/src/index.ts` - Public API
- `packages/workflow-sdk/package.json` - Package config
- `packages/workflow-sdk/README.md` - Documentation

### Task Group 2: Web App Infrastructure (100%)
- [x] Workflow engine directory structure
- [x] Inngest client with SQLite memoization
- [x] Runtime context types
- [x] Step helper functions (findOrCreateStep, updateStepStatus, etc.)
- [x] Phase step with retry logic
- [x] Agent step implementation
- [x] Slash command step
- [x] Git step implementation
- [x] CLI step implementation
- [x] Artifact upload step
- [x] Annotation step
- [x] Runtime adapter implementation

**Files Created:**
- `apps/web/src/server/workflows/types.ts` - Runtime context
- `apps/web/src/server/workflows/engine/client.ts` - Inngest client factory
- `apps/web/src/server/workflows/engine/steps/helpers.ts` - Step utilities
- `apps/web/src/server/workflows/engine/steps/phase.ts` - Phase with retry
- `apps/web/src/server/workflows/engine/steps/agent.ts` - Agent execution
- `apps/web/src/server/workflows/engine/steps/slash.ts` - Slash commands
- `apps/web/src/server/workflows/engine/steps/git.ts` - Git operations
- `apps/web/src/server/workflows/engine/steps/cli.ts` - Shell commands
- `apps/web/src/server/workflows/engine/steps/artifact.ts` - File uploads
- `apps/web/src/server/workflows/engine/steps/annotation.ts` - Progress notes
- `apps/web/src/server/workflows/engine/steps/index.ts` - Step exports
- `apps/web/src/server/workflows/engine/runtime.ts` - Runtime adapter
- `apps/web/src/server/config.ts` - Workflow configuration

### Task Group 3: Discovery & Loading (100%)
- [x] Workflow file finder (recursive)
- [x] Workflow module extraction
- [x] loadProjectWorkflows() implementation
- [x] scanProjectWorkflows() implementation
- [x] scanAllProjectWorkflows() implementation
- [x] Registry initialization

**Files Created:**
- `apps/web/src/server/workflows/engine/loader.ts` - Dynamic loading
- `apps/web/src/server/workflows/engine/scanner.ts` - Project scanning
- `apps/web/src/server/workflows/engine/registry.ts` - Engine initialization

## 🚧 Remaining Work (35%)

### Task Group 4: API Endpoints & Routes (0%)
**Status:** Not started

**Required Files:**
- `apps/web/src/server/routes/workflows.ts`
  - POST `/api/projects/:projectId/workflows/refresh`
  - GET `/api/projects/:projectId/workflows`
  - GET `/api/workflow-definitions/:definitionId`
- Update `apps/web/src/server/routes/index.ts` to register routes

### Task Group 5: Server Integration (0%)
**Status:** Not started

**Required Changes:**
1. **Add Inngest dependency:**
   - File: `apps/web/package.json`
   - Add: `inngest: "^3.x.x"`
   - Add: `concurrently: "^9.1.0"` (devDependency)
   - Add script: `"inngest": "npx inngest-cli@latest dev -u http://localhost:3456/api/workflows/inngest"`
   - Update script: `"dev": "concurrently \"pnpm inngest\" \"pnpm dev:server\" \"pnpm dev:client\""`

2. **Integrate workflow engine into server startup:**
   - File: `apps/web/src/server/index.ts` (NEEDS TO BE CREATED)
   - Import `initializeWorkflowEngine`, `scanAllProjectWorkflows`
   - Call `initializeWorkflowEngine(fastify)` before server start
   - Call `scanAllProjectWorkflows(fastify)` after engine init
   - Log scan results

3. **Update executeWorkflow service:**
   - File: `apps/web/src/server/domain/workflow/services/executeWorkflow.ts` (NEEDS TO BE CREATED)
   - Replace MockWorkflowOrchestrator with Inngest trigger
   - Use `fastify.workflowClient.send()` to trigger workflows

4. **Delete mock orchestrator:**
   - File: `apps/web/src/server/domain/workflow/services/MockWorkflowOrchestrator.ts`

5. **Add environment variables:**
   - File: `apps/web/.env.example`
   - Add workflow engine configuration

### Task Group 6: Example Workflow & Testing (0%)
**Status:** Not started

**Required:**
- Create test project at `apps/web/test-project/.workflows/`
- Write example workflow using SDK
- Unit tests for phase retry logic
- Unit tests for dynamic step creation
- Integration tests for workflow scanning
- Integration tests for workflow execution
- E2E test for full workflow execution

### Task Group 7: Documentation (Partial - 50%)
**Status:** SDK README complete, web app docs needed

**Required:**
- [x] SDK README (complete)
- [ ] Update `apps/web/CLAUDE.md` with workflow engine section
- [ ] Create `apps/web/docs/workflows.md` implementation guide
- [ ] Test and verify SDK package build

## Missing Dependencies

### Domain Services
The following domain services are referenced but don't exist yet:
- `@/server/domain/session/services/executeAgent` - Used by agent step
- `@/server/domain/git/services/createCommit` - Used by git step
- `@/server/domain/git/services/createBranch` - Used by git step
- `@/server/domain/git/services/createPullRequest` - Used by git step

**Resolution:** These services need to be created OR the step implementations need to be updated to use alternative implementations.

### WebSocket Infrastructure
Referenced but may not exist:
- `@/server/websocket/infrastructure/subscriptions` - broadcast() function
- `@/shared/websocket/channels` - Channels utility

**Resolution:** Verify these exist or create mock implementations.

### Server Entry Point
- `apps/web/src/server/index.ts` - Main server file doesn't exist yet

**Resolution:** Needs to be created or existing entry point needs to be identified.

## Database Schema

### Required Models (Assumed to Exist)
- `WorkflowDefinition` - Stores discovered workflows
- `WorkflowExecution` - Runtime instances
- `WorkflowExecutionStep` - Individual steps
- `WorkflowEvent` - Audit trail
- `WorkflowArtifact` - File uploads
- `AgentSession` - Agent execution tracking
- `Project` - Projects
- `User` - Users

**Action Required:** Verify these models exist in Prisma schema, add if missing.

## Critical Path to Completion

1. **Install Inngest dependency** (5 min)
   ```bash
   cd apps/web && pnpm add inngest concurrently
   ```

2. **Create or identify server entry point** (15 min)
   - Find existing `apps/web/src/server/index.ts` or equivalent
   - Integrate workflow engine initialization

3. **Create domain services or stub them** (1-2 hours)
   - Create minimal implementations of git services
   - Create executeAgent service or use existing CLI integration
   - Verify WebSocket infrastructure

4. **Create API routes** (30 min)
   - Implement workflow routes
   - Register in route index

5. **Create executeWorkflow service** (30 min)
   - Replace mock with Inngest trigger

6. **Add environment variables** (10 min)
   - Update .env.example

7. **Test end-to-end** (1-2 hours)
   - Create example workflow
   - Start Inngest Dev Server
   - Trigger workflow execution
   - Debug any issues

8. **Write tests** (2-3 hours)
   - Unit tests for critical components
   - Integration tests for scanning
   - E2E test for workflow execution

## Estimated Time to Completion

- API Routes: 30 minutes
- Server Integration: 2 hours
- Domain Services: 2 hours
- Testing: 3 hours
- Documentation: 1 hour

**Total:** 8-9 hours remaining work

## Notes

- SDK package is complete and builds successfully
- Core workflow engine infrastructure is in place
- Main blockers are server integration points and domain services
- Once integrated, should be ready for testing with real workflows
