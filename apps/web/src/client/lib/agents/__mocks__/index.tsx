import { vi } from 'vitest';

export const getAgent = vi.fn(() => ({
  transformMessages: vi.fn((msgs) => msgs),
  transformStreaming: vi.fn(() => null),
}));
