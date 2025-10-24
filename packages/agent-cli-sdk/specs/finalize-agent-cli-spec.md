# Finalize agent-cli-sdk-three for 1.0 Release

**Package:** `@sourceborn/agent-cli-sdk-three`
**Current Version:** 0.1.19
**Target Version:** 1.0.0
**Status:** Audit Complete - Ready for Fixes
**Date:** October 19, 2025

---

## Executive Summary

### Current State
- **LOC:** ~3,509 source + ~5,417 tests
- **Test Pass Rate:** 75% (49/65 E2E tests passing)
- **Architecture:** ⭐⭐⭐⭐⭐ Excellent
- **Production Readiness:** ⭐⭐⭐☆☆ Needs work

### Verdict
Strong foundation with clean architecture and comprehensive tests. **Not ready for 1.0** due to test failures, dead code, and documentation gaps.

**Estimated Time to 1.0:** 2-3 days focused work

---

## Critical Issues (MUST FIX)

### 1. Codex Test Failures - Unsupported CLI Arguments

**Priority:** 🔴 CRITICAL
**Files:**
- `tests/e2e/codex-e2e.test.ts` (all basic execution tests)
- `src/adapters/codex/cli-wrapper.ts:115-226`

**Problem:**
6 Codex tests failing with:
```
error: unexpected argument '--approval-policy' found
```

**Root Cause:**
Tests assume `--approval-policy` flag exists, but Codex CLI only supports this in interactive mode, not `codex exec` programmatic mode.

**Evidence:**
```typescript
// src/adapters/codex/cli-wrapper.ts:138-140
// NOTE: -a (approval policy) is NOT available in 'codex exec'
// It's only available in interactive mode
// Use --full-auto or --dangerously-bypass-approvals-and-sandbox instead
```

**Fix:**
1. **Option A (Recommended):** Remove approval policy from CodexExecutionOptions and update tests
2. **Option B:** Add validation in CodexAdapter.execute() to throw clear error
3. Update README to document Codex limitations

**Acceptance Criteria:**
- [ ] All Codex basic execution tests pass
- [ ] No references to approvalPolicy in Codex code/tests
- [ ] README clearly documents Codex vs Claude feature differences

**Files to Modify:**
- `tests/e2e/codex-e2e.test.ts` - Remove/update approval policy tests
- `src/types/codex.ts` - Remove approvalPolicy from CodexExecutionOptions (if not needed)
- `README.md` - Add feature comparison table

---

### 2. Claude Session Abort Tests Failing

**Priority:** 🔴 HIGH
**Files:**
- `tests/e2e/claude-e2e.test.ts:610, 640`
- `src/adapters/claude/session.ts:112-117`

**Problem:**
Session abort tests expect execution to fail after abort(), but executions still complete successfully.

**Root Cause:**
```typescript
// src/adapters/claude/session.ts:112-117
abort(): void {
  this._aborted = true;
  this.emit('aborted');
  // Note: We can't abort ongoing execution in spawn-per-message model
  // This just prevents new messages from being sent
}
```

Abort only sets a flag - can't kill spawned processes.

**Fix:**
1. **Option A (Recommended):** Update tests to match actual behavior - abort only prevents *new* messages
2. **Option B:** Implement process tracking and killing (complex, may not be reliable)
3. Document abort limitations in README and JSDoc

**Test Changes Needed:**
```typescript
// Current test expects rejection:
await expect(promise1).rejects.toThrow();

// Should be:
await expect(promise1).resolves.toBeDefined();
// And verify subsequent sends fail:
await expect(session.send('next')).rejects.toThrow('session has been aborted');
```

**Acceptance Criteria:**
- [ ] Abort tests pass with updated expectations
- [ ] README documents abort() only prevents new messages
- [ ] JSDoc on abort() method explains behavior

---

### 3. Remove Dead Code and Test Files

**Priority:** 🔴 HIGH
**Impact:** Unprofessional for 1.0, confuses users

