export interface UnifiedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | UnifiedContent[];
  timestamp: number;
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';

  model?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  };

  _original: unknown;
}

export type UnifiedContent =
  | UnifiedTextBlock
  | UnifiedThinkingBlock
  | UnifiedToolUseBlock
  | UnifiedToolResultBlock
  | UnifiedSlashCommandBlock;

export interface UnifiedTextBlock {
  type: 'text';
  text: string;
}

export interface UnifiedThinkingBlock {
  type: 'thinking';
  thinking: string;
}

export interface UnifiedSlashCommandBlock {
  type: 'slash_command';
  command: string;
  message?: string;
  args?: string;
}

// Tool input types
export interface BashToolInput {
  command: string;
  description?: string;
  timeout?: number;
  run_in_background?: boolean;
  dangerouslyDisableSandbox?: boolean;
}

export interface ReadToolInput {
  file_path: string;
  offset?: number;
  limit?: number;
}

export interface WriteToolInput {
  file_path: string;
  content: string;
}

export interface EditToolInput {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

export interface GlobToolInput {
  pattern: string;
  path?: string;
}

export interface GrepToolInput {
  pattern: string;
  output_mode?: 'content' | 'files_with_matches' | 'count';
  path?: string;
  glob?: string;
  type?: string;
  '-n'?: boolean;
  '-i'?: boolean;
  '-A'?: number;
  '-B'?: number;
  '-C'?: number;
  head_limit?: number;
  multiline?: boolean;
}

export interface TodoWriteToolInput {
  todos: Array<{
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    activeForm: string;
  }>;
}

export interface WebSearchToolInput {
  query: string;
  allowed_domains?: string[];
  blocked_domains?: string[];
}

export interface AskUserQuestionToolInput {
  questions: Array<{
    question: string;
    header: string;
    multiSelect: boolean;
    options: Array<{
      label: string;
      description: string;
    }>;
  }>;
}

export interface ExitPlanModeToolInput {
  plan: string;
}

// MCP tools have dynamic names (e.g., mcp__happy__change_title)
// Keep as generic object for flexibility
export interface McpToolInput {
  [key: string]: unknown;
}

// Union type for all tool names
export type ToolName =
  | 'Bash'
  | 'Read'
  | 'Write'
  | 'Edit'
  | 'Glob'
  | 'Grep'
  | 'TodoWrite'
  | 'WebSearch'
  | 'AskUserQuestion'
  | 'ExitPlanMode'
  | string; // Allow MCP tools with dynamic names (mcp__*)

export interface UnifiedToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface UnifiedToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content?: unknown;
  is_error?: boolean;
}

export function extractTextContent(message: UnifiedMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }

  return message.content
    .filter(block => block.type === 'text')
    .map(block => {
      if (block.type === 'text') {
        return block.text;
      }
      return '';
    })
    .join('');
}

// Type guard functions for tool inputs
export function isBashTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: BashToolInput } {
  return block.name === 'Bash';
}

export function isReadTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: ReadToolInput } {
  return block.name === 'Read';
}

export function isWriteTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: WriteToolInput } {
  return block.name === 'Write';
}

export function isEditTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: EditToolInput } {
  return block.name === 'Edit';
}

export function isGlobTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: GlobToolInput } {
  return block.name === 'Glob';
}

export function isGrepTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: GrepToolInput } {
  return block.name === 'Grep';
}

export function isTodoWriteTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: TodoWriteToolInput } {
  return block.name === 'TodoWrite';
}

export function isWebSearchTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: WebSearchToolInput } {
  return block.name === 'WebSearch';
}

export function isAskUserQuestionTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: AskUserQuestionToolInput } {
  return block.name === 'AskUserQuestion';
}

export function isExitPlanModeTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: ExitPlanModeToolInput } {
  return block.name === 'ExitPlanMode';
}

export function isMcpTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: McpToolInput } {
  return block.name.startsWith('mcp__');
}

export function isSlashCommand(block: UnifiedContent): block is UnifiedSlashCommandBlock {
  return block.type === 'slash_command';
}
