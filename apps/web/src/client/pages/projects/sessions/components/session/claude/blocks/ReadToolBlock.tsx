/**
 * Read tool block component
 */

import { ToolCollapsibleWrapper } from "../ToolCollapsibleWrapper";
import { SyntaxHighlighter } from "@/client/utils/syntaxHighlighter";
import { getLanguageFromPath } from "@/client/utils/getLanguageFromPath";
import type { ReadToolInput } from "@/shared/types/tool.types";

interface ReadToolBlockProps {
  input: ReadToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function ReadToolBlock({ input, result }: ReadToolBlockProps) {
  // Extract filename from path
  const getFileName = (filePath: string): string => {
    const parts = filePath.split("/");
    return parts[parts.length - 1];
  };

  // Create context info with filename and line numbers
  const getContextInfo = (): string => {
    const filename = getFileName(input.file_path);
    if (input.offset !== undefined && input.limit !== undefined) {
      const startLine = input.offset + 1;
      const endLine = input.offset + input.limit;
      return `${filename} (lines ${startLine}-${endLine})`;
    }
    return filename;
  };

  // Auto-detect language for syntax highlighting
  const language = getLanguageFromPath(input.file_path);

  return (
    <ToolCollapsibleWrapper
      toolName="Read"
      contextInfo={getContextInfo()}
      description={null}
      hasError={result?.is_error}
    >
      {result && !result.is_error && (
        <div className="border border-border rounded-md overflow-hidden">
          <SyntaxHighlighter
            code={result.content}
            language={language}
            showLineNumbers={false}
          />
        </div>
      )}
      {result?.is_error && (
        <div className="text-sm text-red-500">{result.content}</div>
      )}
    </ToolCollapsibleWrapper>
  );
}
