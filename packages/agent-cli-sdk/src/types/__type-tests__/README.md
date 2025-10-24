# Type Tests

This directory contains compile-time type tests that verify the type system works correctly.

## What are Type Tests?

Type tests are TypeScript files that test type safety **at compile time** without executing any code. They use `@ts-expect-error` comments to verify that TypeScript correctly rejects invalid type assignments.

## How They Work

```typescript
// ✅ This should work
const validEvent: ClaudeStreamEvent = {
  type: 'user',
  data: { uuid: '123', message: {...} }
};

// ❌ This should fail - and we test that it does
// @ts-expect-error - type must be 'user', not 'wrong'
const invalidEvent: UserMessageEvent = {
  type: 'wrong',  // TypeScript will error here
  data: { uuid: '123', message: {...} }
};
```

## Running Type Tests

```bash
# Run type tests (shows intentional errors)
npm run check-types:tests

# Run regular type check (excludes type tests)
npm run check-types
```

## What Gets Tested

### ✅ Event Structure Validation
- Correct event types and data shapes
- Required vs optional fields
- Type discriminators (`type` field)

### ✅ Type Guards
- Type narrowing with guard functions
- Discriminated union handling
- Runtime type checking

### ✅ Message Content Types
- Text, thinking, tool use, tool result content
- Union type handling
- Array vs string content

### ✅ Integration
- ExecutionResponse type compatibility
- Casting to adapter-specific types
- Mixed event arrays

### ✅ Edge Cases
- Optional fields (undefined allowed, null rejected)
- Empty arrays
- Type inference
- Generic functions

## Understanding the Output

When you run `npm run check-types:tests`, you'll see errors like:

```
src/types/__type-tests__/events.test-d.ts(62,3): error TS2322: Type '"wrong"' is not assignable to type '"test"'.
```

**This is expected!** These errors prove that TypeScript is correctly catching type violations. Every `@ts-expect-error` comment should have a corresponding error.

### Good vs Bad Errors

**✅ Good (Expected):**
```typescript
// @ts-expect-error - type must be 'user'
const event: UserMessageEvent = { type: 'wrong', ... };
// Error TS2322: Type '"wrong"' is not assignable to type '"user"'
```

**❌ Bad (Unexpected):**
If a line has `@ts-expect-error` but TypeScript **doesn't** error, that means our type system is too permissive!

## Test Categories

### 1. Base Event Types (`events.test-d.ts`)
Tests for fundamental event structures shared across adapters.

### 2. Claude Event Types
- FileHistorySnapshotEvent
- UserMessageEvent
- AssistantMessageEvent
- ClaudeStreamEvent union

### 3. Codex Event Types
- ThreadStartedEvent
- TurnCompletedEvent
- ItemCompletedEvent
- CodexStreamEvent union

### 4. Type Guards
- isClaudeEvent, isUserMessageEvent, etc.
- Type narrowing behavior
- Discriminated unions

### 5. Integration Tests
- ExecutionResponse compatibility
- Casting patterns
- Real-world usage scenarios

## Adding New Tests

When adding new event types or modifying existing ones:

1. Add positive tests (valid usage):
```typescript
const validEvent: NewEventType = {
  type: 'new-event',
  data: { /* valid structure */ }
};
```

2. Add negative tests (invalid usage):
```typescript
// @ts-expect-error - explain why this should fail
const invalidEvent: NewEventType = {
  type: 'wrong-type',
  data: { /* ... */ }
};
```

3. Run tests:
```bash
npm run check-types:tests
```

4. Verify errors match expectations

## Configuration

Type tests use a separate `tsconfig.type-tests.json` that:
- Extends the main tsconfig
- Disables `noUnusedLocals` (tests declare many unused variables)
- Only includes `src/types/__type-tests__/**/*`

The main `tsconfig.json` excludes type tests from regular compilation.

## Why Type Tests?

1. **Catch Breaking Changes** - If someone modifies event types incorrectly, type tests will fail
2. **Documentation** - Shows correct and incorrect usage patterns
3. **Regression Prevention** - Prevents accidental loosening of type safety
4. **IntelliSense Verification** - Ensures IDE autocomplete works correctly

## Resources

- [TypeScript Deep Dive - Testing Types](https://basarat.gitbook.io/typescript/intro-1/testing)
- [@ts-expect-error documentation](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html#-ts-expect-error-comments)
- [Type Testing Best Practices](https://github.com/SamVerschueren/tsd)
