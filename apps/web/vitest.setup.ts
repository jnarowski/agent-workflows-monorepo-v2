import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Set required environment variables for tests
process.env.JWT_SECRET = 'test-jwt-secret-for-vitest';
// DATABASE_URL is set in vitest.global-setup.ts (runs before this file)

expect.extend(matchers);

// Suppress happy-dom AbortError messages during teardown
// These are harmless cleanup errors that occur when Vitest tears down the test environment
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = args.join(' ');

  // Filter out happy-dom AbortError stack traces
  if (message.includes('DOMException [AbortError]') ||
      message.includes('Fetch.onAsyncTaskManagerAbort') ||
      message.includes('The operation was aborted')) {
    return; // Silently ignore
  }

  // Pass through all other errors
  originalConsoleError.apply(console, args);
};