**Files to DELETE:**
```
packages/agent-cli-sdk-three/test-all-events.mjs
packages/agent-cli-sdk-three/test-codex-refactor.mjs
packages/agent-cli-sdk-three/test-events-detail.mjs
packages/agent-cli-sdk-three/test-events.mjs
packages/agent-cli-sdk-three/test-tool-events.mjs
packages/agent-cli-sdk-three/test-output.log
packages/agent-cli-sdk-three/src/utils/hello.ts
```

**Additional Changes:**
- Remove `hello` export from `src/utils/index.ts`
- Update `.gitignore` to prevent future `.mjs` and `.log` files

**Acceptance Criteria:**
- [ ] All test .mjs files removed from root
- [ ] test-output.log removed
- [ ] src/utils/hello.ts removed
- [ ] .gitignore updated with: `*.log`, `test-*.mjs`
- [ ] Package builds successfully after deletion

---

### 4. CodexAdapter Session Support Mismatch

**Priority:** 🔴 HIGH
**Files:**
- `src/adapters/codex/index.ts:105-112`

**Problem:**
```typescript
getCapabilities(): AdapterCapabilities {
  return {
    sessionManagement: true, // ❌ Claims support
    // ...
  };
}
```

But CodexAdapter doesn't have `createSession()` method like ClaudeAdapter does.

**Fix Options:**

**Option A - Implement Sessions:**
```typescript
// Add to CodexAdapter
createSession(options: SessionOptions = {}): CodexSession {
  const mergedOptions = { ...this.config, ...options };
  return new CodexSession(this, mergedOptions);
}
```

Then create `src/adapters/codex/session.ts` mirroring `claude/session.ts`.

**Option B - Disable Until Implemented:**
```typescript
getCapabilities(): AdapterCapabilities {
  return {
    sessionManagement: false, // ✅ Accurate
    // ...
  };
}
```

**Recommendation:** Option B for 1.0, implement full sessions in 1.1

**Acceptance Criteria:**
- [ ] Capabilities accurately reflect implemented features
- [ ] README documents which features are adapter-specific
- [ ] Tests don't try to create Codex sessions (or are skipped)

---

### 5. Event Logging Issues

**Priority:** 🔴 HIGH
**Files:**
- `tests/e2e/claude-e2e.test.ts:764` (turn.started missing)
- `tests/e2e/claude-e2e.test.ts:797` (tool events not logged)
- `tests/e2e/claude-e2e.test.ts:938` (event count mismatch)
- `src/adapters/claude/cli-wrapper.ts:109-202`

**Problem:**
Tests expect certain events in logs that aren't being captured:
- `turn.started` and `turn.completed` synthetic events
- Tool usage events
- Event ordering/count mismatches

**Investigation Needed:**
The synthetic event generation in cli-wrapper.ts:128-196 may not be persisting to log files properly.

**Fix:**
1. Verify events are written to `response.events` array in execution response
2. Ensure log files include all synthetic events
3. Fix event ordering if needed

**Acceptance Criteria:**
- [ ] All event logging tests pass
- [ ] Log files contain all synthetic events (turn.started, text, tool.*)
- [ ] Event count matches between live and logged events

---

## Medium Priority Issues

### 6. Type Safety - Remove `any` Types

**Priority:** 🟡 MEDIUM
**Files:** `src/client/session.ts:18, 58`

**Problem:**
```typescript
private adapterSession: any; // Line 18 - Loss of type safety
```

**Fix:**
Create proper interface:
```typescript
// src/types/session.ts
export interface AdapterSession {
  send<T>(message: string, options?: SendOptions): Promise<ExecutionResponse<T>>;
  abort?(): void;
  on(event: string, callback: (...args: any[]) => void): void;
  getSessionId?(): string | undefined;
  messageCount?: number;
}

// src/client/session.ts
private adapterSession: AdapterSession;
```

