# WebSocket Refactoring Specification

## Overview

Refactor `apps/web/src/server/websocket.ts` (597 lines) into a clean modular structure with 3 folders: `handlers/`, `services/`, `utils/`. Add reconnection support and basic metrics. Write behavior-focused tests using real Prisma (SQLite) and real file system. Mock only agent-cli-sdk.

## Current State

- Single file: `apps/web/src/server/websocket.ts` (597 lines)
- `handleSessionEvent()` function: 350 lines
- Duplicated cleanup logic (3 instances)
- Mixed concerns: auth, routing, session logic, image handling
- Hard to test and maintain

## Target Structure

```
server/websocket/
├── index.ts                      # Main registration (~40 lines)
├── types.ts                      # Move from websocket.types.ts
├── handlers/
│   ├── session.handler.ts        # Session events (~180 lines, includes image logic)
│   ├── shell.handler.ts          # Shell events (~40 lines)
│   └── global.handler.ts         # Global events (~30 lines)
├── services/
│   ├── session-validator.ts      # Auth & validation (~50 lines)
│   ├── usage-extractor.ts        # Usage data parsing (~60 lines)
│   └── agent-executor.ts         # Agent SDK wrapper (~80 lines)
└── utils/
    ├── send-message.ts           # Message sending (~15 lines)
    ├── extract-id.ts             # ID extraction (~15 lines)
    ├── cleanup.ts                # Temp file cleanup (~40 lines)
    ├── active-sessions.ts        # Session state manager (~100 lines)
    ├── reconnection.ts           # Reconnection grace period (~60 lines)
    └── metrics.ts                # WebSocket metrics (~50 lines)
```

## Implementation Phases

### Phase 1: Setup & Utilities (Low Risk)

**Tasks:**
1. Create `server/websocket/` directory structure
2. Create `utils/send-message.ts` - extract `sendMessage()` function
3. Create `utils/extract-id.ts` - extract `extractId()` function
4. Create `utils/cleanup.ts` - consolidate 3x duplicated cleanup logic into single function
5. Create `utils/metrics.ts` - WebSocket metrics tracking (connections, messages, errors)
6. Write tests for utilities
7. Update `websocket.ts` to use new utilities

**Tests:**
- Messages are sent to socket with correct JSON format
- IDs extracted correctly from event type strings
- Cleanup removes real temp directories from file system
- Metrics increment correctly

### Phase 2: State Management (Medium Risk)

**Tasks:**
1. Create `utils/active-sessions.ts` - wrap `activeSessions` Map with manager class
   - Methods: `getOrCreate()`, `get()`, `update()`, `cleanup()`, `cleanupByUser()`
2. Create `utils/reconnection.ts` - 30-second grace period before session cleanup
   - `scheduleCleanup(sessionId, callback)` - schedule cleanup after 30s
   - `cancelCleanup(sessionId)` - cancel if user reconnects
3. Write tests for state managers
4. Replace direct Map access in `websocket.ts` with manager methods

**Tests:**
- Session persists in Map after creation
- Session data can be retrieved and updated
- Cleanup removes real temp directories
- Reconnect within 30s preserves session
- After 30s, session cleanup is triggered

### Phase 3: Extract Services (Medium Risk)

**Tasks:**
1. Create `services/session-validator.ts`
   - Extract session ownership verification
   - Extract Prisma queries for session/project/user
   - Function: `validateSessionOwnership(sessionId, userId): Promise<Session>`
2. Create `services/usage-extractor.ts`
   - Extract 57-line usage parsing logic
   - Function: `extractUsageFromEvents(events): UsageData | null`
   - Pure function, no database access
3. Create `services/agent-executor.ts`
   - Wrap agent CLI SDK execution
   - Function: `executeAgentCommand(config): Promise<Result>`
   - Handle streaming, error handling, exit codes
4. Write tests for each service
5. Update handlers to use services

**Tests:**
- **Validator**: Use real Prisma with seeded test data
  - Returns session for authorized user
  - Throws error for unauthorized user
  - Returns session with project data
