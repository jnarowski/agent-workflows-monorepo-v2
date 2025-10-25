/**
 * Write tool block component
 */

import { ToolCollapsibleWrapper } from "../ToolCollapsibleWrapper";
import { SyntaxHighlighter } from "@/client/utils/syntaxHighlighter";
import { getLanguageFromPath } from "@/client/utils/getLanguageFromPath";
import type { WriteToolInput } from "@/shared/types/tool.types";

interface WriteToolBlockProps {
  input: WriteToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function WriteToolBlock({ input, result }: WriteToolBlockProps) {
  // Extract filename from path
  const getFileName = (filePath: string): string => {
    const parts = filePath.split("/");
    return parts[parts.length - 1];
  };

  // Auto-detect language for syntax highlighting
  const language = getLanguageFromPath(input.file_path);

  return (
    <ToolCollapsibleWrapper
      toolName="Write"
      contextInfo={getFileName(input.file_path)}
      description="Created"
      hasError={result?.is_error}
    >
      <div className="border border-border rounded-md overflow-hidden">
        <SyntaxHighlighter
          code={input.content}
          language={language}
          showLineNumbers={false}
        />
      </div>
    </ToolCollapsibleWrapper>
  );
}
