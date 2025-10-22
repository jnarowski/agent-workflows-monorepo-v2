# Project Sync Service Tests

## Overview

Comprehensive unit tests for the `ProjectSyncService` covering both the internal filtering logic and the main sync orchestration method.

## Test Suites

### `hasQualifyingSessions`

Tests the internal method that determines if a project should be imported based on message count.

**Test Cases:**
1. ✓ Returns `false` for projects with no JSONL files
2. ✓ Returns `false` for projects with only 1 message
3. ✓ Returns `false` for projects with exactly 3 messages (requires >3)
4. ✓ Returns `true` for projects with 4+ messages
5. ✓ Returns `true` if any session has >3 messages (mixed sessions)
6. ✓ Ignores non-message entries (summary, file-history-snapshot, etc.)
7. ✓ Handles malformed JSON lines gracefully

### `syncFromClaudeProjects`

Tests the main sync orchestration method that imports projects and sessions.

**Test Cases:**

#### Edge Cases
1. ✓ Returns empty stats when `.claude/projects/` directory doesn't exist
2. ✓ Skips projects without qualifying sessions (≤3 messages)
3. ✓ Handles session sync failures gracefully

#### Basic Functionality
4. ✓ Imports project with qualifying sessions
5. ✓ Correctly identifies new vs updated projects by comparing timestamps
6. ✓ Uses correct project path from `cwd` field in JSONL files

#### Multiple Projects
7. ✓ Handles multiple projects correctly:
   - Project 1: New (4+ messages) → imported
   - Project 2: Updated (4+ messages) → updated
   - Project 3: Skipped (≤3 messages) → not processed

## Key Testing Strategies

### Mocking
- Mocks `projectService.createOrUpdateProject` to avoid database operations
- Mocks `agentSessionService.syncProjectSessions` to avoid filesystem I/O
- Uses temporary directories for test JSONL files

### Message Counting
- Tests verify that only `type: "user"` and `type: "assistant"` entries are counted
- Other entry types (summary, file-history-snapshot, create, tool_use) are ignored
- Threshold is >3 messages (i.e., 4 or more)

### Project Path Extraction
- Tests verify that `cwd` field from JSONL is used as the project path
- Display name is derived from last path segment
- Encoded directory names are not used directly

### Import vs Update Detection
- New projects: `created_at === updated_at`
- Updated projects: `created_at < updated_at`
- Tests verify correct counting of imported vs updated projects

## Running the Tests

```bash
# Run all tests
pnpm test

# Run project-sync tests specifically
pnpm test project-sync.service.test

# Run with coverage
pnpm test --coverage
```

## Test Structure

Each test follows this pattern:

1. **Arrange**: Create test JSONL files and mock responses
2. **Act**: Call `syncFromClaudeProjects` or `hasQualifyingSessions`
3. **Assert**: Verify expected behavior and mock call counts

## Coverage

The test suite covers:
- ✅ Empty/missing directories
- ✅ Projects with various message counts (0, 1, 3, 4+)
- ✅ New vs updated project detection
- ✅ Multiple concurrent projects
- ✅ Path extraction from JSONL `cwd` fields
- ✅ Session sync integration
- ✅ Error handling for sync failures
- ✅ Malformed JSONL handling
- ✅ Mixed entry types in JSONL files

## Future Improvements

Potential areas for additional testing:
- Performance testing with large numbers of projects
- Concurrent sync request handling
- Database constraint violations (duplicate paths)
- File system permission errors
- Partial sync completion scenarios
