# Feature: Revamp pnpm Install Process

## What We're Building

Optimize the monorepo's `pnpm install` process by removing unnecessary build steps that slow down dependency installation. Currently, workspace packages build TypeScript on every install, which is slow and unnecessary for local development. This change will make `pnpm install` ~80% faster while maintaining correctness for Prisma generation and npm publishing workflows.

## User Story

As a developer working on this monorepo
I want `pnpm install` to complete quickly without building packages
So that I can get started faster and avoid waiting for unnecessary TypeScript compilations during dependency installation

## Technical Approach

Replace `prepare` lifecycle hooks with `prepublishOnly` hooks in workspace packages. The `prepare` script runs after every `pnpm install`, while `prepublishOnly` only runs before publishing to npm. We'll keep the Prisma generation in apps/web since it's legitimately required for TypeScript types. Builds will happen on-demand via Turborepo's dependency tracking when explicitly requested.

We'll also improve the setup-env.js script to be more robust with better error handling, regex-based replacements, and clearer user feedback.

## Files to Touch

### Existing Files

- `packages/agent-cli-sdk/package.json` - Replace `prepare` with `prepublishOnly` for build
- `packages/agent-workflows/package.json` - Remove `prepare` script (already handled in ship script)
- `apps/web/scripts/setup-env.js` - Improve robustness and error handling
- `turbo.json` - Fix output paths and add explicit caching configuration
- `README.md` - Add comprehensive developer onboarding section

### New Files

None - all changes are to existing files

## Implementation Plan

### Phase 1: Foundation

Update package.json lifecycle scripts to use the correct npm hooks. Remove prepare scripts from packages that don't need them, ensuring builds only happen when explicitly requested or during publishing.

### Phase 2: Core Implementation

Improve the setup-env.js script with better error handling, regex-based string replacement for robustness, and processing of all placeholder values (not just JWT_SECRET). Update Turborepo configuration to properly cache builds with correct output paths.

### Phase 3: Integration

Add comprehensive developer documentation to README.md explaining the new workflow, when builds happen, and troubleshooting common issues. Verify the entire flow works correctly from clean checkout.

## Step by Step Tasks

### 1: Update Package Lifecycle Hooks

<!-- prettier-ignore -->
- [ ] Update agent-cli-sdk prepare script
        - File: `packages/agent-cli-sdk/package.json`
        - Change: Remove `"prepare": "pnpm build"` line (line 16)
        - Add: `"prepublishOnly": "pnpm build"` after the build script
        - This ensures builds only happen before publishing, not on every install

- [ ] Update agent-workflows prepare script
        - File: `packages/agent-workflows/package.json`
        - Change: Remove `"prepare": "pnpm build"` line (line 24)
        - Note: The ship script already handles building before publish
        - This avoids duplicate build steps

- [ ] Verify apps/web prepare script is correct
        - File: `apps/web/package.json`
        - Verify: `"prepare": "prisma generate && node scripts/setup-env.js"` exists on line 16
        - This is CORRECT and should NOT be changed - Prisma needs this

#### Completion Notes

### 2: Improve setup-env.js Script

<!-- prettier-ignore -->
- [ ] Add better error handling and validation
        - File: `apps/web/scripts/setup-env.js`
        - Replace entire file content with improved version
        - Add: Helper function `generateSecret()` for code reuse
        - Add: Helper function `processEnvTemplate()` using regex replacements
        - Add: Exit with error code 1 if .env.example is missing
        - Add: Clearer console messages for all code paths

- [ ] Use regex-based string replacement
        - File: `apps/web/scripts/setup-env.js` (same file as above)
        - Replace hardcoded string match with `/^JWT_SECRET=.*$/m` regex
        - Add replacement for ANTHROPIC_API_KEY placeholder with helpful comment
        - More robust against future .env.example changes

- [ ] Add informative user feedback
        - File: `apps/web/scripts/setup-env.js` (same file as above)
        - When .env exists: Log "ℹ️  .env already exists, skipping setup"
        - When .env missing: Log creation message and reminder about ANTHROPIC_API_KEY
        - When .env.example missing: Error with clear message

#### Completion Notes

### 3: Update Turborepo Configuration

<!-- prettier-ignore -->
- [ ] Fix build output paths in turbo.json
        - File: `turbo.json`
        - Update `outputs` in build task from `[".next/**", "!.next/cache/**"]`
        - To: `["dist/**", ".next/**", "!.next/cache/**"]`
        - Reason: Your packages output to dist/, not .next/ (Next.js)

- [ ] Add explicit cache configuration
        - File: `turbo.json`
        - Add `"cache": true` to build task
        - Add `"outputs": []` to lint and check-types tasks
        - Add `"outputs": ["coverage/**"]` to test task (if exists)
        - Ensures proper Turborepo caching behavior

- [ ] Add task dependencies
        - File: `turbo.json`
        - Add `"dependsOn": ["^build"]` to lint task
        - Add `"dependsOn": ["^build"]` to check-types task
        - Ensures packages are built before linting/type-checking

#### Completion Notes

### 4: Add Developer Documentation

