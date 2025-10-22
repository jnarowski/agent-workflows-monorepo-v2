# Feature: Slash Command Menu

## What We're Building

A "/" trigger menu for slash commands, similar to the existing "@" file picker. The menu displays both default Claude Code built-in commands (23 total) and project-specific custom commands loaded from `.claude/commands/**/*.md` with full namespace support using colon-separated paths (e.g., `/e2e:chat`, `/backend:api:users`). Users can search, select, and insert commands at the beginning of the textarea with argument hints displayed inline.

## User Story

As a chat user
I want to quickly insert slash commands by typing "/" and searching
So that I can efficiently use both built-in Claude Code commands and project-specific custom commands without memorizing command names

## Technical Approach

Following the file-picker pattern: Create a new API endpoint to recursively scan `.claude/commands/**/*.md` from the currently selected project's root path, parse YAML frontmatter using gray-matter to extract descriptions and argument hints, construct namespaced command names from folder structure (folder/subfolder/file.md → /folder:subfolder:file), and merge with hardcoded default commands. Use same Popover + Command UI pattern as file picker with Fuse.js fuzzy search. ChatPromptInput detects "/" trigger using useParams to get projectId, manages separate state for slash menu alongside existing @ menu, and inserts selected command at position 0 while moving existing text after it.

## Files to Touch

### Existing Files

- `apps/web/src/client/components/chat/ChatPromptInput.tsx` - Add "/" trigger detection, slash menu state management, extract projectId via useParams
- `apps/web/src/server/index.ts` - Register new slash-commands routes
- `apps/web/package.json` - Add gray-matter dependency for frontmatter parsing

### New Files

- `apps/web/src/shared/types/slash-command.types.ts` - TypeScript interfaces for SlashCommand
- `apps/web/src/server/services/slash-command.service.ts` - Recursive scanning, namespace construction, frontmatter parsing
- `apps/web/src/server/routes/slash-commands.ts` - API route handler for GET /api/projects/:id/slash-commands
- `apps/web/src/server/schemas/slash-command.schema.ts` - Zod validation schemas
- `apps/web/src/client/lib/slashCommandUtils.ts` - Default command list (23 built-in commands), utility functions
- `apps/web/src/client/lib/slashCommandUtils.test.ts` - Unit tests for utilities
- `apps/web/src/client/hooks/useSlashCommands.ts` - React Query hook to fetch commands
- `apps/web/src/client/components/chat/ChatPromptInputSlashCommands.tsx` - Slash command menu Popover UI

## Implementation Plan

### Phase 1: Foundation

Install gray-matter dependency. Create shared TypeScript types for SlashCommand interface. Build server-side service to recursively scan project's `.claude/commands/**/*.md` directory, parse frontmatter, construct namespaced command names from folder paths using colon separators. Create list of 23 default Claude Code built-in commands. Write comprehensive unit tests for namespace construction logic.

### Phase 2: Core Implementation

Create API endpoint GET /api/projects/:id/slash-commands that loads project from database, scans commands directory, returns merged default + custom commands. Build React Query hook to fetch commands. Create ChatPromptInputSlashCommands component with Popover, search input, and command list using Fuse.js for fuzzy filtering. Display commands in two sections (Built-in vs Project) with argument hints.

### Phase 3: Integration

Update ChatPromptInput to use useParams for projectId extraction, add isSlashMenuOpen state, detect "/" trigger in handleTextChange. Implement command insertion logic (position 0, move existing text after). Test dual menu behavior (@ for files, / for commands). Manual testing with nested folder structures and namespaced commands.

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### 1: Install Dependencies

<!-- prettier-ignore -->
- [ ] 1.1 Install gray-matter for frontmatter parsing
        - Run: `cd apps/web && pnpm add gray-matter`
        - Expected: gray-matter added to package.json dependencies
        - Note: gray-matter is the standard library for parsing YAML frontmatter from markdown files

#### Completion Notes

### 2: Create Shared Types

<!-- prettier-ignore -->
- [ ] 2.1 Create slash-command.types.ts with TypeScript interfaces
        - File: `apps/web/src/shared/types/slash-command.types.ts`
        - Define `SlashCommand` interface with: name (string), fullCommand (string), description (string), argumentHint (optional string), type ('builtin' | 'custom')
        - Export all types for use in client and server

