/**
 * Bash tool block component
 */

import { ToolCollapsibleWrapper } from "../ToolCollapsibleWrapper";
import { BashToolRenderer } from "../tools/BashToolRenderer";
import type { BashToolInput } from "@/shared/types/tool.types";

interface BashToolBlockProps {
  input: BashToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function BashToolBlock({ input, result }: BashToolBlockProps) {
  // Use description as summary in header
  const description = input.description || null;

  return (
    <ToolCollapsibleWrapper
      toolName="Bash"
      contextInfo={null}
      description={description}
      hasError={result?.is_error}
    >
      <BashToolRenderer input={input} result={result} />
    </ToolCollapsibleWrapper>
  );
}
