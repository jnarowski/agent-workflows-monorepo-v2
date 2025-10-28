import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { execute } from '../../../src/claude/execute';

describe('E2E: Session Management', () => {
  it('should handle session creation, resumption, and continuation correctly', async () => {
    const sessionId = uuidv4();

    // Test 1: Create a session with context (simulating user identity)
    const firstResult = await execute({
      prompt: 'My name is Tony. Please acknowledge this and say my name back to me.',
      sessionId,
      permissionMode: 'acceptEdits',
      timeout: 60000,
    });

    expect(firstResult.success).toBe(true);
    expect(firstResult.exitCode).toBe(0);
    expect(firstResult.sessionId).toBe(sessionId);
    expect(firstResult.messages.length).toBeGreaterThan(0);
    expect(firstResult.duration).toBeGreaterThan(0);

    // Verify the AI acknowledged the name
    const firstResponse = firstResult.data as string;
    expect(firstResponse.toLowerCase()).toContain('tony');

    // Test 2: Resume the session and verify context is preserved
    const secondResult = await execute({
      prompt: 'What is my name?',
      sessionId,
      resume: true,
      permissionMode: 'acceptEdits',
      timeout: 60000,
    });

    expect(secondResult.success).toBe(true);
    expect(secondResult.exitCode).toBe(0);
    expect(secondResult.sessionId).toBe(sessionId);

    // Critical: Verify context was preserved - AI should remember the name
    const responseText = secondResult.data as string;
    expect(responseText.toLowerCase()).toContain('tony');

    // Test 3: Continue from most recent session (creates new session with context)
    const continueSessionId = uuidv4();

    // Create a session to continue from
    const continueFirst = await execute({
      prompt: 'Remember the word: elephant. Just say you remember it.',
      sessionId: continueSessionId,
      permissionMode: 'acceptEdits',
      timeout: 60000,
    });

    expect(continueFirst.success).toBe(true);
    expect(continueFirst.sessionId).toBe(continueSessionId);

    // Continue creates a new session but loads context
    const continueSecond = await execute({
      prompt: 'What word did I ask you to remember?',
      continue: true,
      permissionMode: 'acceptEdits',
      timeout: 60000,
    });

    expect(continueSecond.success).toBe(true);
    expect(continueSecond.exitCode).toBe(0);
    expect(continueSecond.sessionId).toBeTruthy();

    // Critical: Context should still be preserved
    const continueResponseText = continueSecond.data as string;
    expect(continueResponseText.toLowerCase()).toContain('elephant');
  }, 360000); // 6 minute timeout for all tests
});