#### Completion Notes

### 3: Create Default Commands List

<!-- prettier-ignore -->
- [ ] 3.1 Create slashCommandUtils.ts with default commands
        - File: `apps/web/src/client/lib/slashCommandUtils.ts`
        - Define array of 23 default built-in Claude Code commands
        - Commands: /add-dir, /agents, /bug, /clear, /compact, /config, /cost, /doctor, /help, /init, /login, /logout, /mcp, /memory, /model, /permissions, /pr_comments, /review, /sandbox, /rewind, /status, /terminal-setup, /usage, /vim
        - Each command object should have: name, fullCommand (with /), description, type: 'builtin'
        - Export as `DEFAULT_SLASH_COMMANDS` constant

#### Completion Notes

### 4: Create Server Service for Command Scanning

<!-- prettier-ignore -->
- [ ] 4.1 Create slash-command.service.ts
        - File: `apps/web/src/server/services/slash-command.service.ts`
        - Import gray-matter, fs/promises, path
        - Import SlashCommand type from @/shared/types/slash-command.types
- [ ] 4.2 Implement getProjectSlashCommands function
        - Accept projectId parameter (string)
        - Look up project from database using Prisma
        - Get project.path (absolute filesystem path)
        - Construct commands directory path: `${project.path}/.claude/commands`
        - Check if directory exists using fs.stat (return empty array if not)
        - Call recursive scanning helper function
        - Return array of SlashCommand objects
- [ ] 4.3 Implement recursive directory scanning
        - Create helper function: scanCommandsDirectory(baseDir: string, currentDir: string, relativePath: string = '')
        - Use fs.readdir with { withFileTypes: true }
        - For each entry:
          - If directory: recursively scan with updated relativePath
          - If .md file: parse and extract command
        - Return flattened array of commands
- [ ] 4.4 Implement namespace construction from path
        - Create helper: constructCommandName(relativePath: string, filename: string)
        - Example: relativePath="e2e/another", filename="chat.md"
        - Split relativePath by path separator, filter empty strings
        - Remove .md extension from filename
        - Join path parts + filename with colon: "e2e:another:chat"
        - Return with leading slash: "/e2e:another:chat"
        - Handle root-level files (no namespace): just "/filename"
- [ ] 4.5 Implement frontmatter parsing
        - Use gray-matter to parse each .md file
        - Extract: data.description (required), data['argument-hint'] (optional)
        - Construct SlashCommand object with: name (without /), fullCommand (with /), description, argumentHint, type: 'custom'
        - Handle missing description gracefully (use empty string or skip file)
- [ ] 4.6 Add error handling
        - Wrap file operations in try-catch
        - Log errors but don't throw (return partial results)
        - Handle permission errors, malformed YAML
        - Return empty array on critical errors

#### Completion Notes

### 5: Create API Route Handler

<!-- prettier-ignore -->
- [ ] 5.1 Create slash-command.schema.ts for validation
        - File: `apps/web/src/server/schemas/slash-command.schema.ts`
        - Define Zod schema for params: z.object({ id: z.string() })
        - Export as slashCommandParamsSchema
- [ ] 5.2 Create slash-commands.ts route
        - File: `apps/web/src/server/routes/slash-commands.ts`
        - Import FastifyPluginAsync from fastify
        - Import getProjectSlashCommands from service
        - Import slashCommandParamsSchema
- [ ] 5.3 Implement GET /api/projects/:id/slash-commands endpoint
        - Validate params using slashCommandParamsSchema
        - Extract projectId from params
        - Call getProjectSlashCommands(projectId)
        - Return JSON array of SlashCommand objects
        - Add error handling with appropriate status codes (404 if project not found, 500 for server errors)
        - Export as FastifyPluginAsync

#### Completion Notes

### 6: Register Routes

<!-- prettier-ignore -->
- [ ] 6.1 Register slash-commands routes in server
        - File: `apps/web/src/server/index.ts`
        - Import slashCommandsRoutes from @/server/routes/slash-commands
        - Register with: server.register(slashCommandsRoutes)
        - Place after other route registrations (projects, auth, etc.)

