/**
 * E2E tests for Gemini CLI integration - Session Management
 *
 * ⚠️ IMPORTANT LIMITATION: Gemini CLI does NOT support session resumption.
 * Unlike Claude Code and Codex, Gemini creates a new session on each invocation.
 * Each call is independent and has no context from previous calls.
 *
 * This test demonstrates the limitation and verifies the expected behavior.
 *
 * These tests require Gemini CLI to be installed.
 * Set GEMINI_CLI_PATH environment variable to specify the CLI location.
 */

import { describe, it, expect } from 'vitest';
import { execute } from '../../../src/gemini/execute.js';
import { detectCli } from '../../../src/gemini/detectCli.js';

describe('E2E: Gemini Session Management', () => {
  it('should NOT preserve context across executions (Gemini limitation)', async () => {
    const cliPath = detectCli();

    // Skip if CLI not installed
    if (!cliPath) {
      console.warn('Gemini CLI not found. Skipping E2E tests.');
      return;
    }

    // Test 1: Create a session with context (tell Gemini our name)
    const firstResult = await execute({
      prompt: 'My name is Tony. Please acknowledge this and say my name back to me.',
      permissionMode: 'acceptEdits',
      timeout: 60000,
    });

    // Skip test if quota exceeded
    if (firstResult.error?.includes('Quota exceeded') || firstResult.error?.includes('rate limit')) {
      console.warn('Gemini API quota exceeded. Skipping E2E tests.');
      return;
    }

    expect(firstResult.success).toBe(true);
    expect(firstResult.exitCode).toBe(0);
    expect(firstResult.sessionId).toBeTruthy();
    expect(firstResult.messages.length).toBeGreaterThanOrEqual(0);
    expect(firstResult.duration).toBeGreaterThan(0);

    // Verify the AI acknowledged the name in the first response
    const firstResponse = firstResult.data as string;
    expect(firstResponse.toLowerCase()).toContain('tony');

    // Save the session ID from the first execution
    const sessionId = firstResult.sessionId;

    // Test 2: Try to "resume" the session and ask for the name
    // ⚠️ This creates a NEW session in Gemini, so it won't remember
    const secondResult = await execute({
      prompt: 'What is my name?',
      sessionId, // This is tracked by our SDK but ignored by Gemini CLI
      resume: true, // This flag is ignored by Gemini CLI
      permissionMode: 'acceptEdits',
      timeout: 60000,
    });

    expect(secondResult.success).toBe(true);
    expect(secondResult.exitCode).toBe(0);

    // Critical: Gemini creates a NEW session ID on each invocation
    // The session IDs should be DIFFERENT
    expect(secondResult.sessionId).not.toBe(sessionId);
    expect(secondResult.sessionId).toBeTruthy();

    // Critical difference from Codex:
    // Gemini will NOT remember "Tony" because it's a new session
    const responseText = secondResult.data as string;

    // The response should indicate Gemini doesn't know the name
    // (might say "I don't know" or ask who you are, etc.)
    // We verify it does NOT confidently state "Tony"
    const lowerResponse = responseText.toLowerCase();

    // Gemini should either:
    // 1. Say it doesn't know
    // 2. Ask for clarification
    // 3. NOT mention "Tony" at all
    //
    // This is the expected behavior since Gemini creates new sessions
    const knowsName = lowerResponse.includes('tony') &&
                     !lowerResponse.includes("don't know") &&
                     !lowerResponse.includes("don't have") &&
                     !lowerResponse.includes("cannot");

    // This assertion documents the limitation
    expect(knowsName).toBe(false);

    console.log('\n⚠️  Gemini Session Limitation Verified:');
    console.log('First session ID:', sessionId);
    console.log('Second session ID:', secondResult.sessionId);
    console.log('Sessions are different?', sessionId !== secondResult.sessionId);
    console.log('\nFirst call: Told Gemini my name is Tony');
    console.log('Second call: Asked what my name is');
    console.log('Result: Gemini does NOT remember (creates new session each time)');
    console.log('Response:', responseText.substring(0, 200));
  }, 120000); // 2 minute timeout
});