**Acceptance Criteria:**
- [ ] No `any` types in Session class
- [ ] Type checking catches session interface violations
- [ ] All tests still pass

---

### 7. Timeout Race Condition in Codex

**Priority:** 🟡 MEDIUM
**Files:** `src/adapters/codex/cli-wrapper.ts:98-104`

**Problem:**
```typescript
setTimeout(() => {
  proc.kill("SIGTERM");
  reject(new Error(`Execution timed out after ${options.timeout}ms`));
}, options.timeout);
```

If process closes after kill but before promise settles, could get unhandled rejection race.

**Fix:**
```typescript
let settled = false;

proc.on("close", (exitCode) => {
  if (settled) return;
  settled = true;
  // ...
  resolve({...});
});

if (options.timeout) {
  setTimeout(() => {
    if (settled) return;
    settled = true;
    proc.kill("SIGTERM");
    reject(new TimeoutError(options.timeout));
  }, options.timeout);
}
```

**Acceptance Criteria:**
- [ ] No race conditions in timeout handling
- [ ] Timeout test passes reliably
- [ ] No unhandled promise rejections

---

### 8. Deduplicate Logging Code

**Priority:** 🟡 MEDIUM
**Files:**
- `src/adapters/claude/index.ts:143-160`
- `src/adapters/codex/index.ts:121-133`

**Problem:**
Both adapters have identical `writeExecutionLogs()` private methods - code duplication.

**Fix:**
Move to BaseAdapter:
```typescript
// src/core/base-adapter.ts
protected async safeWriteLogs(
  logPath: string,
  input: unknown,
  output: unknown,
  error: unknown
): Promise<void> {
  try {
    await writeExecutionLogs(logPath, input, output, error);
  } catch (logError) {
    console.error('[logger] Failed to write logs:', logError);
  }
}
```

**Acceptance Criteria:**
- [ ] Logging code in one place
- [ ] Both adapters use shared method
- [ ] All logging tests still pass

---

### 9. Missing Documentation Files

**Priority:** 🟡 MEDIUM

**Missing Files:**
- `CHANGELOG.md` - Referenced in README:613
- `CONTRIBUTING.md` - Referenced in README:601

**Fix:**
Create both files with proper structure.

**CHANGELOG.md Template:**
```markdown
# Changelog

## [1.0.0] - 2025-10-XX

### Added
- Initial 1.0 release
- Claude CLI adapter with full session support
- Codex CLI adapter with basic execution
- Structured output with Zod validation
- Comprehensive test suite

### Breaking Changes
- Package renamed from agent-cli-sdk to agent-cli-sdk-three

## [0.1.19] - 2025-10-19
- Pre-release version
```

**Acceptance Criteria:**
- [ ] CHANGELOG.md exists with 1.0 entry
- [ ] CONTRIBUTING.md exists with contribution guidelines
- [ ] README links work

---

### 10. Permission Mode Test Failures

**Priority:** 🟡 MEDIUM
**Files:** `tests/e2e/claude-e2e.test.ts:490`

**Problem:**
Test expects permission mode to affect output but Claude CLI doesn't behave as expected.

**Investigation Needed:**
Verify actual Claude CLI behavior with different permission modes.

**Fix:**
- Update test expectations to match actual CLI behavior
- OR skip test if CLI behavior is unpredictable
- Document expected behavior in test comments

**Acceptance Criteria:**
- [ ] Permission mode tests pass or are properly skipped
- [ ] Documented why test behaves certain way

---

## Low Priority Issues

### 11. Version Number Confusion

**Priority:** 🟢 LOW

**Problem:**
- Package is v0.1.19
- MIGRATION.md talks about v1.x → v2.0
- Planning 1.0 release

**Fix:**
Clarify version strategy in README and MIGRATION.md.

**Recommendation:**
- This release should be 1.0.0 (first stable)
- Update MIGRATION.md to say "v0.x → v1.0"
- Add version philosophy to README

