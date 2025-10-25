/**
 * Simple example: Basic Claude adapter usage
 */

import { ClaudeAdapter } from '../../src/index.js';

async function main() {
  // Create adapter directly
  const claude = new ClaudeAdapter({
    verbose: true,
  });

  console.log('Executing prompt...\n');

  // Execute a simple prompt
  const result = await claude.execute('What is 2 + 2?', {
    onOutput: (data) => {
      process.stdout.write(data.raw);
    },
  });

  console.log('\n\n=== Results ===');
  console.log('Session ID:', result.sessionId);
  console.log('Status:', result.status);
  console.log('Duration:', result.duration, 'ms');
  console.log('Output:', result.data);

  // Show error details if execution failed
  if (result.status === 'error' && result.error) {
    console.log('\n=== Error Details ===');
    console.log('Code:', result.error.code);
    console.log('Message:', result.error.message);
    if (result.error.details) {
      console.log('Details:', result.error.details);
    }
    if (result.raw?.stderr) {
      console.log('Stderr:', result.raw.stderr);
    }
  }

  if (result.usage) {
    console.log('\n=== Token Usage ===');
    console.log('Input tokens:', result.usage.inputTokens);
    console.log('Output tokens:', result.usage.outputTokens);
    console.log('Total tokens:', result.usage.totalTokens);
  }
}

main().catch((error) => {
  console.error('\n❌ Execution failed:');
  console.error('Error:', error.message);
  if (error.stack) {
    console.error('\nStack trace:', error.stack);
  }
  process.exit(1);
});
