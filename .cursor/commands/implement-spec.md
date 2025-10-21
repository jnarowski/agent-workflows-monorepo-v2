---
description: Implements a feature based on provided context or spec file
argument-hint: [specNameOrPath, format]
---

# Implement

Follow the `Workflow` steps in the exact order to implement the spec then `Report` the completed work.

## Variables

- $specNameOrPath: $1 (provide a spec name like "config-sync-cli" or a full file path `.agent/specs/config-sync-cli-spec.md`)
- $format: $2 (optional) - Output format: "text" or "json" (defaults to "text" if not provided)

## Instructions

- If $specNameOrPath is a file path set $spec_path to $specNameOrPath
- If $specNameOrPath is not a file path $spec_path to `.agent/specs/${feature-name}-spec.md`
- If $spec_path file is not present, stop IMMEDIATELY and let the user know that the file wasn't found and you cannot continue

## Task Tracking Requirements

**CRITICAL: You MUST track your progress in the spec file as you work. This is NOT optional.**

### What to Update

1. **Individual Tasks** - Check off IMMEDIATELY after completing each task:

   - Change `- [ ] 1.1 Task description` to `- [x] 1.1 Task description`
   - Do this AFTER finishing each task, NOT in batches
   - Never move to the next task without checking off the current one

2. **Completion Notes** - Fill in after finishing each task group/phase:
   - Each task group has a `#### Completion Notes` section
   - Write 2-4 bullet points with:
     - What was implemented
     - Any deviations from the plan
     - Important context for reviewers
     - Known issues or follow-ups

### Example of Good Progress Tracking

**Before starting task 1.1:**

```markdown
### 1: Project Initialization

- [ ] 1.1 Initialize Bun project
- [ ] 1.2 Configure package.json
```

**After completing task 1.1:**

```markdown
### 1: Project Initialization

- [x] 1.1 Initialize Bun project
- [ ] 1.2 Configure package.json
```

**After completing all tasks in group 1:**

```markdown
### 1: Project Initialization

- [x] 1.1 Initialize Bun project
- [x] 1.2 Configure package.json

#### Completion Notes

- Project initialized with Bun and TypeScript
- Used stricter tsconfig settings than spec suggested for better type safety
- All dependencies installed successfully
```

## Workflow

1. Read $spec_path file, think hard about the plan
2. Implement the plan, one phase at a time:
   - Work through tasks in order, top to bottom
   - **IMMEDIATELY check off each task** in $spec_path after completing it
   - Run validation after each logical step
3. After completing each task group/phase:
   - **Fill in the "Completion Notes" section** with implementation context
   - Include any deviations, decisions, or important notes for reviewers
4. Continue until all tasks are checked off and all completion notes are filled

## Report

### JSON

**IMPORTANT**: If $format is "json", return raw JSON output (no ```json code fences, no markdown):

```json
{
  "success": true,
  "spec_path": ".agent/specs/feature-name-spec.md",
  "feature_name": "feature-name",
  "total_tasks": 15,
  "completed_tasks": 15,
  "files_modified": 8,
  "files_created": 3,
  "total_lines_changed": 450,
  "lines_added": 320,
  "lines_removed": 130,
  "validation_passed": true,
  "git_diff_stat": "11 files changed, 450 insertions(+), 130 deletions(-)"
}
```

**JSON Field Descriptions:**

- `success`: Always true if implementation completed
- `spec_path`: Path to the spec file that was implemented
- `feature_name`: Normalized feature name (lowercase, hyphenated)
- `total_tasks`: Total number of tasks in the spec
- `completed_tasks`: Number of tasks completed (should equal total_tasks)
- `files_modified`: Number of existing files modified
- `files_created`: Number of new files created
- `total_lines_changed`: Total lines added + removed
- `lines_added`: Number of lines added
- `lines_removed`: Number of lines removed
- `validation_passed`: True if all validation steps passed
- `git_diff_stat`: Output from git diff --stat

### Text

Otherwise, provide this human-readable information to the user:

- Summarize the work you've just done in a concise bullet point list.
- Report the files and total lines changed with `git diff --stat`
