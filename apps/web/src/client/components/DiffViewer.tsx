/**
 * Unified diff viewer component
 * Displays diffs using Shiki's built-in diff language support
 * Supports both pre-formatted git diff strings and old/new string pairs
 */

import { useEffect, useState } from "react";
import { createPatch } from "diff";
import { codeToHtml, type BundledLanguage } from "shiki";

interface DiffViewerProps {
  // Pre-formatted diff string (from git commands)
  diff?: string;
  // Old/new string pairs (for AI edit tool)
  oldString?: string;
  newString?: string;
  filePath?: string;
  // Display options
  showHeaders?: boolean;
  showLineNumbers?: boolean;
  className?: string;
}

/**
 * Unified diff viewer that handles both git diffs and old/new string pairs
 * Uses Shiki's diff language for consistent syntax highlighting
 * Always uses dark mode theme
 */
export function DiffViewer({
  diff,
  oldString,
  newString,
  filePath,
  showHeaders = false,
  showLineNumbers = false,
  className = "",
}: DiffViewerProps) {
  const [html, setHtml] = useState<string>("");

  // Generate diff from old/new strings if provided
  let processedDiff = diff;

  if (!diff && oldString !== undefined && newString !== undefined) {
    // Use diff library to create unified diff format
    processedDiff = createPatch(
      filePath || "file",
      oldString,
      newString,
      "",
      "",
      { context: 3 }
    );
  }

  // Handle edge cases
  if (!processedDiff) {
    return (
      <div className={`text-muted-foreground text-xs p-4 ${className}`}>
        No changes to display
      </div>
    );
  }

  // Filter out headers if showHeaders is false
  if (!showHeaders && processedDiff) {
    const lines = processedDiff.split("\n");
    const filteredLines = lines.filter((line) => {
      // Skip git metadata lines and unified diff headers
      return !(
        line.startsWith("diff --git") ||
        line.startsWith("index ") ||
        line.startsWith("Index: ") ||
        line.startsWith("===") ||
        line.startsWith("--- ") ||
        line.startsWith("+++ ") ||
        line.startsWith("@@ ")
      );
    });
    processedDiff = filteredLines.join("\n");
  }

  // Remove any empty lines at the start/end
  processedDiff = processedDiff.trim();

  // Highlight diff with dark theme
  useEffect(() => {
    let cancelled = false;

    const highlight = async () => {
      try {
        const highlighted = await codeToHtml(processedDiff, {
          lang: "diff" as BundledLanguage,
          theme: "github-dark",
          transformers: showLineNumbers
            ? [
                {
                  line(node, line) {
                    node.properties["data-line"] = line;
                  },
                },
              ]
            : [],
        });

        if (!cancelled) {
          setHtml(highlighted);
        }
      } catch (error) {
        console.warn("Diff highlighting failed:", error);
        // Fallback to plain code
        if (!cancelled) {
          setHtml(`<pre><code>${escapeHtml(processedDiff)}</code></pre>`);
        }
      }
    };

    highlight();

    return () => {
      cancelled = true;
    };
  }, [processedDiff, showLineNumbers]);

  return (
    <div
      className={`syntax-highlighter text-xs ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
