/**
 * Codex Session Resumption Example
 * Demonstrates multi-turn conversations using session IDs
 */

import { AgentClient, createCodexAdapter } from '../../dist/index.js';

async function main() {
  const client = new AgentClient({ adapter: createCodexAdapter() });

  console.log('=== Codex Session Resumption Example ===\n');

  // First message - create a session
  console.log('📝 Creating initial session...\n');
  const session1 = await client.execute('Remember these three things: my name is Alice, I love pizza, and my favorite color is blue.', {
    fullAuto: true,
  });

  console.log('✅ Session created!');
  console.log('Session ID:', session1.sessionId);
  console.log('Response:', session1.output);
  console.log('Duration:', session1.duration, 'ms\n');

  // Second message - resume the session
  console.log('🔄 Resuming session to ask a question...\n');
  const session2 = await client.execute('What is my name?', {
    sessionId: session1.sessionId, // Resume with same session ID
    fullAuto: true,
  });

  console.log('✅ Session resumed!');
  console.log('Session ID:', session2.sessionId);
  console.log('Response:', session2.output);
  console.log('Duration:', session2.duration, 'ms\n');

  // Third message - test memory
  console.log('🔄 Testing memory of previous context...\n');
  const session3 = await client.execute('What food and color did I mention?', {
    sessionId: session1.sessionId, // Same session ID
    fullAuto: true,
  });

  console.log('✅ Context remembered!');
  console.log('Session ID:', session3.sessionId);
  console.log('Response:', session3.output);
  console.log('Duration:', session3.duration, 'ms\n');

  // Verify all session IDs match
  console.log('=== Verification ===');
  const allMatch = session1.sessionId === session2.sessionId &&
                   session2.sessionId === session3.sessionId;

  if (allMatch) {
    console.log('✅ All session IDs match:', session1.sessionId);
    console.log('✅ Session continuity maintained across', 3, 'messages');
  } else {
    console.log('❌ Session IDs do NOT match:');
    console.log('  Session 1:', session1.sessionId);
    console.log('  Session 2:', session2.sessionId);
    console.log('  Session 3:', session3.sessionId);
  }

  // Show token usage across the session
  console.log('\n=== Total Token Usage ===');
  const totalInputTokens =
    (session1.usage?.input_tokens || 0) +
    (session2.usage?.input_tokens || 0) +
    (session3.usage?.input_tokens || 0);

  const totalOutputTokens =
    (session1.usage?.output_tokens || 0) +
    (session2.usage?.output_tokens || 0) +
    (session3.usage?.output_tokens || 0);

  console.log('Total input tokens:', totalInputTokens);
  console.log('Total output tokens:', totalOutputTokens);
  console.log('Total tokens:', totalInputTokens + totalOutputTokens);
  console.log('\n✨ Session resumption example complete!');
}

main().catch((error) => {
  console.error('\n❌ Execution failed:');
  console.error('Error:', error.message);
  if (error.stack) {
    console.error('\nStack trace:', error.stack);
  }
  process.exit(1);
});
