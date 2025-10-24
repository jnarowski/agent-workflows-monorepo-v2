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
} from '@/shared/types/tool.types';

interface ToolBlockRendererProps {
  toolName: string;
  input: Record<string, unknown>;
  result?: {
    content: string;
    is_error?: boolean;
  };
}

export function ToolBlockRenderer({ toolName, input, result }: ToolBlockRendererProps) {
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

    default:
      // Fallback to default block for unknown tools
      return <DefaultToolBlock toolName={toolName} input={input} result={result} />;
  }
}
