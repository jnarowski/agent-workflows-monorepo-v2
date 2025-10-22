import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Use 'happy-dom' for client tests, 'node' for server tests
    environment: 'happy-dom',
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/types/**',
      ],
    },
    // Use different environment for server tests
    environmentMatchGlobs: [
      ['src/server/**/*.test.ts', 'node'],
      ['src/client/**/*.test.ts', 'happy-dom'],
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/client'),
    },
  },
});
