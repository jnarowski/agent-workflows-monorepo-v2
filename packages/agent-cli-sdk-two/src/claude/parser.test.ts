import { describe, it, expect } from 'vitest';
import { parseClaudeEvent } from './parser';

describe('parseClaudeEvent', () => {
  // Real user message from actual Claude session
  const realUserMessage = '{"parentUuid":null,"isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","type":"user","message":{"role":"user","content":"Hey"},"uuid":"40100391-dfab-4f01-8ce8-7c6f2b1a5e8c","timestamp":"2025-10-21T03:21:27.040Z"}';

  // Real assistant message from actual Claude session
  const realAssistantMessage = '{"parentUuid":"40100391-dfab-4f01-8ce8-7c6f2b1a5e8c","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_01UEW7khEaq2scDXdByVaATi","type":"message","role":"assistant","content":[{"type":"text","text":"I\'ll help you with whatever you need! What would you like to work on today?"}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":3,"cache_creation_input_tokens":3526,"cache_read_input_tokens":11040,"cache_creation":{"ephemeral_5m_input_tokens":3526,"ephemeral_1h_input_tokens":0},"output_tokens":1,"service_tier":"standard"}},"requestId":"req_011CUKdBDkx47fo5CR13SAns","type":"assistant","uuid":"1962a5d2-635d-460b-b663-6e7208ddff76","timestamp":"2025-10-21T03:21:29.233Z"}';

  // Real tool use message from actual Claude session
  const realToolUseMessage = '{"parentUuid":"1962a5d2-635d-460b-b663-6e7208ddff76","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_01UEW7khEaq2scDXdByVaATi","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_01VZ4mZBZtXjHzEgB2dFd6Bs","name":"mcp__happy__change_title","input":{"title":"New Chat Session"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":3,"cache_creation_input_tokens":3526,"cache_read_input_tokens":11040,"cache_creation":{"ephemeral_5m_input_tokens":3526,"ephemeral_1h_input_tokens":0},"output_tokens":1,"service_tier":"standard"}},"requestId":"req_011CUKdBDkx47fo5CR13SAns","type":"assistant","uuid":"d147d7ae-ca2b-48fe-a068-7af2ad9c419e","timestamp":"2025-10-21T03:21:29.990Z"}';

  it('should parse real user message', () => {
    const result = parseClaudeEvent(realUserMessage);

    expect(result).not.toBeNull();
    expect(result?.role).toBe('user');
    expect(result?.tool).toBe('claude');
    expect(result?.id).toBe('40100391-dfab-4f01-8ce8-7c6f2b1a5e8c');
    expect(result?.content).toHaveLength(1);
    if (Array.isArray(result?.content)) {
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toBe('Hey');
    }
  });

  it('should parse real assistant message with text content', () => {
    const result = parseClaudeEvent(realAssistantMessage);

    expect(result).not.toBeNull();
    expect(result?.role).toBe('assistant');
    expect(result?.model).toBe('claude-sonnet-4-5-20250929');
    expect(result?.content).toHaveLength(1);
    if (Array.isArray(result?.content)) {
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain('help you with whatever you need');
    }
  });

  it('should parse real tool use message', () => {
    const result = parseClaudeEvent(realToolUseMessage);

    expect(result).not.toBeNull();
    expect(result?.content).toHaveLength(1);
    if (Array.isArray(result?.content)) {
      expect(result.content[0]?.type).toBe('tool_use');
      expect(result.content[0]?.toolName).toBe('mcp__happy__change_title');
      expect(result.content[0]?.toolInput).toEqual({ title: 'New Chat Session' });
    }
  });

  it('should parse usage data from real message', () => {
    const result = parseClaudeEvent(realAssistantMessage);

    expect(result).not.toBeNull();
    expect(result?.usage).toBeDefined();
    expect(result?.usage?.inputTokens).toBe(3);
    expect(result?.usage?.outputTokens).toBe(1);
    expect(result?.usage?.totalTokens).toBe(4);
    expect(result?.usage?.cacheCreationTokens).toBe(3526);
    expect(result?.usage?.cacheReadTokens).toBe(11040);
  });

  it('should skip file-history-snapshot', () => {
    const line = '{"type":"file-history-snapshot","messageId":"123"}';
    const result = parseClaudeEvent(line);
    expect(result).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    const line = 'invalid json {';
    const result = parseClaudeEvent(line);
    expect(result).toBeNull();
  });

  it('should return null when message is missing', () => {
    const line = '{"type":"user","timestamp":"2025-01-01T00:00:00Z","uuid":"user-222"}';
    const result = parseClaudeEvent(line);
    expect(result).toBeNull();
  });
});
