/**
 * Components showcase page - demonstrates DiffViewer component
 * This page is NOT behind login authentication
 */

import { DiffViewer } from "@/client/components/DiffViewer";

export default function Components() {
  // Example 1: EditToolBlock style - old/new string pairs (simple refactor)
  const editExample1 = {
    oldString: `export function calculateTotal(items: Item[]): number {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}`,
    newString: `export function calculateTotal(items: Item[]): number {
  return items.reduce((total, item) => total + item.price, 0);
}`,
    filePath: "src/utils/cart.ts",
  };

  // Example 1b: Real-world EditToolBlock example - import path fix
  const editExample2 = {
    oldString: `import { describe, it, expect, beforeAll } from "vitest";
import { z } from "zod";
import { AgentClient, createClaudeAdapter } from "../../src/index";
import { detectAndValidateClaudeCLI } from "../../src/adapters/claude/cli-detector";`,
    newString: `import { describe, it, expect, beforeAll } from "vitest";
import { z } from "zod";
import { AgentClient, createClaudeAdapter } from "../../src/index";
import { detectAndValidateClaudeCLI } from "../../src/claude/cli-detector";`,
    filePath:
      "packages/agent-cli-sdk/tests/e2e/structured-output.e2e.test.ts",
  };

  // Example 2: Git changes style - unified diff format
  const gitDiff = `diff --git a/apps/web/src/client/components/DiffViewer.tsx b/apps/web/src/client/components/DiffViewer.tsx
index 1234567..abcdefg 100644
--- a/apps/web/src/client/components/DiffViewer.tsx
+++ b/apps/web/src/client/components/DiffViewer.tsx
@@ -1,10 +1,12 @@
 /**
  * Unified diff viewer component
  * Displays diffs using Shiki's built-in diff language support
+ * Supports both pre-formatted git diff strings and old/new string pairs
  */

 import { useEffect, useState } from "react";
 import { createPatch } from "diff";
+import { codeToHtml, type BundledLanguage } from "shiki";

 interface DiffViewerProps {
   // Pre-formatted diff string (from git commands)`;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">DiffViewer Component</h1>
          <p className="text-muted-foreground">
            Showcasing the DiffViewer component with different usage patterns
          </p>
        </div>

        {/* Example 1a: EditToolBlock style - Simple refactor */}
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">
              Example 1a: EditToolBlock Style - Code Refactor
            </h2>
            <p className="text-sm text-muted-foreground">
              Used in AI edit operations - pass old/new string pairs to generate
              inline diff
            </p>
            <div className="bg-muted/30 rounded-lg p-4 font-mono text-xs">
              <div className="text-muted-foreground mb-2">Usage:</div>
              <pre className="text-foreground">
                {`<DiffViewer
  oldString={oldCode}
  newString={newCode}
  filePath="src/utils/cart.ts"
/>`}
              </pre>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <span className="text-xs font-mono">
                {editExample1.filePath}
              </span>
            </div>
            <div className="p-4 bg-card">
              <DiffViewer
                oldString={editExample1.oldString}
                newString={editExample1.newString}
                filePath={editExample1.filePath}
              />
            </div>
          </div>
        </section>

        {/* Example 1b: EditToolBlock style - Import path fix */}
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">
              Example 1b: EditToolBlock Style - Import Path Fix
            </h2>
            <p className="text-sm text-muted-foreground">
              Real-world example from an actual AI edit operation - fixing an
              incorrect import path
            </p>
            <div className="bg-muted/30 rounded-lg p-4 font-mono text-xs">
              <div className="text-muted-foreground mb-2">
                From actual tool use:
              </div>
              <pre className="text-foreground overflow-x-auto">
                {`{
  "type": "tool_use",
  "name": "Edit",
  "input": {
    "file_path": "...",
    "old_string": "import { detectAndValidateClaudeCLI } from \\"../../src/adapters/claude/cli-detector\\";",
    "new_string": "import { detectAndValidateClaudeCLI } from \\"../../src/claude/cli-detector\\";"
  }
}`}
              </pre>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <span className="text-xs font-mono">
                {editExample2.filePath}
              </span>
            </div>
            <div className="p-4 bg-card">
              <DiffViewer
                oldString={editExample2.oldString}
                newString={editExample2.newString}
                filePath={editExample2.filePath}
              />
            </div>
          </div>
        </section>

        {/* Example 2: Git changes style */}
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">
              Example 2: Git Changes Style
            </h2>
            <p className="text-sm text-muted-foreground">
              Used in source control view - pass unified diff format from git
              commands
            </p>
            <div className="bg-muted/30 rounded-lg p-4 font-mono text-xs">
              <div className="text-muted-foreground mb-2">Usage:</div>
              <pre className="text-foreground">
                {`<DiffViewer
  diff={gitDiffString}
  showHeaders={true}
/>`}
              </pre>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <span className="text-xs font-mono">
                apps/web/src/client/components/DiffViewer.tsx
              </span>
            </div>
            <div className="p-4 bg-card">
              <DiffViewer diff={gitDiff} showHeaders={true} />
            </div>
          </div>
        </section>

        {/* Props documentation */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Props</h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Prop</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">diff</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    string (optional)
                  </td>
                  <td className="px-4 py-3">
                    Pre-formatted git diff string - use for git operations
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">oldString</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    string (optional)
                  </td>
                  <td className="px-4 py-3">
                    Original content - use with newString for AI edit operations
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">newString</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    string (optional)
                  </td>
                  <td className="px-4 py-3">
                    Modified content - use with oldString for AI edit operations
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">filePath</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    string (optional)
                  </td>
                  <td className="px-4 py-3">File path for context</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">showHeaders</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    boolean (default: false)
                  </td>
                  <td className="px-4 py-3">
                    Show git diff headers (@@, ---, +++ lines)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">
                    showLineNumbers
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    boolean (default: false)
                  </td>
                  <td className="px-4 py-3">Show line numbers in diff output</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs">className</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    string (optional)
                  </td>
                  <td className="px-4 py-3">Additional CSS classes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Implementation notes */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Implementation Notes</h2>
          <div className="space-y-2 text-sm">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="font-medium mb-1">Syntax Highlighting</p>
              <p className="text-muted-foreground">
                Uses Shiki with the "diff" language for consistent syntax
                highlighting. Always renders in dark mode (github-dark theme).
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <p className="font-medium mb-1">Flexible Input</p>
              <p className="text-muted-foreground">
                Accepts either a pre-formatted diff string OR old/new string
                pairs. The component automatically generates unified diff format
                using the "diff" library.
              </p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4 py-2">
              <p className="font-medium mb-1">Header Filtering</p>
              <p className="text-muted-foreground">
                By default, strips git metadata headers for cleaner inline diffs.
                Set showHeaders=true to preserve full git diff format.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
