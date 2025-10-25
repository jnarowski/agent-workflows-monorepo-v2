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
import { ClaudeAdapter } from '../../src/index';
import { detectAndValidateClaudeCLI } from '../../src/claude/cli-detector';

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
      const adapter = new ClaudeAdapter();

      const result = await adapter.execute('What is 2 + 2? Reply with just the number.', {
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
      const adapter = new ClaudeAdapter();
      const outputChunks: string[] = [];
      const events: any[] = [];

      const result = await adapter.execute('Say hello', {
        onOutput: (data) => outputChunks.push(data.raw),
        onEvent: (event) => events.push(event),
        timeout: 30000,
      });

      expect(result.status).toBe('success');
      expect(outputChunks.length).toBeGreaterThan(0);
      expect(events.length).toBeGreaterThan(0);

      // Should have assistant events
      const assistantEvents = events.filter((e) => e.type === 'assistant');
      expect(assistantEvents.length).toBeGreaterThan(0);
    }, 60000);

    it('should execute with config options', async () => {
      const adapter = new ClaudeAdapter({
        verbose: false,
      });

      const result = await adapter.execute("Respond with 'OK'", {
        timeout: 30000,
      });

      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
    }, 60000);
  });

  describe('Session Management', () => {
    it('should create and resume a session', async () => {
      const adapter = new ClaudeAdapter();

      // First message
      const result1 = await adapter.execute('Remember the number 42', {
        timeout: 30000,
      });

      expect(result1.status).toBe('success');
      expect(result1.sessionId).toBeDefined();

      // Resume session
      const result2 = await adapter.execute('What number did I just tell you?', {
        sessionId: result1.sessionId,
        resume: true,
        timeout: 30000,
      });

      expect(result2.status).toBe('success');
      expect(result2.sessionId).toBe(result1.sessionId);

      // Output should reference 42
      expect(result2.data.toLowerCase()).toContain('42');
    }, 90000);

    it('should maintain context through multiple resume operations', async () => {
      const adapter = new ClaudeAdapter();

      // Turn 1: Set name
      const r1 = await adapter.execute("My name is Alex. Reply with 'OK'.", {
        timeout: 30000,
      });

      const sessionId = r1.sessionId!;
      expect(sessionId).toBeDefined();

      // Turn 2: Set age
      const r2 = await adapter.execute("I am 25 years old. Reply with 'OK'.", {
        sessionId,
        resume: true,
        timeout: 30000,
      });

      expect(r2.sessionId).toBe(sessionId);

      // Turn 3: Set city
      const r3 = await adapter.execute("I live in Portland. Reply with 'OK'.", {
        sessionId,
        resume: true,
        timeout: 30000,
      });

      expect(r3.sessionId).toBe(sessionId);

      // Turn 4: Ask about all context
      const r4 = await adapter.execute('Tell me everything you know about me in one sentence.', {
        sessionId,
        resume: true,
        timeout: 30000,
      });

      expect(r4.sessionId).toBe(sessionId);

      const output = r4.data.toLowerCase();
      expect(output).toContain('alex');
      expect(output).toContain('25');
      expect(output).toContain('portland');
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle timeout errors', async () => {
      const adapter = new ClaudeAdapter();

      await expect(
        adapter.execute('Count to 1000 slowly', {
          timeout: 100, // Very short timeout
        })
      ).rejects.toThrow();
    }, 10000);

    it('should handle invalid prompts', async () => {
      const adapter = new ClaudeAdapter();

      await expect(
        adapter.execute('', {
          timeout: 5000,
        })
      ).rejects.toThrow('Prompt must be a non-empty string');
    });
  });

  describe('Advanced Options', () => {
    it('should respect working directory', async () => {
      const adapter = new ClaudeAdapter({
        workingDir: process.cwd(),
      });

      const result = await adapter.execute('What is the current directory?', {
        timeout: 30000,
      });

      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
    }, 60000);

    it('should handle permission modes', async () => {
      const adapter = new ClaudeAdapter();

      const result = await adapter.execute('Say hello', {
        timeout: 30000,
        dangerouslySkipPermissions: true,
      });

      expect(result.status).toBe('success');
    }, 60000);
  });

  describe('Metadata Extraction', () => {
    it('should extract metadata from response', async () => {
      const adapter = new ClaudeAdapter();

      const result = await adapter.execute('Tell me a short joke', {
        timeout: 30000,
      });

      expect(result.metadata).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);

      // Should have raw output
      expect(result.raw).toBeDefined();
      expect(result.raw?.stdout).toBeDefined();
    }, 60000);

    it('should track tools used', async () => {
      const adapter = new ClaudeAdapter();
      const events: any[] = [];

      await adapter.execute('What files are in the current directory?', {
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
      const adapter = new ClaudeAdapter();
      const logPath = join(testLogDir, 'execution-basic');

      const result = await adapter.execute("Say 'Logging test successful' and nothing else.", {
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
      const adapter = new ClaudeAdapter();
      const logPath = join(testLogDir, 'execution-raw-output');

      const result = await adapter.execute('What is 5 + 5?', {
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
      const adapter = new ClaudeAdapter();

      const logPath1 = join(testLogDir, 'session-msg-1');
      const logPath2 = join(testLogDir, 'session-msg-2');

      // First message
      const r1 = await adapter.execute('My lucky number is 7. Reply OK.', {
        logPath: logPath1,
        timeout: 30000,
      });

      // Second message
      const r2 = await adapter.execute('What is my lucky number?', {
        sessionId: r1.sessionId,
        resume: true,
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

    it('should handle model selection', async () => {
      const adapter = new ClaudeAdapter();

      const result = await adapter.execute('Say hello in one word.', {
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
  });
});

// Skip message for when tests are not run
if (!SHOULD_RUN) {
  console.log('\n⚠️  Claude E2E tests are skipped. Set RUN_E2E_TESTS=true to run them.\n');
}
