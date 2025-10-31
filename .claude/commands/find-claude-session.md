---
description: Find Claude sessions by searching content and return resume command
argument-hint: [search-description, project-path (optional)]
---

# Find Claude Session

Search through Claude Code session files to find specific sessions based on their content (messages, tool uses, file paths). Returns the command to resume the found session.

## Variables

- $search-description: $1 (required) - Description of what you're looking for (e.g., "sessions working on authentication", "sessions that edited config.ts", "sessions using WebSocket")
- $project-path: $2 (optional) - Specific project path to search within. If not provided, searches all projects in `/Users/jnarowski/.claude/projects`

## Instructions

- Search through `.jsonl` session files in the Claude projects directory
- Match against message content, tool uses, file paths, and text blocks
- Use fuzzy/semantic matching - don't require exact keywords
- Parse JSONL format correctly (one JSON object per line)
- Extract relevant context snippets showing why each session matched
- If multiple matches found, show top 5 with context
- Return the full resume command: `claude --resume <session-id> --project <project-path>`

## Workflow

1. **Determine search scope**
   - If $project-path provided, search in: `/Users/jnarowski/.claude/projects/<project-directory>/*.jsonl`
   - Project directory format: `-Users-jnarowski-Dev-sourceborn-src-agent-workflows-monorepo-v2` (path with slashes replaced by dashes)
   - Otherwise, search all: `/Users/jnarowski/.claude/projects/*/*.jsonl`

2. **Search session files using Python**
   - Use Python to parse JSONL properly and avoid false positives
   - **CRITICAL: Skip these metadata fields** (they cause false matches):
     - `sessionId`, `gitBranch`, `cwd`, `version`, `parentUuid`, `isSidechain`, `userType`
     - Any field at the root level of the JSON object
   - **ONLY search in these fields**:
     - `message.content` (array of content blocks)
     - Inside `message.content[]`: look for `type: "text"` with `text` field
     - Inside `message.content[]`: look for `type: "tool_use"` with `name` and `input` fields
     - Inside `message.content[]`: look for `type: "tool_result"` with `content` field

3. **Implementation: Use this Python script**

```python
import json
import os
import re
from datetime import datetime
from collections import defaultdict

# Parse search keywords
search_terms = "$search-description".lower().split()
project_path = "$project-path" if "$project-path" else None

# Determine session directory
if project_path:
    # Convert path to Claude's directory format
    project_dir = project_path.replace('/', '-')
    sessions_dir = f"/Users/jnarowski/.claude/projects/{project_dir}"
else:
    sessions_dir = "/Users/jnarowski/.claude/projects/-Users-jnarowski-Dev-sourceborn-src-agent-workflows-monorepo-v2"

# Find all JSONL files
session_files = [f for f in os.listdir(sessions_dir) if f.endswith('.jsonl')]

results = []

for session_file in session_files:
    session_id = session_file.replace('.jsonl', '')
    filepath = os.path.join(sessions_dir, session_file)

    matches = []
    files_mentioned = set()
    tool_uses = set()
    score = 0

    try:
        with open(filepath, 'r') as f:
            for line in f:
                if not line.strip():
                    continue

                try:
                    msg = json.loads(line)

                    # ONLY search in message.content (not metadata)
                    if 'message' in msg and 'content' in msg['message']:
                        content = msg['message']['content']

                        # Handle string content
                        if isinstance(content, str):
                            content_lower = content.lower()
                            if any(term in content_lower for term in search_terms):
                                matches.append(content[:200])
                                score += sum(1 for term in search_terms if term in content_lower)

                        # Handle array content (proper format)
                        elif isinstance(content, list):
                            for block in content:
                                if not isinstance(block, dict):
                                    continue

                                # Text blocks
                                if block.get('type') == 'text' and 'text' in block:
                                    text = block['text'].lower()
                                    if any(term in text for term in search_terms):
                                        matches.append(block['text'][:200])
                                        score += sum(1 for term in search_terms if term in text)

                                # Tool use blocks
                                elif block.get('type') == 'tool_use':
                                    tool_name = block.get('name', '')
                                    tool_input = json.dumps(block.get('input', {})).lower()

                                    if any(term in tool_name.lower() for term in search_terms):
                                        tool_uses.add(tool_name)
                                        score += 2  # Tool uses are more relevant

                                    if any(term in tool_input for term in search_terms):
                                        matches.append(f"Tool: {tool_name}")
                                        score += 1

                                    # Extract file paths
                                    if 'file_path' in block.get('input', {}):
                                        files_mentioned.add(block['input']['file_path'])

                                # Tool result blocks
                                elif block.get('type') == 'tool_result':
                                    result_content = str(block.get('content', '')).lower()
                                    if any(term in result_content for term in search_terms):
                                        matches.append("Tool result matched")
                                        score += 0.5

                except json.JSONDecodeError:
                    continue

        if score > 0:
            mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
            results.append({
                'session_id': session_id,
                'score': score,
                'matches': matches[:3],
                'files': list(files_mentioned)[:5],
                'tools': list(tool_uses),
                'date': mtime
            })

    except Exception as e:
        continue

# Sort by score (descending) and date (descending)
results.sort(key=lambda x: (x['score'], x['date']), reverse=True)

# Display top 5 results
print(f"\nSearched {len(session_files)} sessions for \"{' '.join(search_terms)}\"\n")

if not results:
    print("No sessions found matching your search.")
    print("\nTry:")
    print("- Using different keywords")
    print("- Broadening your search terms")
    print("- Checking if the sessions exist in this project")
else:
    print(f"Found {len(results)} matching session(s):\n")

    for i, result in enumerate(results[:5], 1):
        relevance = "High" if result['score'] >= 3 else "Medium" if result['score'] >= 1 else "Low"

        print(f"{i}. Session: {result['session_id']}")
        print(f"   Date: {result['date'].strftime('%b %d, %Y at %I:%M %p')}")
        print(f"   Relevance: {relevance} (score: {result['score']})")

        if result['matches']:
            print(f"\n   Context:")
            for match in result['matches']:
                snippet = match.replace('\n', ' ')[:150]
                print(f"   - {snippet}...")

        if result['files']:
            print(f"\n   Files: {', '.join(result['files'])}")

        if result['tools']:
            print(f"   Tools: {', '.join(result['tools'])}")

        print(f"\n   Resume: claude --resume {result['session_id']} --project {project_path or '/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2'}")
        print()
```