---

### 12. Improve JSDoc Coverage

**Priority:** 🟢 LOW

**Files:** Multiple

**Problem:**
Many public methods lack JSDoc comments.

**Fix:**
Add comprehensive JSDoc to:
- All public methods in AgentClient
- All public methods in Session
- All adapter methods
- Complex utility functions

**Example:**
```typescript
/**
 * Execute a prompt using the configured adapter
 *
 * @template T - The expected output type (inferred from responseSchema)
 * @param prompt - The prompt to send to the AI
 * @param options - Execution options including callbacks, timeouts, etc.
 * @returns Promise resolving to execution response with data and events
 *
 * @example
 * ```typescript
 * const result = await client.execute('Create a function', {
 *   onOutput: (chunk) => console.log(chunk)
 * });
 * ```
 */
async execute<T = string>(
  prompt: string,
  options: ExecuteOptions = {}
): Promise<ExecutionResponse<T>>
```

---

### 13. Test Organization

**Priority:** 🟢 LOW

**Problem:**
- Some tests are flaky due to relying on actual AI responses
- Magic numbers/timeouts without explanation
- Could use test helpers

**Recommendations:**
1. Add test utilities for common patterns
2. Document which tests require real CLIs
3. Add timeout constants with explanations
4. Consider stability tags for flaky tests

---

### 14. Package Naming for 1.0

**Priority:** 🟢 LOW (but important for branding)

**Question:**
Should the package be renamed for 1.0?

**Options:**
- Keep `@sourceborn/agent-cli-sdk-three`
- Rename to `@sourceborn/agent-cli-sdk`
- Rename to `@sourceborn/ai-cli-sdk`

**Considerations:**
- "three" suffix is confusing
- Migration guide references this as v2.0
- Users may not understand the naming

**Recommendation:** Discuss with team before 1.0 release.

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Required for 1.0)
**Est. Time:** 1 day

**Tasks:**
1. ✅ Fix Codex test failures (remove approval policy tests)
2. ✅ Fix Claude abort tests (update expectations)
3. ✅ Remove dead code and test files
4. ✅ Fix CodexAdapter capabilities (set sessionManagement: false)
5. ✅ Fix event logging issues

**Success Criteria:**
- All E2E tests pass or have documented skips
- No dead code in package
- Capabilities match implementation

---

### Phase 2: Code Quality (Strongly Recommended)
**Est. Time:** 1 day

**Tasks:**
6. ✅ Replace `any` types with proper interfaces
7. ✅ Fix timeout race condition
8. ✅ Deduplicate logging code
9. ✅ Create CHANGELOG.md and CONTRIBUTING.md
10. ✅ Update .gitignore

**Success Criteria:**
- No `any` types in core code
- All race conditions fixed
- Complete documentation

---

### Phase 3: Polish (Nice to Have)
**Est. Time:** 0.5 day

**Tasks:**
11. ✅ Add comprehensive JSDoc
12. ✅ Clarify version numbering
13. ✅ Add test helpers
14. ✅ Consider package rename

**Success Criteria:**
- Every public API has JSDoc
- Clear version strategy
- Improved test maintainability

---

## Test Failure Details

### Codex E2E (6 failures)

| Test | Error | Fix |
|------|-------|-----|
| Basic execution | `unexpected argument '--approval-policy'` | Remove from tests |
| Streaming output | Same | Same |
| Factory adapter | Same | Same |
| Full auto mode | Same | Same |
| Approval policy | Same | Remove test entirely |
| Timeout errors | Same | Update timeout test |
| Working directory | Same | Remove unsupported flags |

### Claude E2E (10 failures)