- **Extractor**: Pure function tests
  - Returns usage object from various event formats
  - Returns null when no usage found
  - Handles malformed events
- **Executor**: Mock agent CLI SDK
  - Streams messages via callback
  - Returns exit code
  - Handles errors

### Phase 4: Extract Handlers (High Risk)

**Tasks:**
1. Create `handlers/session.handler.ts`
   - Move `handleSessionEvent()` → `handleSessionSendMessage()` and `handleSessionCancel()`
   - Keep image processing inline (no separate service)
   - Use services for validation, usage extraction, agent execution
   - Remove duplicated cleanup code (use utility)
2. Create `handlers/shell.handler.ts`
   - Move `handleShellEvent()`
   - Stub for future shell functionality
3. Create `handlers/global.handler.ts`
   - Stub for future global events (e.g., ping/pong)
4. Write tests for handlers
5. Update routing to use new handlers

**Tests:**
- Use real Prisma with seeded test data (user, project, session)
- Use real temp directories
- Mock only agent SDK execution
- Verify:
  - `stream_output` messages sent to socket
  - Temp images created in real directories
  - Temp images cleaned up after execution
  - Error messages sent on failure
  - Usage data saved to real database
  - Session updated with correct data

### Phase 5: Simplify Main File (Final Refactor)

**Tasks:**
1. Refactor `websocket.ts` → `websocket/index.ts`
   - JWT authentication inline (keep simple)
   - Message routing with handler map
   - Connection lifecycle (connect, message, close, error)
   - Integrate metrics tracking
   - Integrate reconnection manager
2. Move types from `websocket.types.ts` → `websocket/types.ts`
3. Write tests for main registration
4. Update all imports across codebase

**Tests:**
- Real Prisma for JWT verification
- Mock WebSocket connection
- Verify:
  - Unauthenticated connection receives error and closes
  - Authenticated connection receives `global.connected` event
  - Messages route to correct handlers based on prefix
  - Disconnect triggers reconnection timer
  - Reconnect cancels cleanup timer
  - After 30s, cleanup is executed
  - Metrics increment on connect/message/error

### Phase 6: Testing & Cleanup

**Tasks:**
1. Write integration tests for full WebSocket flow
   - Seed test database (user, project, session)
   - Real WebSocket connection
   - Mock only agent SDK
   - Real file system operations
2. Remove commented-out code (lines 225-261 in original)
3. Add JSDoc comments to public functions
4. Run full test suite: `pnpm test`
5. Manual testing in browser
   - Connect, send message, verify streaming
   - Send message with images, verify upload and cleanup
   - Disconnect and reconnect, verify session persists

**Integration Tests:**
- Connect → authenticate → send message → receive stream → disconnect
- Send message with images → images processed → cleanup after success
- Disconnect → reconnect within 30s → session persists
- Disconnect → wait 30s → session cleaned up
- Multiple concurrent connections → metrics track correctly

## Testing Strategy

### Use Real Infrastructure

- **Prisma**: Real SQLite database (`:memory:` or temp file per test)
- **File System**: Real temp directories (create in `/tmp/test-*`)
- **State**: Real Map instances
- **WebSocket**: Mock socket class that captures sent messages

### Mock Only When Necessary

