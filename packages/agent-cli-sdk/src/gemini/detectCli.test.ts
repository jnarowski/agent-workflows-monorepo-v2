/**
 * Tests for Gemini CLI detection.
 */

import { describe, it, expect } from 'vitest';
import { detectCli } from './detectCli.js';

describe('detectCli', () => {
  it('should return a string or null', () => {
    const result = detectCli();
    expect(result === null || typeof result === 'string').toBe(true);
  });

  it('should return a valid path if CLI is found', () => {
    const result = detectCli();

    if (result !== null) {
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    }
  });

  it('should respect GEMINI_CLI_PATH environment variable', () => {
    const originalEnv = process.env.GEMINI_CLI_PATH;

    // Set to a fake path that doesn't exist
    process.env.GEMINI_CLI_PATH = '/fake/path/to/gemini';
    const result = detectCli();

    // Should not use the fake path since it doesn't exist
    if (result !== null) {
      expect(result).not.toBe('/fake/path/to/gemini');
    }

    // Restore original env
    if (originalEnv) {
      process.env.GEMINI_CLI_PATH = originalEnv;
    } else {
      delete process.env.GEMINI_CLI_PATH;
    }
  });
});
