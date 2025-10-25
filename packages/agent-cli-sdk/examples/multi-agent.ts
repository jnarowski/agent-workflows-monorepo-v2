/**
 * Multi-Agent Example
 *
 * Demonstrates how to use the getAdapter() helper to dynamically
 * select between different AI agents (Claude, Codex, etc.).
 *
 * Run with:
 *   npx tsx examples/multi-agent.ts claude
 *   npx tsx examples/multi-agent.ts codex
 */

import { getAdapter } from '../src/index.js';

async function main() {
  // Get agent name from command line args
  const agentName = process.argv[2] || 'claude';

  console.log(`=== Multi-Agent Example (${agentName}) ===\n`);

  // Use getAdapter() to dynamically select the adapter
  // TypeScript will correctly infer the adapter type
  const adapter = getAdapter(agentName as 'claude' | 'codex', {
    verbose: true,
  });

  console.log(`✓ Selected adapter: ${adapter.name}\n`);

  // Execute a simple prompt
  console.log('Executing prompt...\n');
  const result = await adapter.execute('What is your name and what can you do?', {
    onOutput: (data) => {
      process.stdout.write(data.raw);
    },
  });

  console.log('\n\n=== Results ===');
  console.log('Adapter:', adapter.name);
  console.log('Session ID:', result.sessionId);
  console.log('Status:', result.status);
  console.log('Duration:', result.duration, 'ms');

  if (result.usage) {
    console.log('\n=== Token Usage ===');
    console.log('Input tokens:', result.usage.inputTokens);
    console.log('Output tokens:', result.usage.outputTokens);
    console.log('Total tokens:', result.usage.totalTokens);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Multi-agent example complete!');
  console.log('  Try running with different agents:');
  console.log('  - npx tsx examples/multi-agent.ts claude');
  console.log('  - npx tsx examples/multi-agent.ts codex');
  console.log('='.repeat(50));
}

main().catch((error) => {
  console.error('\n❌ Execution failed:');
  console.error('Error:', error.message);
  if (error.message.includes('not yet implemented')) {
    console.error('\n  This adapter is not yet implemented.');
    console.error('  Try using "claude" or "codex" instead.');
  }
  process.exit(1);
});
