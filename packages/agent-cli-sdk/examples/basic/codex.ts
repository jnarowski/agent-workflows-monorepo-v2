/**
 * Simple Codex adapter usage example
 * Based on Codex CLI 0.46.0
 */

import { CodexAdapter } from '../../dist/index.js';

async function main() {
  console.log('=== Codex Adapter - Simple Usage ===\n');

  // Create adapter
  const codex = new CodexAdapter();

  // Option 1: Basic execution with full-auto
  console.log('1. Basic execution:');
  try {
    const result1 = await codex.execute('What is 2 + 2?', {
      fullAuto: true,
      onEvent: (event) => {
        console.log(`[Event: ${event.type}]`);
      },
    });

    console.log('\n✓ Execution complete!');
    console.log('Session ID:', result1.sessionId);
    console.log('Output:', result1.output);
    console.log('Duration:', result1.duration, 'ms');
    console.log('Usage:', result1.usage);
  } catch (error) {
    console.error('✗ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Option 2: Session resumption
  console.log('2. Session resumption:');
  try {
    // Create a session
    const session1 = await codex.execute('Remember the number 42', {
      fullAuto: true,
    });

    console.log('✓ Created session:', session1.sessionId);
    console.log('Response:', session1.output);

    // Resume the session
    const session2 = await codex.execute('What number did I tell you to remember?', {
      sessionId: session1.sessionId,
      resume: true,
      fullAuto: true,
    });

    console.log('\n✓ Resumed session:', session2.sessionId);
    console.log('Response:', session2.output);
  } catch (error) {
    console.error('✗ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Option 3: Different sandbox modes
  console.log('3. Using different sandbox modes:');
  try {
    const result3 = await codex.execute('Say hello', {
      sandbox: 'read-only',
      fullAuto: true,
    });

    console.log('\n✓ Execution complete (read-only sandbox)!');
    console.log('Output:', result3.output);
  } catch (error) {
    console.error('✗ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Option 4: Streaming with reasoning
  console.log('4. Streaming with reasoning extraction:');
  try {
    const result4 = await codex.execute('Explain quantum computing in one sentence', {
      fullAuto: true,
      onEvent: (event) => {
        if (event.type === 'item.completed' && event.data?.item?.type === 'reasoning') {
          console.log('Reasoning:', event.data.item.text);
        }
      },
    });

    console.log('\n✓ Execution complete!');
    console.log('Output:', result4.output);
    if (result4.metadata.reasoning && result4.metadata.reasoning.length > 0) {
      console.log('\nReasoning steps:');
      result4.metadata.reasoning.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r}`);
      });
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');
  console.log('✓ All examples complete!');
}

main().catch(console.error);
