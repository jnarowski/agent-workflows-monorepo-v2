/**
 * Simple chat session example
 *
 * Demonstrates:
 * - Session-based conversation with context
 * - Simple chat loop
 * - Multi-line input with Alt+Enter (Option+Enter on Mac)
 * - Loading indicator during agent processing
 * - User can continue chatting until typing "done"
 */

import { createInterface } from 'node:readline';
import { emitKeypressEvents } from 'node:readline';
import { AgentClient, createClaudeAdapter } from '../../src';

/**
 * Create a readline interface for user input
 */
function createReadline() {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Loading spinner animation
 */
class LoadingSpinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;
  private intervalId?: NodeJS.Timeout;
  private isActive = false;

  start(message = 'Thinking') {
    if (this.isActive) return;
    this.isActive = true;
    this.currentFrame = 0;

    // Hide cursor
    process.stdout.write('\x1B[?25l');

    this.intervalId = setInterval(() => {
      const frame = this.frames[this.currentFrame];
      process.stdout.write(`\r${frame} ${message}...`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 80);
  }

  stop() {
    if (!this.isActive) return;
    this.isActive = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Clear the spinner line and show cursor
    process.stdout.write('\r\x1B[K');
    process.stdout.write('\x1B[?25h');
  }
}

/**
 * Prompt user for multi-line input with Alt+Enter support
 */
function promptUserMultiline(question: string): Promise<string> {
  return new Promise((resolve) => {
    const lines: string[] = [];
    let currentLine = '';

    process.stdout.write(question);

    // Enable raw mode to capture individual keypresses
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    emitKeypressEvents(process.stdin);

    const onKeypress = (char: string, key: any) => {
      if (!key) return;

      // Handle Ctrl+C to exit
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
        return;
      }

      // Handle Alt+Enter (Option+Enter on Mac) for new line
      if ((key.name === 'return' || key.sequence === '\r' || key.sequence === '\n') && key.meta) {
        lines.push(currentLine);
        currentLine = '';
        process.stdout.write('\n' + ' '.repeat(question.length));
        return;
      }

      // Handle plain Enter to submit
      if (key.name === 'return' || key.sequence === '\r' || key.sequence === '\n') {
        lines.push(currentLine);
        process.stdout.write('\n');
        cleanup();
        resolve(lines.join('\n'));
        return;
      }

      // Handle backspace
      if (key.name === 'backspace' || key.sequence === '\x7f' || key.sequence === '\b') {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          process.stdout.write('\b \b');
        } else if (lines.length > 0) {
          // Move to previous line
          currentLine = lines.pop() || '';
          const moveCursor = `\x1B[A\x1B[${question.length + currentLine.length}C`;
          process.stdout.write(moveCursor);
        }
        return;
      }

      // Handle regular character input
      if (char && !key.ctrl && !key.meta) {
        currentLine += char;
        process.stdout.write(char);
      }
    };

    const cleanup = () => {
      process.stdin.removeListener('keypress', onKeypress);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
    };

    process.stdin.on('keypress', onKeypress);
  });
}

/**
 * Parse and display only the text content from Claude's output
 * Now using the enhanced OutputData which provides pre-extracted text
 */
function createTextOnlyOutput() {
  return (data: import('../../src/types/index.js').OutputData) => {
    // Use the pre-extracted text if available
    if (data.text) {
      process.stdout.write(data.text);
      return;
    }

    // Fallback: parse events manually
    if (data.events) {
      for (const event of data.events) {
        const parsed = event as any;
        if (parsed.type === 'assistant' && parsed.message?.content) {
          for (const content of parsed.message.content) {
            if (content.type === 'text' && content.text) {
              process.stdout.write(content.text);
            }
          }
        } else if (parsed.type === 'error') {
          process.stdout.write(`\n❌ Error: ${parsed.error}\n`);
        }
      }
    }
  };
}

/**
 * Main chat session
 */
async function main() {
  // Check if running in interactive mode (has TTY)
  const isInteractive = process.stdin.isTTY;

  if (!isInteractive) {
    console.log('⚠️  This example requires an interactive terminal (TTY).');
    console.log('Run it directly in your terminal, not via npm/pnpm scripts.\n');
    console.log('Examples:');
    console.log('  tsx examples/advanced/dynamic-scoping-session.ts');
    console.log('  bun examples/advanced/dynamic-scoping-session.ts\n');
    process.exit(1);
  }

  const client = new AgentClient({
    adapter: createClaudeAdapter(),
  });

  const spinner = new LoadingSpinner();

  console.log('💬 Simple Chat Session');
  console.log('======================\n');
  console.log('Chat with Claude about your project.');
  console.log('💡 Tip: Press Alt+Enter (Option+Enter on Mac) for new line, Enter to submit');
  console.log('Type "done" when you want to end the conversation.\n');

  try {
    // Get initial project description from user
    const projectDescription = await promptUserMultiline(
      '💡 Describe your project idea (or press Enter for example): '
    );

    // Use default if user doesn't provide input
    const initialPrompt = projectDescription.trim() || 'I want to build a Next.js ecommerce app';

    console.log(`\n📋 Starting chat about: "${initialPrompt}"\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Create session with text-only output
    const session = client.createSession({
      onOutput: createTextOnlyOutput(),
    });

    // Send initial prompt
    console.log('🤖 ');
    spinner.start('Agent is thinking');
    await session.send(initialPrompt);
    spinner.stop();
    console.log('\n');

    // Simple chat loop
    while (true) {
      // Prompt user for next message
      const userMessage = await promptUserMultiline('💭 You (or "done" to finish): ');

      // Check if user wants to end the session
      const trimmed = userMessage.trim().toLowerCase();
      if (trimmed === 'done' || trimmed === 'finished' || trimmed === 'exit') {
        console.log('\n✅ Chat session complete!\n');
        break;
      }

      if (!userMessage.trim()) {
        console.log('⚠️  Please type a message or "done" to finish.\n');
        continue;
      }

      // Send user's message to the session
      console.log('\n🤖 ');
      spinner.start('Agent is thinking');
      await session.send(userMessage);
      spinner.stop();
      console.log('\n');
    }

    // Display session stats
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SESSION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Session ID: ${session.sessionId}`);
    console.log(`Total messages: ${session.messageCount}`);
    console.log('\n✨ Thanks for chatting!\n');
  } catch (error) {
    spinner.stop(); // Make sure spinner is stopped on error
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n👋 Interrupted. Cleaning up...');
  process.exit(0);
});

main().catch(console.error);
