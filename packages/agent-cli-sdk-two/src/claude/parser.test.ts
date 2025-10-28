import { describe, it, expect } from 'vitest';
import { parser } from './parser';

describe('parser', () => {
  // Real messages from actual Claude session (sample.jsonl)

  // User message with simple text content
  const realUserMessage =
    '{"parentUuid":null,"isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","type":"user","message":{"role":"user","content":"Hey"},"uuid":"40100391-dfab-4f01-8ce8-7c6f2b1a5e8c","timestamp":"2025-10-21T03:21:27.040Z"}';

  // Assistant message with text content
  const realAssistantMessage =
    '{"parentUuid":"40100391-dfab-4f01-8ce8-7c6f2b1a5e8c","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_01UEW7khEaq2scDXdByVaATi","type":"message","role":"assistant","content":[{"type":"text","text":"I\'ll help you with whatever you need! What would you like to work on today?"}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":3,"cache_creation_input_tokens":3526,"cache_read_input_tokens":11040,"cache_creation":{"ephemeral_5m_input_tokens":3526,"ephemeral_1h_input_tokens":0},"output_tokens":1,"service_tier":"standard"}},"requestId":"req_011CUKdBDkx47fo5CR13SAns","type":"assistant","uuid":"1962a5d2-635d-460b-b663-6e7208ddff76","timestamp":"2025-10-21T03:21:29.233Z"}';

  // Assistant message with MCP tool use
  const realToolUseMessage =
    '{"parentUuid":"1962a5d2-635d-460b-b663-6e7208ddff76","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_01UEW7khEaq2scDXdByVaATi","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_01VZ4mZBZtXjHzEgB2dFd6Bs","name":"mcp__happy__change_title","input":{"title":"New Chat Session"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":3,"cache_creation_input_tokens":3526,"cache_read_input_tokens":11040,"cache_creation":{"ephemeral_5m_input_tokens":3526,"ephemeral_1h_input_tokens":0},"output_tokens":1,"service_tier":"standard"}},"requestId":"req_011CUKdBDkx47fo5CR13SAns","type":"assistant","uuid":"d147d7ae-ca2b-48fe-a068-7af2ad9c419e","timestamp":"2025-10-21T03:21:29.990Z"}';

  // User message with tool_result content
  const toolResultMessage =
    '{"parentUuid":"d147d7ae-ca2b-48fe-a068-7af2ad9c419e","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01VZ4mZBZtXjHzEgB2dFd6Bs","type":"tool_result","content":[{"type":"text","text":"Successfully changed chat title to: \\"New Chat Session\\""}]}]},"uuid":"83257e88-d48f-4283-9c8c-59a0cac30976","timestamp":"2025-10-21T03:21:30.144Z","toolUseResult":[{"type":"text","text":"Successfully changed chat title to: \\"New Chat Session\\""}]}';

  // Assistant message with special characters in text
  const messageWithSpecialChars =
    '{"parentUuid":"8d6c7ccb-025b-4497-a3e4-1b3a049e2f91","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_01XjvytSLtruAi4HVpMs4LJc","type":"message","role":"assistant","content":[{"type":"text","text":"<options>\\n<option>Help me fix a bug</option>\\n<option>Add a new feature</option>\\n<option>Refactor some code</option>\\n<option>Review or explain code</option>\\n<option>Set up or configure something</option>\\n</options>"}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":6,"cache_creation_input_tokens":3620,"cache_read_input_tokens":11040,"cache_creation":{"ephemeral_5m_input_tokens":3620,"ephemeral_1h_input_tokens":0},"output_tokens":2,"service_tier":"standard"}},"requestId":"req_011CUKdBSiJvj1e7o692Gw9d","type":"assistant","uuid":"8d6c7ccb-025b-4497-a3e4-1b3a049e2f91","timestamp":"2025-10-21T03:21:33.237Z"}';

  // Assistant message with Bash tool use
  const bashToolMessage =
    '{"parentUuid":"85c95600-e086-42ff-b008-ee05d1f89c34","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_01Fug8GaAX9QhQZkU8jDdRYU","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_011ifZCTiqxJCc9j1oDf8U77","name":"Bash","input":{"command":"find . -maxdepth 3 -type f -name \\"*.json\\" -o -name \\"*.md\\" -o -name \\"*.ts\\" -o -name \\"*.js\\" | head -50","description":"List key files in the project"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":7,"cache_creation_input_tokens":526,"cache_read_input_tokens":14660,"cache_creation":{"ephemeral_5m_input_tokens":526,"ephemeral_1h_input_tokens":0},"output_tokens":26,"service_tier":"standard"}},"requestId":"req_011CUKdDyVHp1kgp5xL7WFV5","type":"assistant","uuid":"6eae2f35-18f1-4956-9f7e-484011b5d1bf","timestamp":"2025-10-21T03:22:07.375Z"}';

  // Assistant message with Read tool use
  const readToolMessage =
    '{"parentUuid":"6ea1e438-5f17-4209-8c2d-aa8f85c32839","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_01Fug8GaAX9QhQZkU8jDdRYU","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_01VurUqby2LFP9HtL3Lfv5fg","name":"Read","input":{"file_path":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2/package.json"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":7,"cache_creation_input_tokens":526,"cache_read_input_tokens":14660,"cache_creation":{"ephemeral_5m_input_tokens":526,"ephemeral_1h_input_tokens":0},"output_tokens":26,"service_tier":"standard"}},"requestId":"req_011CUKdDyVHp1kgp5xL7WFV5","type":"assistant","uuid":"6ea1e438-5f17-4209-8c2d-aa8f85c32839","timestamp":"2025-10-21T03:22:08.688Z"}';

  // User message with complex toolUseResult metadata
  const complexToolResult =
    '{"parentUuid":"3c603d42-5a22-4850-983b-a44d9cf20e68","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_0116WEyb81Mah8Hb9u29YXyW","type":"tool_result","content":"Todos have been modified successfully. Ensure that you continue to use the todo list to track your progress. Please proceed with the current tasks if applicable"}]},"uuid":"70f71971-7936-4cbf-91d0-22261c912813","timestamp":"2025-10-21T03:22:04.361Z","toolUseResult":{"oldTodos":[],"newTodos":[{"content":"Explore codebase structure and understand project layout","status":"in_progress","activeForm":"Exploring codebase structure and understanding project layout"}]}}';

  // Assistant message with TodoWrite tool use
  const todoWriteMessage =
    '{"parentUuid":"6dd808e1-5323-4917-a73a-2cb7b3eb13f5","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_016s5eVR2dEB4RbiJkWPwgMf","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_0116WEyb81Mah8Hb9u29YXyW","name":"TodoWrite","input":{"todos":[{"content":"Explore codebase structure and understand project layout","status":"in_progress","activeForm":"Exploring codebase structure and understanding project layout"}]}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":3,"cache_creation_input_tokens":181,"cache_read_input_tokens":14566,"cache_creation":{"ephemeral_5m_input_tokens":181,"ephemeral_1h_input_tokens":0},"output_tokens":4,"service_tier":"standard"}},"requestId":"req_011CUKdDSzjdQDj5azZsPxFW","type":"assistant","uuid":"85c95600-e086-42ff-b008-ee05d1f89c34","timestamp":"2025-10-21T03:22:04.038Z"}';

  // Assistant message with cache statistics
  const messageWithCache =
    '{"parentUuid":"81b38c35-b17f-4165-8e60-5fe4fdbe8b8a","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_016s5eVR2dEB4RbiJkWPwgMf","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_011YYBysX3VvgEUTM9L2iWCJ","name":"mcp__happy__change_title","input":{"title":"Codebase Audit"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":3,"cache_creation_input_tokens":181,"cache_read_input_tokens":14566,"cache_creation":{"ephemeral_5m_input_tokens":181,"ephemeral_1h_input_tokens":0},"output_tokens":4,"service_tier":"standard"}},"requestId":"req_011CUKdDSzjdQDj5azZsPxFW","type":"assistant","uuid":"6dd808e1-5323-4917-a73a-2cb7b3eb13f5","timestamp":"2025-10-21T03:22:00.061Z"}';

  it('should parse real user message', () => {
    const result = parser(realUserMessage);

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
    const result = parser(realAssistantMessage);

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
    const result = parser(realToolUseMessage);

    expect(result).not.toBeNull();
    expect(result?.content).toHaveLength(1);

    if (Array.isArray(result?.content)) {
      const block = result.content[0];
      expect(block?.type).toBe('tool_use');
      if (block?.type !== 'tool_use') {
        throw new Error(`Expected tool_use block, got ${block?.type}`);
      }
      expect(block.id).toBe('toolu_01VZ4mZBZtXjHzEgB2dFd6Bs');
      expect(block.name).toBe('mcp__happy__change_title');
      expect(block.input).toEqual({ title: 'New Chat Session' });
    }
  });

  it('should parse usage data from real message', () => {
    const result = parser(realAssistantMessage);

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
    const result = parser(line);
    expect(result).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    const line = 'invalid json {';
    const result = parser(line);
    expect(result).toBeNull();
  });

  it('should return null when message is missing', () => {
    const line = '{"type":"user","timestamp":"2025-01-01T00:00:00Z","uuid":"user-222"}';
    const result = parser(line);
    expect(result).toBeNull();
  });

  // Additional test cases from sample.jsonl fixture
  it('should parse user message with tool_result content', () => {
    const result = parser(toolResultMessage);

    expect(result).not.toBeNull();
    expect(result?.role).toBe('user');
    expect(result?.content).toHaveLength(1);

    if (Array.isArray(result?.content)) {
      const block = result.content[0];
      expect(block?.type).toBe('tool_result');
      if (block?.type !== 'tool_result') {
        throw new Error(`Expected tool_result block, got ${block?.type}`);
      }
      expect(block.tool_use_id).toBe('toolu_01VZ4mZBZtXjHzEgB2dFd6Bs');
      expect(block.content).toBeDefined();
    }
  });

  it('should parse assistant message with Bash tool use', () => {
    const result = parser(bashToolMessage);

    expect(result).not.toBeNull();
    expect(result?.role).toBe('assistant');
    expect(result?.content).toHaveLength(1);

    if (Array.isArray(result?.content)) {
      const block = result.content[0];
      expect(block?.type).toBe('tool_use');
      if (block?.type !== 'tool_use') {
        throw new Error(`Expected tool_use block, got ${block?.type}`);
      }
      expect(block.name).toBe('Bash');
      expect(block.input).toBeDefined();
      expect(block.input.command).toContain('find');
      expect(block.input.description).toBe('List key files in the project');
    }
  });

  it('should parse assistant message with Read tool', () => {
    const result = parser(readToolMessage);

    expect(result).not.toBeNull();
    expect(result?.role).toBe('assistant');
    expect(result?.content).toHaveLength(1);

    if (Array.isArray(result?.content)) {
      const block = result.content[0];
      expect(block?.type).toBe('tool_use');
      if (block?.type !== 'tool_use') {
        throw new Error(`Expected tool_use block, got ${block?.type}`);
      }
      expect(block.name).toBe('Read');
      expect(block.input.file_path).toContain('package.json');
    }
  });

  it('should parse user message with complex toolUseResult metadata', () => {
    const result = parser(complexToolResult);

    expect(result).not.toBeNull();
    expect(result?.role).toBe('user');
    expect(result?.content).toHaveLength(1);

    if (Array.isArray(result?.content)) {
      const block = result.content[0];
      expect(block?.type).toBe('tool_result');
      if (block?.type !== 'tool_result') {
        throw new Error(`Expected tool_result block, got ${block?.type}`);
      }
      expect(block.tool_use_id).toBe('toolu_0116WEyb81Mah8Hb9u29YXyW');
      expect(block.content).toBeDefined();
    }
  });

  it('should parse assistant message with TodoWrite tool', () => {
    const result = parser(todoWriteMessage);

    expect(result).not.toBeNull();
    expect(result?.role).toBe('assistant');
    expect(result?.content).toHaveLength(1);

    if (Array.isArray(result?.content)) {
      const block = result.content[0];
      expect(block?.type).toBe('tool_use');
      if (block?.type !== 'tool_use') {
        throw new Error(`Expected tool_use block, got ${block?.type}`);
      }
      expect(block.name).toBe('TodoWrite');
      expect(block.input.todos).toBeDefined();
      expect(Array.isArray(block.input.todos)).toBe(true);
    }
  });

  it('should parse message with cache statistics', () => {
    const result = parser(messageWithCache);

    expect(result).not.toBeNull();
    expect(result?.usage).toBeDefined();
    expect(result?.usage?.inputTokens).toBe(3);
    expect(result?.usage?.outputTokens).toBe(4);
    expect(result?.usage?.cacheCreationTokens).toBe(181);
    expect(result?.usage?.cacheReadTokens).toBe(14566);
    expect(result?.usage?.totalTokens).toBe(7);
  });

  it('should preserve timestamp', () => {
    const result = parser(realUserMessage);

    expect(result).not.toBeNull();
    expect(result?.timestamp).toBeDefined();
    expect(typeof result?.timestamp).toBe('number');
  });

  it('should handle assistant message with text containing special characters', () => {
    const result = parser(messageWithSpecialChars);

    expect(result).not.toBeNull();
    expect(result?.content).toHaveLength(1);

    if (Array.isArray(result?.content)) {
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain('<options>');
      expect(result.content[0]?.text).toContain('Help me fix a bug');
    }
  });
});