#### Completion Notes

### 7: Create Client Hook

<!-- prettier-ignore -->
- [ ] 7.1 Create useSlashCommands.ts hook
        - File: `apps/web/src/client/hooks/useSlashCommands.ts`
        - Import useQuery from @tanstack/react-query
        - Import SlashCommand type
        - Import DEFAULT_SLASH_COMMANDS from @/client/lib/slashCommandUtils
- [ ] 7.2 Implement useSlashCommands hook
        - Accept projectId parameter (string | undefined)
        - Define query key: ['slash-commands', projectId]
        - Define queryFn: fetch `/api/projects/${projectId}/slash-commands`
        - Parse JSON response
        - Merge: [...DEFAULT_SLASH_COMMANDS, ...customCommands]
        - Return useQuery result with merged commands
        - Set enabled: !!projectId (only run when projectId exists)
- [ ] 7.3 Add error handling and loading states
        - Handle fetch errors gracefully
        - Return default commands even if API fails
        - Provide isLoading, isError states from React Query

#### Completion Notes

### 8: Create Slash Command Menu Component

<!-- prettier-ignore -->
- [ ] 8.1 Create ChatPromptInputSlashCommands.tsx component
        - File: `apps/web/src/client/components/chat/ChatPromptInputSlashCommands.tsx`
        - Import Popover components from @/client/components/ui/popover
        - Import Command components (same as used in ChatPromptInputFiles)
        - Import useSlashCommands hook
        - Import Fuse from fuse.js
- [ ] 8.2 Define component props interface
        - projectId: string | undefined
        - open: boolean
        - onOpenChange: (open: boolean) => void
        - onCommandSelect: (command: string, argumentHint?: string) => void
- [ ] 8.3 Implement search and filtering
        - Add searchQuery state (string)
        - Use useSlashCommands(projectId) to fetch commands
        - Setup Fuse.js with keys: ['name', 'fullCommand', 'description'], threshold: 0.3
        - Filter commands based on searchQuery
        - Split into two arrays: builtinCommands (type: 'builtin'), customCommands (type: 'custom')
- [ ] 8.4 Build Popover UI structure
        - Popover with open and onOpenChange props
        - PopoverTrigger: Button with "/" icon and "Commands" label
        - PopoverContent with Command component wrapper
        - CommandInput for search (auto-focus when opened)
        - CommandList for results
- [ ] 8.5 Render "Built-in Commands" section
        - CommandGroup with heading="Built-in Commands"
        - Map over filtered builtinCommands
        - Render CommandItem for each with:
          - Full command name (e.g., "/compact")
          - Description in muted text
          - Argument hint (if exists) in smaller muted text below
          - onClick calls onCommandSelect(command.fullCommand, command.argumentHint)
- [ ] 8.6 Render "Project Commands" section
        - Only show if customCommands.length > 0
        - CommandSeparator before section
        - CommandGroup with heading="Project Commands"
        - Map over filtered customCommands
        - Render CommandItem with same structure as built-in
        - Highlight namespace portion (text before colons) in different color
- [ ] 8.7 Handle empty states
        - Show "No commands found" when filtered results are empty
        - Show loading skeleton when isLoading from useSlashCommands

#### Completion Notes

### 9: Integrate with ChatPromptInput

<!-- prettier-ignore -->
- [ ] 9.1 Add imports to ChatPromptInput.tsx
        - File: `apps/web/src/client/components/chat/ChatPromptInput.tsx`
        - Import useParams from react-router-dom
        - Import ChatPromptInputSlashCommands component
- [ ] 9.2 Extract projectId from URL
        - Add: const { id: projectId } = useParams<{ id: string }>()
        - Place near top of component
- [ ] 9.3 Add slash menu state
        - Add state: const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false)
        - This is separate from existing isAtMenuOpen state
- [ ] 9.4 Update handleTextChange to detect "/" trigger
        - In handleTextChange function, after @ detection logic
        - Check if newValue.endsWith("/")
        - If true: setIsSlashMenuOpen(true) and setText(newValue.slice(0, -1))
        - Keep existing @ detection logic unchanged
