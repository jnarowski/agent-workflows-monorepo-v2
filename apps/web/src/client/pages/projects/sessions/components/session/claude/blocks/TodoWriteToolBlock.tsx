/**
 * TodoWrite tool block component
 */

import { ToolCollapsibleWrapper } from "../ToolCollapsibleWrapper";
import { TodoWriteToolRenderer } from "../tools/TodoWriteToolRenderer";
import type { TodoWriteToolInput } from "@/shared/types/tool.types";

interface TodoWriteToolBlockProps {
  input: TodoWriteToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function TodoWriteToolBlock({ input, result }: TodoWriteToolBlockProps) {
  // Calculate completion summary
  const completedCount = input.todos.filter((t) => t.status === "completed")
    .length;
  const description = `${completedCount} / ${input.todos.length} todos completed`;

  return (
    <ToolCollapsibleWrapper
      toolName="Update Todos"
      contextInfo={null}
      description={description}
      hasError={result?.is_error}
    >
      <TodoWriteToolRenderer input={input} />
    </ToolCollapsibleWrapper>
  );
}