4. **Execute the search**
   - Run the Python script above with the search parameters
   - Display results in the specified format
   - Provide resume commands for top matches

## Search Strategy

**High-value signals** (boost relevance):
- Tool uses matching search terms (e.g., searching "Edit tool" finds sessions with Edit tool uses)
- File paths matching search terms (e.g., "config.ts" finds sessions that touched that file)
- Recent activity (sessions from today/this week rank higher)
- Multiple matches in same session (repeated mentions = more relevant)

**Content to search**:
- `tool_use` blocks: tool name, input parameters
- `text` blocks: message content
- `tool_result` blocks: output content
- File paths in any field
- Thinking blocks (if present)

**Example searches**:
- "authentication" → finds sessions mentioning auth, login, JWT, etc.
- "WebSocket refactor" → finds sessions with WebSocket-related edits
- "prisma migration" → finds sessions using Prisma commands or editing schema

## Output Format

Display results like this:

```
Found 3 matching sessions for "$search-description":

1. Session: abc123def (2 days ago)
   Project: /Users/jnarowski/Dev/project-name
   Relevance: High

   Context:
   - Used Edit tool on src/auth/login.ts
   - Message: "Let's refactor the authentication flow..."
   - Modified: auth.ts, jwt.ts, middleware.ts

   Resume: claude --resume abc123def --project /Users/jnarowski/Dev/project-name

2. Session: xyz789ghi (1 week ago)
   Project: /Users/jnarowski/Dev/other-project
   Relevance: Medium

   Context:
   - Used Bash tool: "npm run test:auth"
   - Message: "Fixing authentication bug in login handler"

   Resume: claude --resume xyz789ghi --project /Users/jnarowski/Dev/other-project

---

Which session would you like to resume?
```

## Edge Cases

- **No matches found**: Report that no sessions matched the search and suggest broadening search terms
- **Session file corrupted**: Skip invalid JSONL files and log warning
- **Permission issues**: Report if unable to read session directories
- **Empty search**: Prompt user to provide a search description

## Report

After searching:
- Report number of sessions searched
- Display top 5 matches with context snippets
- Provide exact resume commands for each match
- If no matches, suggest alternative search terms or list recent sessions
