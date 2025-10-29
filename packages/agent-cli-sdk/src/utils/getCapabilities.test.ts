import { describe, it, expect } from 'vitest';
import { getCapabilities, type AgentType } from './getCapabilities.js';

describe('getCapabilities', () => {
  describe('claude', () => {
    it('should return capabilities for claude agent', () => {
      const caps = getCapabilities('claude');

      expect(caps.supportsSlashCommands).toBe(true);
      expect(caps.supportsModels).toBe(true);
      expect(caps.models).toHaveLength(2);
      expect(caps.models[0]).toEqual({ id: 'claude-opus-4-20250514', name: 'Opus 4.1' });
      expect(caps.models[1]).toEqual({ id: 'claude-sonnet-4-5-20250929', name: 'Sonnet 4.5' });
    });
  });

  describe('codex', () => {
    it('should return capabilities for codex agent', () => {
      const caps = getCapabilities('codex');

      expect(caps.supportsSlashCommands).toBe(false);
      expect(caps.supportsModels).toBe(true);
      expect(caps.models).toHaveLength(2);
      expect(caps.models[0]).toEqual({ id: 'gpt-5-codex', name: 'GPT-5 Codex' });
      expect(caps.models[1]).toEqual({ id: 'gpt-5', name: 'GPT-5' });
    });
  });

  describe('cursor', () => {
    it('should return capabilities for cursor agent (not implemented)', () => {
      const caps = getCapabilities('cursor');

      expect(caps.supportsSlashCommands).toBe(false);
      expect(caps.supportsModels).toBe(false);
      expect(caps.models).toHaveLength(0);
    });
  });

  describe('gemini', () => {
    it('should return capabilities for gemini agent (not implemented)', () => {
      const caps = getCapabilities('gemini');

      expect(caps.supportsSlashCommands).toBe(false);
      expect(caps.supportsModels).toBe(false);
      expect(caps.models).toHaveLength(0);
    });
  });

  describe('all agents', () => {
    it('should have capabilities for all agent types', () => {
      const agents: AgentType[] = ['claude', 'codex', 'cursor', 'gemini'];

      agents.forEach(agent => {
        const caps = getCapabilities(agent);
        expect(caps).toBeDefined();
        expect(caps).toHaveProperty('supportsSlashCommands');
        expect(caps).toHaveProperty('supportsModels');
        expect(caps).toHaveProperty('models');
        expect(Array.isArray(caps.models)).toBe(true);
      });
    });
  });
});