| Test | Error | Fix |
|------|-------|-----|
| Session resume createSession | AI refuses test prompt | Update prompt or skip |
| Failed session resume | Unexpected success | Fix test expectations |
| Permission modes | Output doesn't match | Update expectations |
| Abort specific session | No rejection | Update test expectations |
| Abort all sessions | No rejection | Update test expectations |
| Streaming events in raw | Missing turn.started | Fix event capture |
| Tool events logging | No events logged | Fix event logging |
| Session abort recovery | Session aborted error | Document limitation |
| Preserve event order | Count mismatch | Fix event persistence |

---

## Cleanup Checklist

### Files to DELETE
- [ ] `test-all-events.mjs`
- [ ] `test-codex-refactor.mjs`
- [ ] `test-events-detail.mjs`
- [ ] `test-events.mjs`
- [ ] `test-tool-events.mjs`
- [ ] `test-output.log`
- [ ] `src/utils/hello.ts`

### Files to CREATE
- [ ] `CHANGELOG.md`
- [ ] `CONTRIBUTING.md`
- [ ] `.gitignore` entries for `*.log`, `test-*.mjs`

### Files to UPDATE
- [ ] `package.json` - Bump to 1.0.0
- [ ] `src/index.ts` - Remove hello export
- [ ] `README.md` - Add feature comparison table
- [ ] `MIGRATION.md` - Fix version references

---

## Success Criteria for 1.0

### Must Have ✅
- [ ] All E2E tests pass (or documented skips with reason)
- [ ] No dead code in package
- [ ] Capabilities match implementation
- [ ] CHANGELOG.md exists
- [ ] All critical issues resolved

### Should Have ⭐
- [ ] No `any` types in core code
- [ ] All race conditions fixed
- [ ] Logging code deduplicated
- [ ] .gitignore properly configured
- [ ] All medium issues resolved

### Nice to Have 🎁
- [ ] Comprehensive JSDoc
- [ ] Test helpers
- [ ] Clear version strategy documented
- [ ] Package naming decision made

---

## Risk Assessment

### High Risk
- **Codex tests:** May reveal deeper CLI compatibility issues
- **Event logging:** May require significant refactoring
- **Session abort:** Architectural limitation, can't fully fix

### Medium Risk
- **Timeout handling:** Edge cases may exist
- **Type safety:** May reveal hidden bugs

### Low Risk
- **Documentation:** Straightforward
- **Cleanup:** Simple deletions

---

## Post-1.0 Roadmap

### Version 1.1
- Implement CodexSession for full session support
- Add structured output for Codex
- Performance optimizations

### Version 1.2
- Additional CLI adapters (Cursor, Aider, etc.)
- Advanced streaming with backpressure
- Metrics and observability

### Version 2.0
- Breaking changes if needed
- New adapter API if lessons learned
- Deprecate old patterns

---

## Appendix: File Reference

### Core Files
- `src/client/agent-client.ts` - Main orchestration
- `src/client/session.ts` - Unified session wrapper
- `src/core/base-adapter.ts` - Adapter base class
- `src/adapters/claude/index.ts` - Claude adapter
- `src/adapters/codex/index.ts` - Codex adapter

### Test Files
- `tests/e2e/claude-e2e.test.ts` - Claude E2E tests (53 tests)
- `tests/e2e/codex-e2e.test.ts` - Codex E2E tests (14 tests)
- `tests/e2e/structured-output.e2e.test.ts` - Structured output tests

### Documentation
- `README.md` - Main documentation
- `MIGRATION.md` - Migration guide (v0.x → v1.0)
- `.agent/specs/finalize-agent-cli-spec.md` - This document

---

## Notes

### Key Architectural Decisions
1. **Spawn-per-message:** Can't abort in-flight executions
2. **Adapter pattern:** Clean separation of concerns
3. **Dependency injection:** Flexible, testable
4. **Dual data:** Parsed data + raw events simultaneously

### Known Limitations
- Session abort only prevents new messages
- Codex doesn't support all Claude features
- Event logging may have timing issues
- Some tests flaky due to AI response variability

---

**Last Updated:** October 19, 2025
**Next Review:** After Phase 1 completion
