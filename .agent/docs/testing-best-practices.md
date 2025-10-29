# Testing Best Practices

A quick guide focused on testing **behavior over implementation details** and avoiding over-mocking.

## Quick Reference

### ✅ DO

- Test behavior and observable outcomes
- Use Testing Library queries (`getByRole`, `getByLabelText`)
- Use real Prisma with test database (fast, accurate)
- Mock only slow external APIs and third-party services
- Reset state and database in `beforeEach`/`afterEach`
- Test edge cases and error conditions
- Use `userEvent` for realistic interactions
- Write descriptive test names: "should [behavior] when [condition]"

### ❌ DON'T

- Test internal implementation details
- Over-mock (utilities, business logic, internal functions)
- Use brittle selectors (CSS classes, DOM structure)
- Test third-party library behavior
- Access component state directly
- Write tests that break on refactoring

---

## Core Principle: Test Behavior, Not Implementation

**Bad - Testing Implementation:**

```typescript
it("should call setState with correct object", () => {
  const spy = vi.spyOn(component, "setState");
  component.handleClick();
  expect(spy).toHaveBeenCalledWith({ clicked: true });
});
```

**Good - Testing Behavior:**

```typescript
it('should show success message after click', () => {
  render(<Component />);
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByText('Success!')).toBeInTheDocument();
});
```

---

## Mocking Decision Tree

```bash
Should I mock this dependency?
│
├─ Is it Prisma/SQLite with test database?
│  └─ NO → Use real Prisma (fast, accurate tests)
│
├─ Is it an external API or slow service?
│  └─ YES → Mock it (fetch, external APIs)
│
├─ Is it a utility/business logic function?
│  └─ NO → Use real implementation
│
├─ Is it part of my component/module?
│  └─ NO → Use real implementation
│
└─ Does it have side effects I can't control?
   └─ YES → Mock it (timers, network, uncontrolled I/O)
```

**Examples:**

- ✅ Mock: fetch, external APIs, toast notifications, timers
- ❌ Don't Mock: Prisma (use real test database), formatDate(), validateEmail(), internal helpers
- ❌ Don't Mock: Zustand stores (use real, reset in beforeEach)

---

## Testing Recipes

### Recipe: Unit Tests (Public API)

Focus on inputs → outputs, not internal logic.

```typescript
describe("extractJSON", () => {
  it("should extract JSON from mixed text", () => {
    const text = 'Here is: {"status":"success"} and more';
    expect(extractJSON(text)).toEqual({ status: "success" });
  });

  it("should return null for invalid JSON", () => {
    expect(extractJSON("plain text")).toBeNull();
  });
});
```

**See:** `packages/agent-cli-sdk/src/utils/extractJson.test.ts`

---

### Recipe: React Components (User-Centric)

Test what users see and do, not React internals.

```typescript
it('should submit form with entered credentials', async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  render(<LoginForm onSubmit={onSubmit} />);

  // User types
  await user.type(screen.getByLabelText(/username/i), 'testuser');
  await user.type(screen.getByLabelText(/password/i), 'password123');

  // User submits
  await user.click(screen.getByRole('button', { name: /log in/i }));

  // Verify outcome
  expect(onSubmit).toHaveBeenCalledWith({
    username: 'testuser',
    password: 'password123',
  });
});
```

**Query Priority:**

1. `getByRole('button', { name: /submit/i })` - Best
2. `getByLabelText(/username/i)` - Good
3. `getByPlaceholderText('Enter name')` - OK
4. `getByTestId('submit-btn')` - Last resort

**See:** `apps/web/src/client/pages/chat/components/ChatPromptInput.test.tsx`

---

### Recipe: Fastify Handlers (Integration Style)

Use real dependencies including Prisma for accurate, fast tests.

```typescript
describe("syncProjectSessions", () => {
  beforeEach(async () => {
    // Setup real test data in database
    await prisma.project.create({
      data: {
        id: "test-id",
        name: "Test Project",
        path: testDir,
        userId: "user-id",
      },
    });
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup database and filesystem
    await prisma.project.deleteMany();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should sync sessions for valid project", async () => {
    // Create real files
    await fs.writeFile(
      path.join(testDir, "session.jsonl"),
      JSON.stringify({ /* ... */ })
    );

    // Test with real Prisma + filesystem
    const result = await syncProjectSessions("test-id", "user-id");

    // Verify database was updated
    const sessions = await prisma.session.findMany({
      where: { projectId: "test-id" },
    });
    expect(sessions).toHaveLength(1);
    expect(result.synced).toBe(1);
  });
});
```

**Pattern:**

- ✅ Real: Prisma (use test database), filesystem (with temp dirs), business logic
- ❌ Mock: External APIs (fetch, third-party services)

**Benefits of Real Prisma:**
- Tests actual database constraints and relationships
- Catches SQL errors and schema issues
- Fast (SQLite in-memory or file-based)
- No mock maintenance burden

**See:** `apps/web/src/server/services/agentSession.test.ts`

---

### Recipe: Zustand Stores

Use real store, reset state between tests.

