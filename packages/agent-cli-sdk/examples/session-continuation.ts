/**
 * Session Continuation Example
 *
 * Demonstrates how to maintain context across multiple messages
 * using sessionId and the resume option.
 *
 * Run with:
 *   npx tsx examples/session-continuation.ts
 */

import { ClaudeAdapter } from '../src/index.js';

async function main() {
  console.log('=== Session Continuation Example ===\n');

  const claude = new ClaudeAdapter();

  // First message - creates a new session
  console.log('1. Creating initial session...\n');
  const result1 = await claude.execute('Remember this: my favorite color is blue', {
    onOutput: (data) => {
      process.stdout.write(data.raw);
    },
  });

  console.log('\n\n✓ Session created:', result1.sessionId);
  console.log('  Status:', result1.status);
  console.log('  Duration:', result1.duration, 'ms\n');

  // Second message - continue the session
  console.log('2. Continuing session with context...\n');
  const result2 = await claude.execute('What is my favorite color?', {
    sessionId: result1.sessionId, // Reuse the session ID
    resume: true, // Continue from previous state
    onOutput: (data) => {
      process.stdout.write(data.raw);
    },
  });

  console.log('\n\n✓ Session continued:', result2.sessionId);
  console.log('  Status:', result2.status);
  console.log('  Duration:', result2.duration, 'ms\n');

  // Third message - another turn in the same session
  console.log('3. Adding more context to the session...\n');
  const result3 = await claude.execute('Now remember: my favorite number is 42', {
    sessionId: result1.sessionId,
    resume: true,
    onOutput: (data) => {
      process.stdout.write(data.raw);
    },
  });

  console.log('\n\n✓ Session updated:', result3.sessionId);
  console.log('  Status:', result3.status);
  console.log('  Duration:', result3.duration, 'ms\n');

  // Fourth message - test that both pieces of context are retained
  console.log('4. Testing context retention...\n');
  const result4 = await claude.execute(
    'What are my favorite color and number? Answer in one sentence.',
    {
      sessionId: result1.sessionId,
      resume: true,
      onOutput: (data) => {
        process.stdout.write(data.raw);
      },
    }
  );

  console.log('\n\n✓ Final result:', result4.sessionId);
  console.log('  Status:', result4.status);
  console.log('  Duration:', result4.duration, 'ms\n');

  console.log('='.repeat(50));
  console.log('✅ Session continuation example complete!');
  console.log('  All messages maintained shared context');
  console.log('  Session ID:', result1.sessionId);
  console.log('='.repeat(50));
}

main().catch((error) => {
  console.error('\n❌ Execution failed:');
  console.error('Error:', error.message);
  process.exit(1);
});
