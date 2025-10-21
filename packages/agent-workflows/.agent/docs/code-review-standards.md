# Code Review Standards

This file defines project-specific code review standards and deal-breakers. The `/review-spec-implementation` command uses these standards when auditing code.

## Deal-Breakers (HIGH Priority)

These issues **must** be fixed before code can be merged:

### Security

- No hardcoded secrets, API keys, or credentials in code
- No SQL injection vulnerabilities (use parameterized queries)
- No XSS vulnerabilities (sanitize user input)
- Authentication/authorization must be present on protected endpoints

### Functionality

- Code must not contain syntax errors or undefined variables
- All specified features must be implemented
- No data corruption or loss scenarios
- No infinite loops or memory leaks

### Critical Patterns

- **Error Handling**: All async operations must have try-catch blocks
- **Logging**: Use project logger (not console.log) for production code
- **Path Handling**: Use Node.js path utilities (not string concatenation)
- **Module System**: Use ESM imports (not CommonJS require) in ESM projects

## Code Quality Standards (MEDIUM Priority)

These issues should be fixed but won't block a merge if time-constrained:

### Testing

- New features should have test coverage
- Critical paths (auth, payments, data mutations) must have tests
- Tests should be meaningful, not just for coverage percentage

### Code Organization

- Functions should be under 50 lines
- Nesting should not exceed 3 levels
- Significant duplication (3+ instances) should be extracted
- Complex logic should have explanatory comments

### Type Safety

- Avoid `any` types when specific types are available
- Function parameters and return types should be typed
- Interfaces should be defined for data structures

### Edge Cases

- Handle null/undefined inputs
- Handle empty arrays and objects
- Validate user input
- Handle network failures gracefully

## Out of Scope (LOW Priority - Skip)

Do NOT flag these in reviews:

- Minor naming improvements
- Stylistic preferences (spacing, line breaks)
- Micro-optimizations without profiling data
- Variable ordering or grouping
- "Could add more comments" (unless code is incomprehensible)
- Theoretical future refactors

## Project-Specific Standards

Add your team's specific standards here:

### Example: TypeScript

- Strict mode must be enabled
- No implicit any
- Prefer interfaces over types for objects

### Example: Error Messages

- User-facing errors must be helpful (not "Error: undefined")
- Technical errors must include context for debugging

### Example: Database

- All queries must use connection pooling
- Migrations must be reversible
- No dropping columns without deprecation period

## Notes

- This file is read by `/review-spec-implementation` command
- Update this file when you discover new deal-breakers during code reviews
- Keep it concise - only document actual blockers, not preferences
