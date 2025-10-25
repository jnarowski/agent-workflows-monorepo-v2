/**
 * Streaming Example
 *
 * Demonstrates how to use onOutput and onEvent callbacks
 * to handle real-time streaming output from AI CLIs.
 *
 * Run with:
 *   npx tsx examples/streaming.ts
 */

import { ClaudeAdapter, isUserMessageEvent, isAssistantMessageEvent } from '../src/index.js';

async function main() {
  console.log('=== Streaming Example ===\n');

  const claude = new ClaudeAdapter();

  // Example 1: Simple output streaming
  console.log('1. Simple output streaming:\n');
  await claude.execute('Write a haiku about coding', {
    onOutput: (data) => {
      // Stream raw output directly to stdout
      process.stdout.write(data.raw);
    },
  });

  console.log('\n\n' + '='.repeat(50) + '\n');

  // Example 2: Event-based streaming with type guards
  console.log('2. Event-based streaming with type safety:\n');
  let messageCount = 0;

  await claude.execute('Explain recursion in 2 sentences', {
    onEvent: (event) => {
      // Use type guards for type-safe event handling
      if (isUserMessageEvent(event)) {
        console.log('📤 User message:', event.data.message.slice(0, 50) + '...');
        messageCount++;
      } else if (isAssistantMessageEvent(event)) {
        console.log('📥 Assistant response:', event.data.message.slice(0, 50) + '...');
        messageCount++;
      }
    },
  });

  console.log(`\n✓ Processed ${messageCount} messages\n`);
  console.log('='.repeat(50) + '\n');

  // Example 3: Combined output and event streaming
  console.log('3. Combined streaming (output + events):\n');
  let outputLength = 0;
  const events: string[] = [];

  const result = await claude.execute('What is 2 + 2?', {
    onOutput: (data) => {
      outputLength += data.raw.length;
      process.stdout.write(data.raw);
    },
    onEvent: (event) => {
      events.push(event.type);
    },
  });

  console.log('\n\n✓ Streaming complete!');
  console.log('  Output length:', outputLength, 'characters');
  console.log('  Events received:', events.length);
  console.log('  Event types:', [...new Set(events)].join(', '));
  console.log('  Final status:', result.status);
  console.log('  Session ID:', result.sessionId);

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 4: Buffered streaming (collect chunks)
  console.log('4. Buffered streaming:\n');
  const chunks: string[] = [];

  await claude.execute('Count from 1 to 5', {
    onOutput: (data) => {
      chunks.push(data.raw);
      process.stdout.write('.');
    },
  });

  console.log('\n\n✓ Collected', chunks.length, 'chunks');
  console.log('  First chunk:', chunks[0]?.slice(0, 30) + '...');
  console.log('  Last chunk:', chunks[chunks.length - 1]?.slice(0, 30) + '...');

  console.log('\n' + '='.repeat(50));
  console.log('✅ Streaming example complete!');
  console.log('='.repeat(50));
}

main().catch((error) => {
  console.error('\n❌ Execution failed:');
  console.error('Error:', error.message);
  process.exit(1);
});
