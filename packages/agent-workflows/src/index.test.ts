import { describe, it, expect } from 'vitest';
import { version } from './index';

describe('agent-workflows', () => {
  it('should export version', () => {
    expect(version).toBe('0.1.0');
  });

  it('should have a valid version string', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
