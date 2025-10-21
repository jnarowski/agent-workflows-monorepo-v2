import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateWorkflowId } from './generateWorkflowId.js';

describe('generateWorkflowId', () => {
  const mockDate = new Date('2025-10-18T14:30:22Z'); // UTC time

  beforeEach(() => {
    // Mock Date to ensure consistent timestamps in tests
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('format validation', () => {
    it('should generate ID in YYYYMMDDHHMMSS-name format', () => {
      const id = generateWorkflowId('Test Feature');
      expect(id).toMatch(/^\d{14}-[a-z0-9-]+$/);
    });

    it('should use UTC timestamp', () => {
      const id = generateWorkflowId('Test');
      expect(id.startsWith('20251018143022-')).toBe(true);
    });

    it('should have exactly 14-digit timestamp', () => {
      const id = generateWorkflowId('Test');
      const timestamp = id.split('-')[0];
      expect(timestamp).toHaveLength(14);
      expect(timestamp).toBe('20251018143022');
    });

    it('should pad single-digit months/days/hours/minutes/seconds with zero', () => {
      vi.setSystemTime(new Date('2025-01-05T03:04:05Z'));
      const id = generateWorkflowId('Test');
      expect(id.startsWith('20250105030405-')).toBe(true);
    });
  });

  describe('name sanitization', () => {
    it('should sanitize workflow name to lowercase', () => {
      const id = generateWorkflowId('MyFeature');
      expect(id).toBe('20251018143022-myfeature');
    });

    it('should replace spaces with hyphens', () => {
      const id = generateWorkflowId('User Authentication');
      expect(id).toBe('20251018143022-user-authentication');
    });

    it('should replace special characters with hyphens', () => {
      const id = generateWorkflowId('API: Rate Limiting!!!');
      expect(id).toBe('20251018143022-api-rate-limiting');
    });

    it('should handle mixed case and special characters', () => {
      const id = generateWorkflowId('Feature @#$% Test');
      expect(id).toBe('20251018143022-feature-test');
    });

    it('should remove consecutive hyphens', () => {
      const id = generateWorkflowId('Test   Feature');
      expect(id).toBe('20251018143022-test-feature');
    });

    it('should trim leading and trailing hyphens', () => {
      const id = generateWorkflowId('!!!Feature!!!');
      expect(id).toBe('20251018143022-feature');
    });
  });

  describe('real-world examples', () => {
    it('should handle typical feature names', () => {
      expect(generateWorkflowId('User Authentication')).toBe('20251018143022-user-authentication');
      expect(generateWorkflowId('API Rate Limiting')).toBe('20251018143022-api-rate-limiting');
      expect(generateWorkflowId('Database Migration')).toBe('20251018143022-database-migration');
    });

    it('should handle JIRA-style ticket names', () => {
      expect(generateWorkflowId('PROJ-123: Add User Login')).toBe('20251018143022-proj-123-add-user-login');
      expect(generateWorkflowId('FEAT-456 - Email Notifications')).toBe(
        '20251018143022-feat-456-email-notifications'
      );
    });

    it('should handle GitHub issue titles', () => {
      expect(generateWorkflowId('Fix: Login button not working')).toBe(
        '20251018143022-fix-login-button-not-working'
      );
      expect(generateWorkflowId('[BUG] API returns 500 error')).toBe('20251018143022-bug-api-returns-500-error');
    });
  });

  describe('long names', () => {
    it('should truncate very long names to 50 characters', () => {
      const longName = 'This is a very long feature name that definitely exceeds fifty characters in total';
      const id = generateWorkflowId(longName);
      const namePart = id.substring(15); // Skip "YYYYMMDDHHMMSS-"
      expect(namePart.length).toBeLessThanOrEqual(50);
    });

    it('should not truncate names under 50 characters', () => {
      const shortName = 'Short Feature Name';
      const id = generateWorkflowId(shortName);
      expect(id).toBe('20251018143022-short-feature-name');
    });
  });

  describe('edge cases', () => {
    it('should throw error for empty string', () => {
      expect(() => generateWorkflowId('')).toThrow('Workflow name must be a non-empty string');
    });

    it('should throw error for only special characters', () => {
      expect(() => generateWorkflowId('!@#$%^&*()')).toThrow(
        'Workflow name must contain at least one alphanumeric character'
      );
    });

    it('should handle single character names', () => {
      expect(generateWorkflowId('a')).toBe('20251018143022-a');
      expect(generateWorkflowId('1')).toBe('20251018143022-1');
    });

    it('should handle names with numbers', () => {
      expect(generateWorkflowId('Feature 123')).toBe('20251018143022-feature-123');
      expect(generateWorkflowId('v1.2.3')).toBe('20251018143022-v1-2-3');
    });
  });

  describe('timestamp consistency', () => {
    it('should use same timestamp for multiple calls in same instant', () => {
      const id1 = generateWorkflowId('Test 1');
      const id2 = generateWorkflowId('Test 2');

      const timestamp1 = id1.split('-')[0];
      const timestamp2 = id2.split('-')[0];

      expect(timestamp1).toBe(timestamp2);
      expect(timestamp1).toBe('20251018143022');
    });

    it('should generate different timestamps when time advances', () => {
      const id1 = generateWorkflowId('Test 1');

      // Advance time by 1 second
      vi.advanceTimersByTime(1000);

      const id2 = generateWorkflowId('Test 2');

      const timestamp1 = id1.split('-')[0];
      const timestamp2 = id2.split('-')[0];

      expect(timestamp1).toBe('20251018143022');
      expect(timestamp2).toBe('20251018143023');
    });
  });

  describe('format components', () => {
    it('should format year correctly', () => {
      vi.setSystemTime(new Date('2030-06-15T12:00:00Z'));
      const id = generateWorkflowId('Test');
      expect(id.startsWith('2030')).toBe(true);
    });

    it('should format month correctly', () => {
      vi.setSystemTime(new Date('2025-12-31T23:59:59Z'));
      const id = generateWorkflowId('Test');
      expect(id.substring(4, 6)).toBe('12');
    });

    it('should format day correctly', () => {
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
      const id = generateWorkflowId('Test');
      expect(id.substring(6, 8)).toBe('15');
    });

    it('should format hour correctly (24-hour format)', () => {
      vi.setSystemTime(new Date('2025-01-01T23:00:00Z'));
      const id = generateWorkflowId('Test');
      expect(id.substring(8, 10)).toBe('23');
    });

    it('should format minute correctly', () => {
      vi.setSystemTime(new Date('2025-01-01T12:45:00Z'));
      const id = generateWorkflowId('Test');
      expect(id.substring(10, 12)).toBe('45');
    });

    it('should format second correctly', () => {
      vi.setSystemTime(new Date('2025-01-01T12:00:59Z'));
      const id = generateWorkflowId('Test');
      expect(id.substring(12, 14)).toBe('59');
    });
  });
});