<!-- prettier-ignore -->
- [ ] Add Getting Started section to README
        - File: `README.md`
        - Add section after project description
        - Include: First-time setup steps (clone, install, configure, database, build, dev)
        - Include: Step-by-step commands with explanations
        - Use numbered list for clarity

- [ ] Add Development Workflow section
        - File: `README.md`
        - Add after Getting Started section
        - Document common commands: install, build (all/specific), clean build
        - Keep it concise and practical

- [ ] Add "When Do Builds Happen?" section
        - File: `README.md`
        - Add after Development Workflow
        - Use ✅ for when builds DO happen
        - Use ❌ for when builds DON'T happen
        - Explain: explicit builds, dev mode, publishing, Prisma
        - Clarify: NOT during install (except Prisma)

#### Completion Notes

### 5: Testing and Validation

<!-- prettier-ignore -->
- [ ] Test clean install flow
        - Remove node_modules and all dist folders
        - Run `pnpm install` and verify it completes quickly
        - Verify no TypeScript builds occur (except Prisma)
        - Verify .env file is created with secure JWT_SECRET

- [ ] Test build flow
        - Run `pnpm build` from root
        - Verify all packages build successfully
        - Verify Turborepo caching works on second build
        - Check dist/ folders exist in packages/

- [ ] Test development flow
        - Run `pnpm --filter web dev`
        - Verify server and client start successfully
        - Verify Prisma client is available
        - Check for any missing dependencies or type errors

- [ ] Test publishing flow (dry-run)
        - Navigate to packages/agent-cli-sdk
        - Run `pnpm publish --dry-run`
        - Verify prepublishOnly runs build
        - Verify build completes successfully

#### Completion Notes

## Acceptance Criteria

**Must Work:**

- [ ] `pnpm install` completes in under 30 seconds on clean checkout (vs 2+ minutes currently)
- [ ] Prisma client is generated during `pnpm install` (required for TypeScript types)
- [ ] `.env` file is auto-created with secure JWT_SECRET on first install
- [ ] `pnpm build` successfully builds all workspace packages
- [ ] Publishing packages triggers builds via prepublishOnly hook
- [ ] Turborepo caching works correctly for builds

**Should Not:**

- [ ] TypeScript packages should NOT build during `pnpm install`
- [ ] setup-env.js should NOT overwrite existing .env files
- [ ] Performance degradation in development workflow
- [ ] Break CI/CD pipelines (builds happen explicitly)
- [ ] Affect Prisma client generation or database workflow

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Clean state
rm -rf node_modules packages/*/node_modules apps/*/node_modules
rm -rf packages/*/dist apps/*/dist
rm apps/web/.env

# Test install (should be fast, no builds except Prisma)
time pnpm install
# Expected: Completes in ~30 seconds or less
# Expected: "prisma generate" in output
# Expected: ".env file created" message
# Expected: NO "tsdown" or TypeScript build output

# Verify .env was created
cat apps/web/.env | grep JWT_SECRET
# Expected: JWT_SECRET with base64 value (not placeholder)

# Build verification
pnpm build
# Expected: All packages build successfully
# Expected: dist/ folders created in packages/

# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors (or only warnings)

# Test Turbo caching (rebuild should be instant)
pnpm build
# Expected: All tasks cached, completes in <2 seconds
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: `http://localhost:5173`
3. Verify: Application loads without errors
4. Check console: No missing module errors
5. Test feature: Login/authentication works (uses JWT_SECRET)

**Feature-Specific Checks:**

- Clean checkout and run `pnpm install` - should complete quickly
- Check `packages/agent-cli-sdk/dist/` does NOT exist after install
- Check `packages/agent-workflows/dist/` does NOT exist after install
- Run `pnpm build` - dist folders should now exist
- Verify `apps/web/node_modules/.prisma/client/` exists after install (Prisma generated)
- Modify a source file and run `pnpm build` - only affected packages rebuild

## Definition of Done

- [ ] All tasks completed
- [ ] Tests passing (if any exist)
- [ ] Lint and Type Checks pass
- [ ] Manual testing confirms `pnpm install` is fast
- [ ] No console errors during development
- [ ] Code follows existing patterns
- [ ] README documentation is clear and accurate
- [ ] Publishing workflow still works (dry-run tested)
- [ ] Turborepo caching is functioning correctly
- [ ] Prisma generation still works correctly

## Notes

**Dependencies:**
- This change is backwards compatible with existing CI/CD pipelines that explicitly run `pnpm build`
- No external dependencies or tools required
- Works with existing pnpm workspace configuration

**Future Considerations:**
- Could add a postinstall script that reminds developers to run `pnpm build` on first checkout
- Consider adding a `pnpm setup` alias that runs install + build + migrate
- May want to add build verification to git pre-commit hooks

**Important Context:**
- Prisma's `prepare` script is **intentional and correct** - do NOT remove it
- The `prepare` script runs after `pnpm install` and before `pnpm publish`
- `prepublishOnly` only runs before `pnpm publish` (what we want for builds)
- Turborepo handles incremental builds and caching automatically
