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
  | UnifiedToolResultBlock;

export interface UnifiedTextBlock {
  type: 'text';
  text: string;
}

export interface UnifiedThinkingBlock {
  type: 'thinking';
  thinking: string;
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
    .filter(block => block.type === 'text' && block.text)
    .map(block => block.text)
    .join('');
}