```typescript
describe("SessionStore", () => {
  beforeEach(() => {
    // Reset to known state
    useSessionStore.setState({
      sessionId: null,
      session: null,
      messages: [],
    });
    vi.clearAllMocks();
  });

  it("should add message to store", () => {
    const { addMessage } = useSessionStore.getState();

    addMessage({
      id: "msg-1",
      role: "user",
      content: [{ type: "text", text: "Hello" }],
    });

    const { messages } = useSessionStore.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0].content[0].text).toBe("Hello");
  });
});
```

**See:** `apps/web/src/client/stores/sessionStore.test.ts`

---

### Recipe: Testing with Prisma (No Mocks!)

**Prefer real Prisma over mocks** - it's fast, catches real bugs, and eliminates mock maintenance.

```typescript
describe("ProjectService", () => {
  beforeEach(async () => {
    // Create test data with real Prisma
    await prisma.user.create({
      data: { id: "user-1", username: "testuser" },
    });
    await prisma.project.create({
      data: {
        id: "project-1",
        name: "Test Project",
        path: "/test/path",
        userId: "user-1",
      },
    });
  });

  afterEach(async () => {
    // Clean up in reverse order of foreign keys
    await prisma.session.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  });

  it("should create project and associate with user", async () => {
    const project = await createProject({
      name: "New Project",
      path: "/new/path",
      userId: "user-1",
    });

    // Verify with real database query
    const dbProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: { user: true },
    });

    expect(dbProject?.name).toBe("New Project");
    expect(dbProject?.user.username).toBe("testuser");
  });

  it("should enforce foreign key constraints", async () => {
    // Real Prisma will throw on constraint violations
    await expect(
      prisma.project.create({
        data: {
          id: "project-2",
          name: "Orphan Project",
          path: "/path",
          userId: "non-existent-user", // FK violation
        },
      })
    ).rejects.toThrow();
  });
});
```

**Why Real Prisma?**
- ✅ Validates schema constraints and relationships
- ✅ Tests actual SQL queries and indexes
- ✅ Fast (SQLite is in-memory or file-based)
- ✅ Zero mock setup/maintenance
- ✅ Catches Prisma API changes immediately

**When to Consider Mocking Prisma:**
- Only for component/UI tests where DB is far removed
- When testing error handling paths that are hard to reproduce
- Never for service layer or API handler tests

---

## Common Anti-Patterns

### ❌ Over-Mocking Everything

```typescript
// BAD - Mocking utilities that should be tested
vi.mock("./utils", () => ({
  formatDate: vi.fn(() => "2025-01-01"),
  validateEmail: vi.fn(() => true),
}));

// GOOD - Use real implementations
import { formatDate, validateEmail } from "./utils";
```

### ❌ Testing React Internals

```typescript
// BAD - Testing state
expect(wrapper.state("username")).toBe("");

// BAD - Testing component structure
expect(container.querySelector(".form-wrapper > div")).toBeInTheDocument();

// GOOD - Testing user-visible behavior
expect(screen.getByRole("textbox", { name: /username/i })).toHaveValue("");
```

### ❌ Testing Third-Party Libraries

```typescript
// BAD - Testing that React Router works
it('should call navigate when clicking link', () => {
  const navigate = vi.fn();
  // Testing library implementation
});

// GOOD - Testing your component's behavior
it('should show success page after submission', async () => {
  render(<MyForm />, { wrapper: RouterWrapper });
  await submitForm();
  expect(screen.getByText('Success!')).toBeInTheDocument();
});
```

---

## Edge Cases & Error Handling

Always test:

- ✅ Happy path (expected input → expected output)
- ✅ Empty/null/undefined inputs
- ✅ Malformed data
- ✅ Error conditions (404, 500, network failures)
- ✅ Boundary conditions (limits, edge values)

**Example:**

```typescript
describe("parseJSONLFile", () => {
  it("should parse valid JSONL file", async () => {
    /* ... */
  });
  it("should handle malformed JSON lines gracefully", async () => {
    /* ... */
  });
  it("should handle empty files", async () => {
    /* ... */
  });
  it("should throw on file read errors", async () => {
    await expect(parseJSONLFile("non-existent.jsonl")).rejects.toThrow(
      "Failed to parse"
    );
  });
});
```

---

## Project-Specific Notes

### Tech Stack

- **Test Runner:** Vitest
- **React Testing:** @testing-library/react + @testing-library/user-event
- **Environment:** happy-dom (client), node (server)
- **Assertions:** expect + @testing-library/jest-dom matchers

### Test Organization

- **Co-located:** `component.tsx` → `component.test.tsx` (same directory)
- **Naming:** `*.test.ts` or `*.spec.ts`
- **E2E:** Separate files with longer timeouts

### Running Tests

```bash
pnpm test              # All tests
pnpm test:watch        # Watch mode
cd packages/agent-cli-sdk && pnpm test    # Specific package
pnpm vitest run src/path/to/file.test.ts  # Single file
```

---

## Summary

**The Golden Rule:** If your test breaks when you refactor (without changing behavior), you're testing implementation details.

**Good tests:**

- Survive refactoring
- Test what users/consumers see
- Are easy to understand
- Give confidence when passing

**Bad tests:**

- Break on every refactor
- Test internal mechanics
- Are hard to maintain
- Give false confidence