- [ ] 9.5 Create handleCommandSelect callback
        - Accept command: string, argumentHint?: string parameters
        - Insert command at position 0: setText(`${command} ${text}`)
        - Close menu: setIsSlashMenuOpen(false)
        - Optionally show argument hint in UI (tooltip or below textarea)
        - Refocus textarea
- [ ] 9.6 Render ChatPromptInputSlashCommands component
        - Place in PromptInputTools section (near ChatPromptInputFiles)
        - Pass props: projectId={projectId}, open={isSlashMenuOpen}, onOpenChange={setIsSlashMenuOpen}, onCommandSelect={handleCommandSelect}

#### Completion Notes

### 10: Write Unit Tests

<!-- prettier-ignore -->
- [ ] 10.1 Create slashCommandUtils.test.ts
        - File: `apps/web/src/client/lib/slashCommandUtils.test.ts`
        - Test: DEFAULT_SLASH_COMMANDS has 23 items
        - Test: All default commands have required fields
        - Test: All default commands have type: 'builtin'
        - Test: Command names don't have duplicates
- [ ] 10.2 Test namespace construction logic
        - Create test file for server service (if unit testable)
        - Test: Root-level file → /filename
        - Test: Single folder → /folder:filename
        - Test: Nested folders → /folder1:folder2:filename
        - Test: Handles .md extension removal correctly
        - Test: Handles empty relative paths
- [ ] 10.3 Run tests
        - Run: `cd apps/web && pnpm test slashCommandUtils.test.ts`
        - Expected: All tests pass

#### Completion Notes

### 11: Manual Testing and Polish

<!-- prettier-ignore -->
- [ ] 11.1 Test "/" trigger functionality
        - Start dev server: `cd apps/web && pnpm dev`
        - Navigate to project chat page
        - Type "/" in prompt
        - Verify menu opens with search focused
- [ ] 11.2 Test default commands display
        - Verify "Built-in Commands" section shows 23 commands
        - Verify commands like /help, /init, /model appear
        - Test fuzzy search filters correctly
- [ ] 11.3 Test custom commands loading
        - Navigate to project with .claude/commands/ directory
        - Verify "Project Commands" section appears
        - Verify custom commands from current project load
- [ ] 11.4 Test namespace construction
        - Create test structure: .claude/commands/e2e/chat.md
        - Verify command appears as /e2e:chat
        - Create nested: .claude/commands/e2e/another/test.md
        - Verify command appears as /e2e:another:test
- [ ] 11.5 Test command insertion
        - Select a command from menu
        - Verify it inserts at position 0 with trailing space
        - Type some text first, then select command
        - Verify existing text moves after command
        - Verify menu closes after selection
- [ ] 11.6 Test dual menu behavior
        - Type "@" and verify file picker opens
        - Close it, type "/" and verify command menu opens
        - Verify both menus work independently
- [ ] 11.7 Test edge cases
        - Project without .claude/commands/ directory (should show only built-in)
        - Empty .claude/commands/ directory (should show only built-in)
        - Malformed frontmatter in .md file (should skip gracefully)
        - No projectId in URL (menu should show only defaults or be disabled)
- [ ] 11.8 Test argument hints
        - Select command with argument-hint from frontmatter
        - Verify hint is displayed in UI
        - Verify it's shown as muted/secondary text

#### Completion Notes

## Acceptance Criteria

**Must Work:**

- [ ] Typing "/" in chat prompt opens slash command menu
- [ ] Menu displays all 23 default Claude Code built-in commands
- [ ] Menu displays custom commands from current project's `.claude/commands/**/*.md`
- [ ] Recursive scanning works for nested subdirectories
- [ ] Namespace construction follows format: /folder1:folder2:filename
- [ ] Root-level .md files create non-namespaced commands: /filename
- [ ] Fuzzy search filters commands as user types
- [ ] Clicking a command inserts it at position 0 of textarea
- [ ] Existing text moves after the inserted command
- [ ] Menu closes automatically after command selection
- [ ] Argument hints are extracted from frontmatter and displayed
- [ ] Both "@" file picker and "/" command menu work independently
- [ ] Projects without .claude/commands/ show only built-in commands (no errors)

