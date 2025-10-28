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

  native: unknown;
}

export interface UnifiedContent {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  thinking?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
  isError?: boolean;
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
