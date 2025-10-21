/**
 * Session example: Interactive multi-turn conversation
 */

import { AgentClient, createClaudeAdapter } from '../../src/index.js';

async function main() {
  // Create client
  const client = new AgentClient({
    adapter: createClaudeAdapter(),
  });

  console.log('Starting multi-turn session...\n');

  // Create a session
  const session = client.createSession({
    onOutput: (data) => process.stdout.write(data.raw),
  });

  // Send multiple messages in sequence
  console.log('=== Message 1 ===');
  const msg1 = await session.send('My name is Earl');

  console.log('\n=== Message 2 ===');
  const msg2 = await session.send('What is my name?');

  console.log(session);

  console.log('\n\n=== Session Summary ===');
  console.log('Session ID:', session.sessionId);
  console.log('Messages sent:', session.messageCount);
  console.log('Started at:', new Date(session.startedAt).toISOString());
  console.log('Last message at:', session.lastMessageAt ? new Date(session.lastMessageAt).toISOString() : 'N/A');

  // Show total token usage
  const totalTokens = [msg1, msg2].reduce((sum, msg) => {
    return sum + (msg.usage?.totalTokens || 0);
  }, 0);
  console.log('Total tokens used:', totalTokens);
}

main().catch(console.error);
