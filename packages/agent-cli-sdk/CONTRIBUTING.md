# Contributing to agent-cli-sdk-three

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Table of Contents
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Getting Started

Before contributing, please:
1. Check existing [issues](https://github.com/sourceborn/agent-cli-sdk-three/issues) for similar problems or features
2. Read through the [README.md](./README.md) to understand the project
3. Review the [MIGRATION.md](./MIGRATION.md) for architectural decisions

## Development Setup

### Prerequisites
- **Node.js**: >= 22.0.0
- **pnpm**: Latest version
- **Claude CLI** or **Codex CLI**: For running E2E tests

### Installation

```bash
# Clone the repository
git clone https://github.com/sourceborn/agent-cli-sdk-three.git
cd agent-cli-sdk-three

# Install dependencies
pnpm install

# Build the project
pnpm build
```

### Running Tests

```bash
# Run unit tests
pnpm test

# Run unit tests in watch mode
pnpm test:watch

# Run E2E tests (requires CLIs installed)
RUN_E2E_TESTS=true pnpm test:e2e

# Type checking
pnpm check-types

# Linting
pnpm lint
```

## Project Structure

```
src/
├── adapters/          # CLI adapter implementations
│   ├── claude/        # Claude CLI adapter
│   └── codex/         # Codex CLI adapter
├── client/            # High-level client API
│   ├── agent-client.ts
│   └── session.ts
├── core/              # Core abstractions
│   ├── base-adapter.ts
│   ├── errors.ts
│   └── interfaces.ts
├── types/             # TypeScript type definitions
└── utils/             # Shared utilities

tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
└── e2e/               # End-to-end tests
```

## Development Workflow

### Adding a New Feature

1. **Create an issue** describing the feature
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Implement the feature** following the existing patterns
4. **Add tests** for your changes
5. **Update documentation** if needed
6. **Run all checks**:
   ```bash
   pnpm check-types
   pnpm lint
   pnpm test
   ```
7. **Submit a pull request**

### Fixing a Bug

1. **Create an issue** describing the bug (if one doesn't exist)
2. **Create a branch**:
   ```bash
   git checkout -b fix/bug-description
   ```
3. **Write a failing test** that reproduces the bug
4. **Fix the bug** and ensure the test passes
5. **Run all checks**
6. **Submit a pull request**

### Adding a New CLI Adapter

To add support for a new AI CLI:

1. Create a new directory under `src/adapters/new-cli/`
2. Implement the following files:
   - `index.ts` - Adapter class extending BaseAdapter
   - `cli-detector.ts` - CLI detection logic
   - `cli-wrapper.ts` - CLI execution wrapper
   - `parser.ts` - Output parsing logic
   - `types.ts` - CLI-specific types
3. Add types to `src/types/`
4. Export the adapter from `src/index.ts`
5. Add comprehensive tests
6. Update README.md with usage examples

## Testing

### Test Organization

- **Unit tests**: Test individual functions and classes in isolation
- **Integration tests**: Test interactions between components
- **E2E tests**: Test full workflows with real CLIs

### Writing Tests

Use descriptive test names that explain what is being tested:

```typescript
describe('AgentClient', () => {
  it('should execute a simple prompt successfully', async () => {
    // Test implementation
  });

  it('should handle timeout errors gracefully', async () => {
    // Test implementation
  });
});
```

### E2E Test Requirements

E2E tests require actual CLI tools installed:
- Set `RUN_E2E_TESTS=true` to enable
- Tests will be skipped if CLIs are not available
- Use realistic but simple prompts
- Include timeout values to prevent hanging tests

## Code Style

### TypeScript Guidelines

- Use strict type checking (no `any` types)
- Prefer interfaces over type aliases for object shapes
- Use explicit return types for public methods
- Document public APIs with JSDoc comments

### Naming Conventions

- **Files**: kebab-case (`agent-client.ts`)
- **Classes**: PascalCase (`AgentClient`)
- **Functions**: camelCase (`createClaudeAdapter`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase (`ExecutionResponse`)
- **Types**: PascalCase (`SessionEventType`)

### Code Organization

- Keep files focused and under 300 lines when possible
- Extract complex logic into separate utility functions
- Group related functionality together
- Use barrel exports (`index.ts`) for clean imports

### Documentation

- Add JSDoc comments to all public APIs
- Include `@param`, `@returns`, and `@throws` tags
- Provide usage examples in JSDoc when helpful
- Keep comments concise and accurate

Example:
```typescript
/**
 * Execute a prompt using the configured adapter
 *
 * @param prompt - The prompt to send to the AI
 * @param options - Execution options including callbacks, timeouts, etc.
 * @returns Promise resolving to execution response with output and metadata
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
  options?: ExecuteOptions
): Promise<ExecutionResponse<T>>
```

## Submitting Changes

### Pull Request Process

1. **Update documentation** if you've changed APIs
2. **Add tests** for new functionality
3. **Run all checks** locally before submitting
4. **Write a clear PR description** explaining:
   - What changes were made
   - Why the changes were necessary
   - How to test the changes
5. **Link related issues** in the PR description
6. **Keep PRs focused** - one feature or fix per PR

### Commit Messages

Follow conventional commit format:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(codex): add timeout handling for CLI execution

fix(session): prevent race condition in abort()

docs(readme): update installation instructions
```

### Code Review

All submissions require review. Be patient and responsive to feedback:
- Address all comments
- Ask questions if feedback is unclear
- Make requested changes in new commits
- Don't force-push after review has started

## Reporting Issues

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS, CLI versions)
- Relevant error messages or logs

### Feature Requests

Include:
- Clear description of the proposed feature
- Use cases and motivation
- Possible implementation approach
- Potential drawbacks or alternatives

## Questions?

- Open a [discussion](https://github.com/sourceborn/agent-cli-sdk-three/discussions)
- Join our community chat (if available)
- Check existing issues and PRs

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see LICENSE file).

---

Thank you for contributing! 🎉
