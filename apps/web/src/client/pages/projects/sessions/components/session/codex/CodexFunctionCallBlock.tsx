/**
 * Codex function call block
 * Routes to tool-specific renderers based on function name
 */

import { ShellToolBlock } from './tools/ShellToolBlock';
import { ApplyPatchToolBlock } from './tools/ApplyPatchToolBlock';
import { UpdatePlanToolBlock } from './tools/UpdatePlanToolBlock';
import { DefaultToolBlock } from './tools/DefaultToolBlock';
import type { ToolInput } from '@/shared/types/message.types';

interface CodexFunctionCallBlockProps {
  toolName: string;
  toolId: string;
  input: ToolInput;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function CodexFunctionCallBlock({
  toolName,
  toolId,
  input,
  result,
}: CodexFunctionCallBlockProps) {
  // Route to tool-specific renderer
  switch (toolName) {
    case 'shell':
      return <ShellToolBlock input={input} result={result} />;

    case 'apply_patch':
      return <ApplyPatchToolBlock input={input} result={result} />;

    case 'update_plan':
      return <UpdatePlanToolBlock input={input} result={result} />;

    default:
      // Fallback for unknown tools
      return (
        <DefaultToolBlock
          toolName={toolName}
          toolId={toolId}
          input={input}
          result={result}
        />
      );
  }
}
