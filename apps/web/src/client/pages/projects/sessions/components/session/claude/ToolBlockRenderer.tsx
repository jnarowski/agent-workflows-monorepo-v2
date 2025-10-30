/**
 * Router for tool block renderers
 * Dispatches to appropriate Block component based on tool name
 * Falls back to DefaultToolBlock for unknown tools
 */

import { ReadToolBlock } from './blocks/ReadToolBlock';
import { WriteToolBlock } from './blocks/WriteToolBlock';
import { EditToolBlock } from './blocks/EditToolBlock';
import { BashToolBlock } from './blocks/BashToolBlock';
import { TodoWriteToolBlock } from './blocks/TodoWriteToolBlock';
import { WebSearchToolBlock } from './blocks/WebSearchToolBlock';
import { GlobToolBlock } from './blocks/GlobToolBlock';
import { GrepToolBlock } from './blocks/GrepToolBlock';
import { TaskToolBlock } from './blocks/TaskToolBlock';
import { AskUserQuestionToolBlock } from './blocks/AskUserQuestionToolBlock';
import { DefaultToolBlock } from './blocks/DefaultToolBlock';

import type {
  ReadToolInput,
  WriteToolInput,
  EditToolInput,
  BashToolInput,
  TodoWriteToolInput,
  WebSearchToolInput,
  GlobToolInput,
  GrepToolInput,
  TaskToolInput,
  AskUserQuestionToolInput,
} from '@/shared/types/tool.types';
import type { UnifiedImageBlock } from '@repo/agent-cli-sdk';

interface ToolBlockRendererProps {
  toolName: string;
  input: Record<string, unknown>;
  result?: {
    content: string | UnifiedImageBlock;
    is_error?: boolean;
  };
}

export function ToolBlockRenderer({ toolName, input, result }: ToolBlockRendererProps) {
  // Enhanced logging for debugging blank rows issue
  if (import.meta.env.DEV) {
    console.log('[ToolBlockRenderer] Rendering tool block:', {
      toolName,
      hasResult: Boolean(result),
      resultType: result ? typeof result.content : 'none',
      isError: result?.is_error,
      inputKeys: Object.keys(input)
    });
  }

  switch (toolName) {
    case 'Read':
      return <ReadToolBlock input={input as ReadToolInput} result={result} />;

    case 'Write':
      return <WriteToolBlock input={input as WriteToolInput} result={result} />;

    case 'Edit':
      return <EditToolBlock input={input as EditToolInput} result={result} />;

    case 'Bash':
      return <BashToolBlock input={input as BashToolInput} result={result} />;

    case 'TodoWrite':
      return <TodoWriteToolBlock input={input as TodoWriteToolInput} result={result} />;

    case 'WebSearch':
      return <WebSearchToolBlock input={input as WebSearchToolInput} result={result} />;

    case 'Glob':
      return <GlobToolBlock input={input as GlobToolInput} result={result} />;

    case 'Grep':
      return <GrepToolBlock input={input as GrepToolInput} result={result} />;

    case 'Task':
      return <TaskToolBlock input={input as TaskToolInput} result={result} />;

    case 'AskUserQuestion':
      return <AskUserQuestionToolBlock input={input as AskUserQuestionToolInput} result={result} />;

    default:
      // Fallback to default block for unknown tools
      return <DefaultToolBlock toolName={toolName} input={input} result={result} />;
  }
}