- **Agent CLI SDK**: Mock `execute()` - external process, slow
- **Time**: Mock `setTimeout` for reconnection tests (don't wait 30s)

### Test Behavior, Not Implementation

**✅ Test Observable Behavior:**
- Messages sent to WebSocket
- Files created/deleted
- Database records created/updated
- Function return values
- Errors thrown

**❌ Don't Test Implementation:**
- Which internal methods were called
- How many times Map.get() was called
- Internal state of classes
- Private methods

### Test Setup Pattern

```typescript
import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import { vi } from 'vitest';
import * as agentSdk from '@repo/agent-cli-sdk';

// Mock agent SDK
vi.mock('@repo/agent-cli-sdk', () => ({
  execute: vi.fn()
}));

let prisma: PrismaClient;
let testUser: User;
let testProject: Project;
let testSession: Session;
let tempDir: string;

beforeEach(async () => {
  // Real Prisma with in-memory database
  prisma = new PrismaClient({
    datasourceUrl: 'file::memory:?mode=memory&cache=shared'
  });
  await prisma.$executeRaw`PRAGMA foreign_keys = ON`;

  // Seed test data
  testUser = await prisma.user.create({
    data: { username: 'test', password: 'hash' }
  });
  testProject = await prisma.project.create({
    data: {
      userId: testUser.id,
      name: 'Test Project',
      path: '/tmp/test-project'
    }
  });
  testSession = await prisma.session.create({
    data: {
      projectId: testProject.id,
      status: 'active'
    }
  });

  // Real temp directory
  tempDir = `/tmp/websocket-test-${Date.now()}`;
  await fs.mkdir(tempDir, { recursive: true });
});

afterEach(async () => {
  // Cleanup real resources
  await prisma.$disconnect();
  await fs.rm(tempDir, { recursive: true, force: true });
});
```

### Example Tests

```typescript
// Utils test
test('sendMessage sends JSON to socket', () => {
  const socket = new MockWebSocket();
  sendMessage(socket, 'test.event', { foo: 'bar' });

  expect(socket.lastMessage).toEqual(
    '{"type":"test.event","data":{"foo":"bar"}}'
  );
});

// Service test with real Prisma
test('session validator returns session for owner', async () => {
  const result = await validateSessionOwnership(testSession.id, testUser.id);

  expect(result.id).toBe(testSession.id);
  expect(result.project.path).toBe(testProject.path);
});

test('session validator throws for unauthorized user', async () => {
  const otherUser = await prisma.user.create({
    data: { username: 'other', password: 'hash' }
  });

  await expect(
    validateSessionOwnership(testSession.id, otherUser.id)
  ).rejects.toThrow('Unauthorized');
});

// Handler test with real Prisma + real files + mock agent SDK
test('session handler creates and cleans up temp images', async () => {
  // Mock agent SDK
  vi.mocked(agentSdk.execute).mockResolvedValue({
    exitCode: 0,
    events: []
  });

  const socket = new MockWebSocket();
  const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  await handleSessionSendMessage(
    socket,
    testSession.id,
    { message: 'test', images: [imageData] },
    testUser.id,
    logger
  );

  // Verify stream output sent
  expect(socket.sentMessages).toContainEqual({
    type: `session.${testSession.id}.stream_output`,
    data: expect.any(Object)
  });

  // Verify real temp directory was cleaned up
  const files = await fs.readdir(tempDir);
  expect(files).toHaveLength(0);
});

// Integration test
test('complete message flow with database and files', async () => {
  // Mock agent SDK
  vi.mocked(agentSdk.execute).mockImplementation(async ({ onEvent }) => {
    onEvent?.({ message: 'Agent response' });
    return { exitCode: 0, events: [{ role: 'assistant', usage: { input_tokens: 100 } }] };
  });

  const ws = new MockWebSocket();
  const token = generateJWT(testUser.id);

  await handleWebSocketConnection(ws, token);

  ws.send(JSON.stringify({
    type: `session.${testSession.id}.send_message`,
    data: { message: 'Hello' }
  }));

  // Verify stream output sent
  expect(ws.sentMessages).toContainEqual({
    type: `session.${testSession.id}.stream_output`,
    data: expect.objectContaining({ message: 'Agent response' })
  });

  // Verify usage saved to real database
  const updated = await prisma.session.findUnique({
    where: { id: testSession.id }
  });
  expect(updated?.usage).toEqual({ inputTokens: 100, outputTokens: 0 });
});
```

## New Features

### 1. Reconnection Support

**Feature**: 30-second grace period before cleaning up disconnected sessions

**Implementation**: `utils/reconnection.ts`
```typescript
export class ReconnectionManager {
  private timers = new Map<string, NodeJS.Timeout>();

  scheduleCleanup(sessionId: string, callback: () => Promise<void>) {
    this.cancelCleanup(sessionId);

    const timer = setTimeout(async () => {
      this.timers.delete(sessionId);
      await callback();
    }, 30000); // 30 seconds

    this.timers.set(sessionId, timer);
  }

  cancelCleanup(sessionId: string) {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }
  }
}
```

**Usage**: On disconnect, schedule cleanup. On reconnect, cancel cleanup.

### 2. Metrics Tracking

**Feature**: Track WebSocket health and performance

**Implementation**: `utils/metrics.ts`
```typescript
export class WebSocketMetrics {
  private activeConnections = 0;
  private totalMessagesSent = 0;
  private totalMessagesReceived = 0;
  private totalErrors = 0;

  recordConnection() {
    this.activeConnections++;
  }

  recordDisconnection() {
    this.activeConnections--;
  }

  recordMessageSent() {
    this.totalMessagesSent++;
  }

  recordMessageReceived() {
    this.totalMessagesReceived++;
  }

  recordError() {
    this.totalErrors++;
  }

  getMetrics() {
    return {
      activeConnections: this.activeConnections,
      totalMessagesSent: this.totalMessagesSent,
      totalMessagesReceived: this.totalMessagesReceived,
      totalErrors: this.totalErrors,
    };
  }
}

export const wsMetrics = new WebSocketMetrics();
```

**Usage**: Increment counters on connection/message/error events.

### 3. Metrics Endpoint

**Feature**: HTTP endpoint to view WebSocket metrics

**Implementation**: Add route in `apps/web/src/server/routes/websocket.ts`
```typescript
fastify.get('/api/websocket/metrics', async (request, reply) => {
  return wsMetrics.getMetrics();
});
```

**Response**:
```json
{
  "activeConnections": 5,
  "totalMessagesSent": 1234,
  "totalMessagesReceived": 567,
  "totalErrors": 3
}
```

## Benefits

### Maintainability
- Each file has single responsibility (40-180 lines)
- Easy to locate specific functionality
- Changes are localized to relevant files

### Testability
- Each module tested independently
- Real infrastructure gives high confidence
- Behavior-focused tests prevent brittle tests

### Reusability
- Image processor can be used in REST endpoints
- Usage extractor can be used in multiple handlers
- Cleanup logic consistent across codebase

### Extensibility
- Easy to add new event handlers (just add to handler map)
- Can add middleware without touching handlers
- Simple to add new agent types

### Debugging
- Stack traces point to specific handlers
- Easier to add targeted logging
- Better error context

## Migration Strategy

1. **Incremental approach**: Each phase can be tested independently
2. **Keep existing file**: Don't delete `websocket.ts` until all phases complete
3. **Parallel testing**: Write tests as we refactor
4. **Rollback capability**: Can revert any phase if issues arise
5. **Manual verification**: Test in browser after each phase

## Risks & Mitigation

### Risk: Breaking existing functionality
**Mitigation**:
- Comprehensive tests before and after refactor
- Manual testing after each phase
- Keep original file until complete

### Risk: Tests too slow
**Mitigation**:
- Use SQLite `:memory:` database
- Mock only agent SDK (slow external process)
- Parallel test execution

### Risk: Test brittleness
**Mitigation**:
- Test behavior, not implementation
- Use real infrastructure
- No spies on internal methods

## Estimated Time

- Phase 1: 3 hours (utilities)
- Phase 2: 2 hours (state)
- Phase 3: 3 hours (services)
- Phase 4: 4 hours (handlers)
- Phase 5: 2 hours (main file)
- Phase 6: 2 hours (integration tests + cleanup)

**Total: ~16 hours (2 days)**

## Success Criteria

- [ ] All existing WebSocket functionality works unchanged
- [ ] File structure matches target structure
- [ ] All tests pass with >80% coverage
- [ ] No duplicated code
- [ ] Reconnection feature works (30s grace period)
- [ ] Metrics tracking works and endpoint returns data
- [ ] Manual testing succeeds (connect, send, disconnect)
- [ ] Code review approved
- [ ] Documentation updated
