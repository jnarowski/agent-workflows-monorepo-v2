/**
 * Unified diff viewer component
 * Displays diffs with language-specific syntax highlighting
 * Supports both pre-formatted git diff strings and old/new string pairs
 */

import { useEffect, useState } from "react";
import { diffLines, type Change } from "diff";
import { codeToHtml, type BundledLanguage } from "shiki";

interface DiffViewerProps {
  // Pre-formatted diff string (from git commands)
  diff?: string;
  // Old/new string pairs (for AI edit tool)
  oldString?: string;
  newString?: string;
  filePath?: string;
  // Language for syntax highlighting
  language?: string;
  // Display options
  showHeaders?: boolean;
  showLineNumbers?: boolean;
  className?: string;
}

/**
 * Detect language from file path extension
 */
function detectLanguage(filePath?: string): string {
  if (!filePath) return "typescript";

  const ext = filePath.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    cpp: "cpp",
    c: "c",
    css: "css",
    html: "html",
    json: "json",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    sh: "bash",
  };

  console.log("filePath", filePath);
  console.log("ext", ext);

  return langMap[ext || ""] || "typescript";
}

/**
 * Parse git diff format into line changes
 */
function parseGitDiff(diffString: string): Change[] {
  const lines = diffString.split("\n");
  const changes: Change[] = [];
  let currentChunk: string[] = [];
  let currentType: "added" | "removed" | "unchanged" | null = null;

  const flushChunk = () => {
    if (currentChunk.length > 0 && currentType) {
      changes.push({
        value: currentChunk.join("\n") + "\n",
        added: currentType === "added",
        removed: currentType === "removed",
      });
      currentChunk = [];
      currentType = null;
    }
  };

  for (const line of lines) {
    // Skip headers
    if (
      line.startsWith("diff --git") ||
      line.startsWith("index ") ||
      line.startsWith("Index: ") ||
      line.startsWith("===") ||
      line.startsWith("--- ") ||
      line.startsWith("+++ ") ||
      line.startsWith("@@ ")
    ) {
      continue;
    }

    let type: "added" | "removed" | "unchanged";
    let content: string;

    if (line.startsWith("+")) {
      type = "added";
      content = line.slice(1);
    } else if (line.startsWith("-")) {
      type = "removed";
      content = line.slice(1);
    } else {
      type = "unchanged";
      content = line.startsWith(" ") ? line.slice(1) : line;
    }

    // If type changed, flush current chunk
    if (currentType && currentType !== type) {
      flushChunk();
    }

    currentType = type;
    currentChunk.push(content);
  }

  flushChunk();
  return changes;
}

/**
 * Unified diff viewer that handles both git diffs and old/new string pairs
 * Uses language-specific syntax highlighting with custom diff styling
 * Always uses dark mode theme
 */
export function DiffViewer({
  diff,
  oldString,
  newString,
  filePath,
  language,
  showHeaders = false,
  showLineNumbers = false,
  className = "",
}: DiffViewerProps) {
  const [html, setHtml] = useState<string>("");

  // Detect language if not provided
  const lang = language || detectLanguage(filePath);

  // Get line changes from either diff string or old/new strings
  let changes: Change[] = [];

  if (diff) {
    changes = parseGitDiff(diff);
  } else if (oldString !== undefined && newString !== undefined) {
    changes = diffLines(oldString, newString);
  }

  // Handle edge cases
  if (changes.length === 0) {
    return (
      <div className={`text-muted-foreground text-xs p-4 ${className}`}>
        No changes to display
      </div>
    );
  }

  // Highlight diff with language-specific syntax highlighting
  useEffect(() => {
    let cancelled = false;

    const highlight = async () => {
      try {
        const htmlLines: string[] = [];

        for (const part of changes) {
          // Skip empty parts
          if (!part.value.trim()) continue;

          // Determine styling based on change type
          const bgColor = part.added
            ? "#1a4d2e" // Brighter green for better contrast
            : part.removed
              ? "#5c1a1a" // Brighter red for better contrast
              : "#0d1117"; // GitHub dark background for unchanged lines
          const symbol = part.added ? "+" : part.removed ? "-" : " ";

          // Extract lines from the part
          const lines = part.value.split("\n").filter((l) => l.length > 0);

          for (const line of lines) {
            // Highlight each line
            const lineHighlighted = await codeToHtml(line, {
              lang: lang as BundledLanguage,
              theme: "github-dark",
            });

            // Extract just the code content from the pre/code tags
            const codeMatch = lineHighlighted.match(
              /<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/s
            );
            const codeContent = codeMatch ? codeMatch[1] : escapeHtml(line);

            htmlLines.push(`
              <div class="diff-line" style="background: ${bgColor}; display: grid; grid-template-columns: 2ch 1fr; align-items: center; line-height: 1.5;">
                <div class="diff-gutter" style="text-align: center; color: #888; background: #0d1117; padding: 0 4px; user-select: none; border-right: 1px solid #21262d;">${symbol}</div>
                <div class="diff-code" style="overflow-x: auto; padding: 0 8px;"><code style="white-space: pre;">${codeContent}</code></div>
              </div>
            `);
          }
        }

        if (!cancelled) {
          setHtml(htmlLines.join(""));
        }
      } catch (error) {
        console.warn("Diff highlighting failed:", error);
        // Fallback to plain text
        if (!cancelled) {
          const plainLines = changes
            .map((part) => {
              const symbol = part.added ? "+" : part.removed ? "-" : " ";
              return part.value
                .split("\n")
                .filter((l) => l.length > 0)
                .map((line) => `${symbol} ${escapeHtml(line)}`)
                .join("\n");
            })
            .join("\n");
          setHtml(`<pre><code>${plainLines}</code></pre>`);
        }
      }
    };

    highlight();

    return () => {
      cancelled = true;
    };
  }, [changes, lang]);

  return (
    <div
      className={`diff-viewer text-xs ${className}`}
      style={{
        fontFamily: "ui-monospace, monospace",
        border: "1px solid #21262d",
        borderRadius: "6px",
        overflow: "hidden",
        backgroundColor: "#0d1117",
        paddingTop: "8px",
        paddingBottom: "8px",
      }}
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
