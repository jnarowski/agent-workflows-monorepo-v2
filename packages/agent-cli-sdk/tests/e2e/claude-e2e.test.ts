/**
 * E2E tests for ClaudeAdapter
 *
 * These tests require:
 * 1. Claude CLI installed and available in PATH or CLAUDE_CLI_PATH
 * 2. Valid authentication (API key or OAuth token)
 * 3. RUN_E2E_TESTS=true environment variable
 *
 * To run these tests:
 *   RUN_E2E_TESTS=true npm test tests/e2e/claude-e2e.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AgentClient, createClaudeAdapter } from '../../src/index';
import { detectAndValidateClaudeCLI } from '../../src/adapters/claude/cli-detector';

const SHOULD_RUN = process.env.RUN_E2E_TESTS === 'true';
const describeE2E = SHOULD_RUN ? describe : describe.skip;

describeE2E('Claude E2E Tests', () => {
  beforeAll(async () => {
    // Verify CLI is installed
    const detection = detectAndValidateClaudeCLI();
    if (!detection.found) {
      throw new Error('Claude CLI not found. Install it or set CLAUDE_CLI_PATH environment variable');
    }
  });

  describe('Basic Execution', () => {
    it('should execute a simple prompt successfully', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const result = await client.execute('What is 2 + 2? Reply with just the number.', {
        timeout: 30000, // 30 second timeout
      });

      expect(result.status).toBe('success');
      expect(result.exitCode).toBe(0);
      expect(result.data).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(typeof result.data).toBe('string');

      // Output should contain "4"
      expect(result.data.toLowerCase()).toContain('4');
    }, 60000); // 60 second test timeout

    it('should handle streaming output', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });
      const outputChunks: string[] = [];
      const events: any[] = [];

      const result = await client.execute('Say hello', {
        onOutput: (data) => outputChunks.push(data.raw),
        onEvent: (event) => events.push(event),
        timeout: 30000,
      });

      expect(result.status).toBe('success');
      expect(outputChunks.length).toBeGreaterThan(0);
      expect(events.length).toBeGreaterThan(0);

      // Should have system, assistant, and result events
      const systemEvents = events.filter((e) => e.type === 'system');
      const assistantEvents = events.filter((e) => e.type === 'assistant');
      const resultEvents = events.filter((e) => e.type === 'result');

      expect(systemEvents.length).toBeGreaterThan(0);
      expect(assistantEvents.length).toBeGreaterThan(0);
      expect(resultEvents.length).toBeGreaterThan(0);
    }, 60000);

    it('should execute with factory-created adapter', async () => {
      const claude = createClaudeAdapter({
        verbose: false,
      });

      const client = new AgentClient({ adapter: claude });

      const result = await client.execute("Respond with 'OK'", {
        timeout: 30000,
      });

      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
    }, 60000);
  });

  describe('Session Management', () => {
    it('should create and use a session', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });
      const session = client.createSession();

      expect(session.messageCount).toBe(0);
      expect(session.sessionId).toBeUndefined();

      // Send first message
      const result1 = await session.send('Remember the number 42', {
        timeout: 30000,
      });

      expect(result1.status).toBe('success');
      expect(session.messageCount).toBe(1);
      expect(session.sessionId).toBeDefined();

      // Send second message in same session
      const result2 = await session.send('What number did I just tell you?', {
        timeout: 30000,
      });

      expect(result2.status).toBe('success');
      expect(session.messageCount).toBe(2);
      expect(result2.sessionId).toBe(result1.sessionId);

      // Output should reference 42
      expect(result2.data.toLowerCase()).toContain('42');
    }, 90000);

    it('should track active sessions', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const session1 = client.createSession();
      const session2 = client.createSession();

      await session1.send('Test message 1', { timeout: 30000 });
      await session2.send('Test message 2', { timeout: 30000 });

      // Wait for sessions to register
      await new Promise((resolve) => setTimeout(resolve, 100));

      const sessions = client.listActiveSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(2);

      // Verify session info
      const sessionInfo = sessions[0];
      expect(sessionInfo.sessionId).toBeDefined();
      expect(sessionInfo.messageCount).toBeGreaterThan(0);
      expect(sessionInfo.startedAt).toBeGreaterThan(0);
      expect(sessionInfo.adapter).toBe('ClaudeAdapter');
    }, 90000);
  });

  describe('Adapter Capabilities', () => {
    it('should return correct capabilities', () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });
      const capabilities = client.getCapabilities();

      expect(capabilities.streaming).toBe(true);
      expect(capabilities.sessionManagement).toBe(true);
      expect(capabilities.toolCalling).toBe(true);
      expect(capabilities.multiModal).toBe(false); // CLI doesn't support images yet
    });

    it('should provide access to underlying adapter', () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });
      const adapter = client.getAdapter();

      expect(adapter).toBeDefined();
      expect(adapter.getCapabilities).toBeDefined();
      expect(typeof adapter.execute).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle timeout errors', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });

      await expect(
        client.execute('Count to 1000 slowly', {
          timeout: 100, // Very short timeout
        })
      ).rejects.toThrow();
    }, 10000);

    it('should handle invalid prompts', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });

      await expect(
        client.execute('', {
          timeout: 5000,
        })
      ).rejects.toThrow('Prompt must be a non-empty string');
    });
  });

  describe('Advanced Options', () => {
    it('should respect working directory', async () => {
      const client = new AgentClient({
        adapter: createClaudeAdapter(),
        workingDir: process.cwd(),
      });

      const result = await client.execute('What is the current directory?', {
        timeout: 30000,
      });

      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
    }, 60000);

    it('should handle permission modes', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const result = await client.execute('Say hello', {
        timeout: 30000,
        dangerouslySkipPermissions: true,
      });

      expect(result.status).toBe('success');
    }, 60000);
  });

  describe('Metadata Extraction', () => {
    it('should extract metadata from response', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const result = await client.execute('Tell me a short joke', {
        timeout: 30000,
      });

      expect(result.metadata).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);

      // Should have raw output
      expect(result.raw).toBeDefined();
      expect(result.raw?.stdout).toBeDefined();
    }, 60000);

    it('should track tools used', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });
      const events: any[] = [];

      await client.execute('What files are in the current directory?', {
        onEvent: (event) => events.push(event),
        timeout: 30000,
      });

      // Should have some tool events
      const toolEvents = events.filter((e) => e.type === 'tool.started' || e.type === 'tool.completed');

      // May or may not use tools, but structure should be correct
      if (toolEvents.length > 0) {
        expect(toolEvents[0].data).toBeDefined();
      }
    }, 60000);
  });

  describe('Session Resuming', () => {
    it('should resume session across separate execute calls', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });

      // First execution - establish context
      const result1 = await client.execute("My favorite color is blue. Reply with 'Noted'.", {
        timeout: 30000,
      });

      expect(result1.status).toBe('success');
      expect(result1.sessionId).toBeDefined();

      const capturedSessionId = result1.sessionId!;

      // Second execution - resume with same session ID
      const result2 = await client.execute('What is my favorite color?', {
        sessionId: capturedSessionId,
        timeout: 30000,
      });

      expect(result2.status).toBe('success');
      expect(result2.sessionId).toBe(capturedSessionId);
      expect(result2.data.toLowerCase()).toContain('blue');
    }, 90000);

    it('should maintain context through multiple resume operations', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });

      // Turn 1: Set name
      const r1 = await client.execute("My name is Alex. Reply with 'OK'.", {
        timeout: 30000,
      });

      const sessionId = r1.sessionId!;
      expect(sessionId).toBeDefined();

      // Turn 2: Set age
      const r2 = await client.execute("I am 25 years old. Reply with 'OK'.", {
        sessionId,
        timeout: 30000,
      });

      expect(r2.sessionId).toBe(sessionId);

      // Turn 3: Set city
      const r3 = await client.execute("I live in Portland. Reply with 'OK'.", {
        sessionId,
        timeout: 30000,
      });

      expect(r3.sessionId).toBe(sessionId);

      // Turn 4: Ask about all context
      const r4 = await client.execute('Tell me everything you know about me in one sentence.', {
        sessionId,
        timeout: 30000,
      });

      expect(r4.sessionId).toBe(sessionId);

      const output = r4.data.toLowerCase();
      expect(output).toContain('alex');
      expect(output).toContain('25');
      expect(output).toContain('portland');
    }, 60000);

  });

  describe('Advanced Use Cases', () => {
    it('should handle complex multi-step workflow with session', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });
      let sessionId: string | undefined;

      // Step 1: Define requirements
      const r1 = await client.execute(
        'I need to create a function that calculates factorial. Just acknowledge this requirement.',
        {
          timeout: 30000,
        }
      );

      sessionId = r1.sessionId;
      expect(r1.status).toBe('success');

      // Step 2: Request implementation plan
      const r2 = await client.execute('Now outline the steps to implement this function.', {
        sessionId,
        timeout: 30000,
      });

      expect(r2.sessionId).toBe(sessionId);
      expect(r2.data.toLowerCase()).toContain('factorial');

      // Step 3: Ask for edge cases
      const r3 = await client.execute('What edge cases should we handle?', {
        sessionId,
        timeout: 30000,
      });

      expect(r3.sessionId).toBe(sessionId);
      expect(r3.data.length).toBeGreaterThan(0);
    }, 60000);

    it('should handle concurrent sessions independently', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });

      // Create two separate sessions
      const session1 = client.createSession();
      const session2 = client.createSession();

      // Run them concurrently with different contexts
      const [r1, r2] = await Promise.all([
        session1.send("My favorite animal is a cat. Reply 'OK'.", {
          timeout: 30000,
        }),
        session2.send("My favorite animal is a dog. Reply 'OK'.", {
          timeout: 30000,
        }),
      ]);

      expect(r1.sessionId).toBeDefined();
      expect(r2.sessionId).toBeDefined();
      expect(r1.sessionId).not.toBe(r2.sessionId);

      // Verify contexts are independent
      const [check1, check2] = await Promise.all([
        session1.send('What is my favorite animal?', { timeout: 30000 }),
        session2.send('What is my favorite animal?', { timeout: 30000 }),
      ]);

      expect(check1.data.toLowerCase()).toContain('cat');
      expect(check2.data.toLowerCase()).toContain('dog');
    }, 60000);

    it('should handle streaming with event aggregation', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });
      const allEvents: any[] = [];
      const textChunks: string[] = [];

      const result = await client.execute("Count from 1 to 5 and explain why you're counting.", {
        onEvent: (event) => {
          allEvents.push(event);
          if (event.type === 'text' && typeof event.data === 'string') {
            textChunks.push(event.data);
          }
        },
        timeout: 45000,
      });

      expect(result.status).toBe('success');
      expect(allEvents.length).toBeGreaterThan(0);

      // Should have received text events
      expect(textChunks.length).toBeGreaterThan(0);

      // Should have turn lifecycle events
      const turnStarted = allEvents.find((e) => e.type === 'turn.started');
      const turnCompleted = allEvents.find((e) => e.type === 'turn.completed');
      expect(turnStarted).toBeDefined();
      expect(turnCompleted).toBeDefined();
    }, 90000);

    it('should handle tool calling scenarios', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });
      const events: any[] = [];

      const result = await client.execute(
        "Create a temporary file called 'test.txt' with the content 'Hello E2E' and then read it back to verify.",
        {
          onEvent: (event) => events.push(event),
          timeout: 45000,
          dangerouslySkipPermissions: true,
        }
      );

      expect(result.status).toBe('success');

      // Should have tool events
      const toolStarted = events.filter((e) => e.type === 'tool.started');
      const toolCompleted = events.filter((e) => e.type === 'tool.completed');

      expect(toolStarted.length).toBeGreaterThan(0);
      expect(toolCompleted.length).toBeGreaterThan(0);

      // Verify tool structure
      if (toolStarted.length > 0) {
        expect(toolStarted[0].data).toBeDefined();
        expect(toolStarted[0].data.name).toBeDefined();
      }
    }, 90000);


    it('should handle model selection', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const result = await client.execute('Say hello in one word.', {
        model: 'haiku',
        timeout: 30000,
      });

      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();

      // Verify model info in metadata (if available)
      if (result.metadata?.model) {
        expect(result.metadata.model.toLowerCase()).toContain('haiku');
      }
    }, 60000);

    it('should handle timeout with partial output recovery', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });
      const events: any[] = [];

      try {
        await client.execute('Count from 1 to 100 very slowly, pausing between each number.', {
          timeout: 5000, // Short timeout to trigger timeout
          onEvent: (event) => events.push(event),
        });
      } catch (error: any) {
        // Should throw timeout error
        expect(error.message.toLowerCase()).toContain('timeout');

        // Should have captured some events before timeout
        expect(events.length).toBeGreaterThan(0);
      }
    }, 15000);

  });

  describe('Advanced Session Management', () => {
    it('should list and track active sessions', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });

      const session1 = client.createSession();
      const session2 = client.createSession();
      const session3 = client.createSession();

      // Send messages to all sessions
      await Promise.all([
        session1.send('Test 1', { timeout: 30000 }),
        session2.send('Test 2', { timeout: 30000 }),
        session3.send('Test 3', { timeout: 30000 }),
      ]);

      // Wait for registration
      await new Promise((resolve) => setTimeout(resolve, 500));

      const activeSessions = client.listActiveSessions();
      expect(activeSessions.length).toBeGreaterThanOrEqual(3);

      // Verify session metadata
      activeSessions.forEach((sessionInfo) => {
        expect(sessionInfo.sessionId).toBeDefined();
        expect(sessionInfo.messageCount).toBeGreaterThanOrEqual(1);
        expect(sessionInfo.startedAt).toBeGreaterThan(0);
        expect(sessionInfo.adapter).toBe('ClaudeAdapter');
      });
    }, 60000);

  });

  describe('Logging and Output Files', () => {
    let mkdtemp: any;
    let readFile: any;
    let rm: any;
    let tmpdir: any;
    let join: any;
    let testLogDir: string;

    beforeAll(async () => {
      // Import modules
      const fsPromises = await import('node:fs/promises');
      mkdtemp = fsPromises.mkdtemp;
      readFile = fsPromises.readFile;
      rm = fsPromises.rm;

      const os = await import('node:os');
      tmpdir = os.tmpdir;

      const path = await import('node:path');
      join = path.join;

      // Create temporary directory for logs
      testLogDir = await mkdtemp(join(tmpdir(), 'claude-e2e-logs-'));
    });

    afterAll(async () => {
      // Clean up temporary directory
      try {
        await rm(testLogDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should write input.json and output.json when logPath is provided', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });
      const logPath = join(testLogDir, 'execution-basic');

      const result = await client.execute("Say 'Logging test successful' and nothing else.", {
        logPath,
        timeout: 30000,
      });

      expect(result.status).toBe('success');

      // Verify input.json exists and contains the prompt
      const inputContent = await readFile(join(logPath, 'input.json'), 'utf-8');
      const inputData = JSON.parse(inputContent);
      expect(inputData.prompt).toContain('Logging test successful');
      expect(inputData.options.logPath).toBe(logPath);
      expect(inputData.options.timeout).toBe(30000);

      // Verify output.json exists and contains response data
      const outputContent = await readFile(join(logPath, 'output.json'), 'utf-8');
      const outputData = JSON.parse(outputContent);
      expect(outputData.status).toBe('success');
      expect(outputData.sessionId).toBeDefined();
      expect(outputData.duration).toBeGreaterThan(0);
      expect(outputData.exitCode).toBe(0);
      expect(outputData.data).toContain('Logging test');
      expect(outputData.metadata).toBeDefined();
    }, 60000);

    it('should capture raw stdout/stderr in output.json', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });
      const logPath = join(testLogDir, 'execution-raw-output');

      const result = await client.execute('What is 5 + 5?', {
        logPath,
        timeout: 30000,
      });

      expect(result.status).toBe('success');
      expect(result.raw?.stdout).toBeDefined();

      // Verify output.json contains raw data
      const outputContent = await readFile(join(logPath, 'output.json'), 'utf-8');
      const outputData = JSON.parse(outputContent);
      expect(outputData.raw).toBeDefined();
      expect(outputData.raw.stdout).toBeDefined();
      expect(typeof outputData.raw.stdout).toBe('string');
      expect(outputData.raw.stdout.length).toBeGreaterThan(0);

      // Raw stdout should contain JSONL events
      const lines = outputData.raw.stdout.trim().split('\n');
      expect(lines.length).toBeGreaterThan(0);

      // Each line should be valid JSON
      const firstLine = JSON.parse(lines[0]);
      expect(firstLine.type).toBeDefined();
    }, 60000);


    it('should log session information across multiple messages', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });
      const session = client.createSession();

      const logPath1 = join(testLogDir, 'session-msg-1');
      const logPath2 = join(testLogDir, 'session-msg-2');

      // First message
      const r1 = await session.send('My lucky number is 7. Reply OK.', {
        logPath: logPath1,
        timeout: 30000,
      });

      // Second message
      const r2 = await session.send('What is my lucky number?', {
        logPath: logPath2,
        timeout: 30000,
      });

      expect(r1.sessionId).toBeDefined();
      expect(r2.sessionId).toBe(r1.sessionId);

      // Verify both log directories have files
      const output1 = await readFile(join(logPath1, 'output.json'), 'utf-8');
      const output2 = await readFile(join(logPath2, 'output.json'), 'utf-8');

      const data1 = JSON.parse(output1);
      const data2 = JSON.parse(output2);

      // Both should have the same session ID
      expect(data1.sessionId).toBe(data2.sessionId);
      expect(data1.sessionId).toBe(r1.sessionId);
    }, 90000);

    it('should log errors when execution fails', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });
      const logPath = join(testLogDir, 'execution-timeout');

      try {
        await client.execute('Think deeply about the meaning of life.', {
          logPath,
          timeout: 1000, // Very short timeout to force failure
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toBeDefined();

        // Input should still be logged even on failure
        const inputContent = await readFile(join(logPath, 'input.json'), 'utf-8');
        const inputData = JSON.parse(inputContent);
        expect(inputData.prompt).toContain('meaning of life');
        expect(inputData.options.timeout).toBe(1000);

        // Error file might exist
        try {
          const errorContent = await readFile(join(logPath, 'error.json'), 'utf-8');
          const errorData = JSON.parse(errorContent);
          expect(errorData.message).toBeDefined();
        } catch {
          // error.json might not exist, that's OK
        }
      }
    }, 15000);

    it('should handle relative and absolute log paths', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });
      const { resolve } = await import('node:path');

      // Use absolute path
      const absolutePath = resolve(testLogDir, 'execution-absolute');

      const result = await client.execute('Say hello', {
        logPath: absolutePath,
        timeout: 30000,
      });

      expect(result.status).toBe('success');

      // Verify files were created
      const inputContent = await readFile(join(absolutePath, 'input.json'), 'utf-8');
      expect(inputContent).toBeDefined();
    }, 60000);

    it('should log metadata including model and token usage', async () => {
      const client = new AgentClient({ adapter: createClaudeAdapter() });
      const logPath = join(testLogDir, 'execution-metadata');

      const result = await client.execute('What is 2+2? Answer briefly.', {
        logPath,
        timeout: 30000,
        model: 'haiku',
      });

      expect(result.status).toBe('success');

      // Verify output.json contains metadata
      const outputContent = await readFile(join(logPath, 'output.json'), 'utf-8');
      const outputData = JSON.parse(outputContent);

      expect(outputData.metadata).toBeDefined();
      expect(outputData.duration).toBeGreaterThan(0);

      // Model might be in metadata
      if (outputData.metadata.model) {
        expect(outputData.metadata.model.toLowerCase()).toContain('haiku');
      }

      // Token usage might be available
      if (outputData.usage) {
        expect(outputData.usage.inputTokens).toBeGreaterThan(0);
        expect(outputData.usage.outputTokens).toBeGreaterThan(0);
        expect(outputData.usage.totalTokens).toBeGreaterThan(0);
      }
    }, 60000);

  });
});

// Skip message for when tests are not run
if (!SHOULD_RUN) {
  console.log('\n⚠️  Claude E2E tests are skipped. Set RUN_E2E_TESTS=true to run them.\n');
}
