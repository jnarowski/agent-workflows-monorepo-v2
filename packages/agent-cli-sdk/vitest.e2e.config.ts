import { defineConfig } from 'vitest/config';
import { homedir } from 'os';
import { join } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Don't use setup.ts for E2E tests - it sets mock CLI paths
    // setupFiles: ['./tests/setup.ts'],
    include: ['tests/e2e/**/*.test.ts'],
    // Don't exclude E2E tests
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
    testTimeout: 90000, // 90s for E2E tests
    // Set default CLI paths if not already set
    // Leave env vars unset to use auto-detection via PATH
    env: {
      CLAUDE_CLI_PATH: process.env.CLAUDE_CLI_PATH,
      CODEX_CLI_PATH: process.env.CODEX_CLI_PATH,
    },
  },
});