**Should Not:**

- [ ] Break existing "@" file picker functionality
- [ ] Crash when .claude/commands/ directory doesn't exist
- [ ] Throw errors on malformed YAML frontmatter
- [ ] Show duplicate commands in list
- [ ] Insert commands without the leading "/"
- [ ] Keep menu open after command selection
- [ ] Cause performance issues with large numbers of custom commands
- [ ] Allow namespace collisions to break the UI

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
cd apps/web && pnpm build
# Expected: Clean build with no errors

# Type checking
cd ../.. && pnpm check-types
# Expected: No TypeScript errors

# Linting
cd apps/web && pnpm lint
# Expected: No linting errors

# Unit tests
cd apps/web && pnpm test slashCommandUtils.test.ts
# Expected: All tests pass (default commands list, namespace construction)
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Navigate to: `http://localhost:5173/projects/{project-id}/chat`
3. Type "/" in the chat prompt input
4. Verify: Menu opens with search input focused
5. Verify: "Built-in Commands" section shows 23 commands
6. Search: Type "help" and verify /help appears
7. Search: Type "comp" and verify /compact appears (fuzzy match)
8. Navigate to a project with `.claude/commands/` directory
9. Verify: "Project Commands" section appears
10. Verify: Custom commands load with correct names
11. Create test file: `.claude/commands/test/nested/example.md` with frontmatter
12. Reload and verify: Command appears as `/test:nested:example`
13. Click a command from menu
14. Verify: Command inserted at position 0 with trailing space
15. Type "some text" in textarea, then type "/" and select command
16. Verify: Command inserted first, "some text" moved after
17. Verify: Menu closes after selection
18. Type "@" and verify file picker still works
19. Check console: No errors or warnings

**Feature-Specific Checks:**

- Test with project that has no `.claude/commands/` directory: Should show only 23 built-in commands, no errors
- Test with empty `.claude/commands/` directory: Should show only built-in commands
- Test with deeply nested structure (3+ levels): Verify namespace construction works correctly
- Test with malformed YAML frontmatter in .md file: Should skip file gracefully without crashing
- Verify argument hints display correctly for commands that have them
- Test fuzzy search across command names and descriptions
- Verify namespace portions are visually distinct in custom commands
- Check that default commands list matches latest Claude Code version (as of October 2025)
- Verify both "/" and "@" triggers work in same textarea without conflicts
- Test rapid "/" typing: Menu should open/close smoothly without flickering

## Definition of Done

- [ ] All tasks completed in order
- [ ] gray-matter dependency installed
- [ ] Server service recursively scans .claude/commands/**/*.md
- [ ] Namespace construction works for nested folders (colon-separated)
- [ ] API endpoint returns merged default + custom commands
- [ ] React Query hook fetches and merges commands
- [ ] UI component displays two sections (Built-in + Project)
- [ ] Fuzzy search filters both sections
- [ ] "/" trigger detection works in ChatPromptInput
- [ ] Command insertion at position 0 works correctly
- [ ] Dual menu support (@ and /) works independently
- [ ] Unit tests pass
- [ ] Type checks pass with no errors
- [ ] Lint checks pass with no warnings
- [ ] Manual testing confirms all acceptance criteria
- [ ] No console errors during usage
- [ ] Code follows existing component patterns (matches file picker style)
- [ ] Edge cases handled (missing directory, malformed frontmatter, no projectId)

## Notes

- Uses existing `/api/projects/:id/files` pattern for consistency
- Reuses Fuse.js from file picker feature (already installed)
- gray-matter is industry standard for frontmatter parsing (3M+ downloads/week)
- Default command list should be updated periodically as Claude Code evolves
- Future consideration: Add keyboard shortcuts for command insertion (e.g., Ctrl+/)
- Future consideration: Show recently used commands at top
- Future consideration: Support MCP commands (dynamically loaded from /mcp__*)
- Future consideration: Allow editing custom commands from UI
- Namespace format matches Claude Code's official pattern: /plugin:command
- Security: File reading is scoped to project.path, same as existing file service
- Performance: Recursive scanning cached by React Query (5min default)
