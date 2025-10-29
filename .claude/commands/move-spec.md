---
description: Move a spec file between workflow folders (todo/done)
argument-hint: [specNameOrPath, targetFolder]
---

# Move Spec

Move a spec file between workflow folders (todo/done) and optionally update its status field.

## Variables

- $specNameOrPath: $1 (required) - Spec name (e.g., "17" or "auth-improvements") or full path (e.g., `.agent/specs/todo/17-auth-improvements-spec.md`)
- $targetFolder: $2 (required) - Target workflow folder: "todo" or "done"

## Instructions

- Search for the spec file in all locations (todo/, done/, root)
- Move the file to the target folder
- Optionally update the Status field in the spec's front matter if appropriate
- Report the old and new paths

## Workflow

1. **Find the Spec File**

   - If $specNameOrPath is a full path, use it directly
   - Otherwise, search in this order:
     1. `.agent/specs/todo/${specNameOrPath}*-spec.md`
     2. `.agent/specs/done/${specNameOrPath}*-spec.md`
     3. `.agent/specs/${specNameOrPath}*-spec.md` (legacy)
   - If multiple matches found, list them and ask user to specify
   - If no matches found, report error and exit

2. **Validate Target Folder**

   - Ensure $targetFolder is either "todo" or "done"
   - If invalid, report error and exit

3. **Check for Conflicts**

   - Check if a file with the same name already exists in target folder
   - If conflict exists, report error and exit

4. **Move the File**

   - Move file from current location to `.agent/specs/${targetFolder}/[filename]`
   - Preserve the original filename

5. **Update Status Field (Optional)**

   - Read the spec file content
   - If moving to "done" folder:
     - Update Status field to "completed" (if present)
   - If moving to "todo" folder:
     - Update Status field to "ready" (if present and currently "completed")
   - Only update if Status field exists in the file

6. **Report Results**

   - Display old path
   - Display new path
   - Display status field update (if any)

## Examples

**Example 1: Move by spec number**
```bash
/move-spec 17 done
```
Finds `17-*-spec.md` in any folder and moves it to `done/`

**Example 2: Move by feature name**
```bash
/move-spec auth-improvements todo
```
Finds `*auth-improvements*-spec.md` and moves it to `todo/`

**Example 3: Move by full path**
```bash
/move-spec .agent/specs/todo/17-auth-improvements-spec.md done
```
Moves the specified file to `done/`

## Report

After successfully moving the spec:

```text
✓ Moved spec file

From: .agent/specs/todo/17-auth-improvements-spec.md
To:   .agent/specs/done/17-auth-improvements-spec.md

Status updated: ready → completed
```

If no status update:

```text
✓ Moved spec file

From: .agent/specs/todo/17-auth-improvements-spec.md
To:   .agent/specs/done/17-auth-improvements-spec.md

Status field: No changes (not present in spec)
```

## Error Handling

**Spec not found:**
```text
✗ Error: Could not find spec matching "auth-improvements"

Searched in:
- .agent/specs/todo/
- .agent/specs/done/
- .agent/specs/

Please check the spec name and try again.
```

**Multiple matches:**
```text
✗ Error: Multiple specs match "auth"

Found:
1. .agent/specs/todo/15-auth-improvements-spec.md
2. .agent/specs/done/10-auth-refactor-spec.md

Please specify the full spec number or feature name.
```

**Target conflict:**
```text
✗ Error: File already exists at target location

Target: .agent/specs/done/17-auth-improvements-spec.md

Please resolve the conflict manually or use a different target folder.
```
