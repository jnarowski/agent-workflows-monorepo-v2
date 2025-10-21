import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  // Ignore Turborepo's cache and log directories to prevent infinite rebuild loops
  ignoreWatch: [
    '**/node_modules/**',
    '**/.turbo/**',
    '**/dist/**',
    '**/.agent/**',
  ],
});
