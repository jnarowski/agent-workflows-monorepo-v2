import { describe, it, expect } from 'vitest';
import { parseJsonResponse, parseJsonResponseStrict } from './parseJsonResponse.js';
import type { ExecutionResponse } from '../types/workflow.js';

describe('parseJsonResponse', () => {
  describe('when response.data is already an object (responseSchema used)', () => {
    it('returns the data directly', () => {
      const response: ExecutionResponse<{ success: boolean }> = {
        status: 'success',
        data: { success: true },
        sessionId: 'test-session',
        exitCode: 0,
        duration: 1000,
        metadata: {},
      };

      const result = parseJsonResponse(response);
      expect(result).toEqual({ success: true });
    });

    it('handles complex objects', () => {
      const response: ExecutionResponse<{ data: { nested: boolean } }> = {
        status: 'success',
        data: { data: { nested: true } },
        sessionId: 'test-session',
        exitCode: 0,
        duration: 1000,
        metadata: {},
      };

      const result = parseJsonResponse(response);
      expect(result).toEqual({ data: { nested: true } });
    });
  });

  describe('when JSON is in markdown code blocks', () => {
    it('extracts JSON from ```json block', () => {
      const response: ExecutionResponse<string> = {
        status: 'success',
        data: 'Here is the result:\n```json\n{"success": true, "count": 5}\n```\nDone!',
        sessionId: 'test-session',
        exitCode: 0,
        duration: 1000,
        metadata: {},
      };

      const result = parseJsonResponse(response);
      expect(result).toEqual({ success: true, count: 5 });
    });

    it('extracts JSON from ``` block without language tag', () => {
      const response = createStringResponse('Result:\n```\n{"value": 42}\n```');
      const result = parseJsonResponse(response);
      expect(result).toEqual({ value: 42 });
    });

    it('handles code blocks with extra whitespace', () => {
      const response = createStringResponse('```json\n\n  {"data": "test"}  \n\n```');
      const result = parseJsonResponse(response);
      expect(result).toEqual({ data: 'test' });
    });

    it('extracts JSON array from code block', () => {
      const response = createStringResponse('```json\n[1, 2, 3]\n```');
      const result = parseJsonResponse(response);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('when JSON is mixed with text', () => {
    it('extracts JSON object from mixed content', () => {
      const response = createStringResponse('Analysis complete.\n\n{"success": true, "count": 5}\n\nDone!');
      const result = parseJsonResponse(response);
      expect(result).toEqual({ success: true, count: 5 });
    });

    it('extracts JSON array from mixed content', () => {
      const response = createStringResponse('Items found:\n["apple", "banana", "cherry"]\nEnd of list.');
      const result = parseJsonResponse(response);
      expect(result).toEqual(['apple', 'banana', 'cherry']);
    });

    it('returns first valid JSON when multiple objects present', () => {
      const response = createStringResponse('{"a": 1}\n{"b": 2}');
      const result = parseJsonResponse(response);
      expect(result).toEqual({ a: 1 });
    });

    it('handles nested JSON structures', () => {
      const response = createStringResponse('Result:\n{"outer": {"inner": {"value": 42}}}\nDone.');
      const result = parseJsonResponse(response);
      expect(result).toEqual({ outer: { inner: { value: 42 } } });
    });
  });

  describe('when output is pure JSON', () => {
    it('parses pure JSON object', () => {
      const response = createStringResponse('{"pure": true}');
      const result = parseJsonResponse(response);
      expect(result).toEqual({ pure: true });
    });

    it('parses pure JSON array', () => {
      const response = createStringResponse('[1, 2, 3]');
      const result = parseJsonResponse(response);
      expect(result).toEqual([1, 2, 3]);
    });

    it('handles JSON with whitespace', () => {
      const response = createStringResponse('  \n  {"trimmed": true}  \n  ');
      const result = parseJsonResponse(response);
      expect(result).toEqual({ trimmed: true });
    });
  });

  describe('when no valid JSON exists', () => {
    it('returns null for plain text', () => {
      const response = createStringResponse('This is just plain text with no JSON.');
      const result = parseJsonResponse(response);
      expect(result).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      const response = createStringResponse('{invalid json}');
      const result = parseJsonResponse(response);
      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      const response = createStringResponse('');
      const result = parseJsonResponse(response);
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles JSON with special characters', () => {
      const response = createStringResponse('{"message": "Line 1\\nLine 2\\tTabbed"}');
      const result = parseJsonResponse(response);
      expect(result).toEqual({ message: 'Line 1\nLine 2\tTabbed' });
    });

    it('handles empty JSON object', () => {
      const response = createStringResponse('{}');
      const result = parseJsonResponse(response);
      expect(result).toEqual({});
    });

    it('handles empty JSON array', () => {
      const response = createStringResponse('[]');
      const result = parseJsonResponse(response);
      expect(result).toEqual([]);
    });

    it('preserves data types (numbers, booleans, null)', () => {
      const response = createStringResponse('{"num": 42, "bool": true, "nil": null}');
      const result = parseJsonResponse(response);
      expect(result).toEqual({ num: 42, bool: true, nil: null });
    });
  });
});

// Helper function to create ExecutionResponse with string data
function createStringResponse(data: string): ExecutionResponse<string> {
  return {
    status: 'success',
    data,
    sessionId: 'test-session',
    exitCode: 0,
    duration: 1000,
    metadata: {},
  };
}

describe('parseJsonResponseStrict', () => {
  it('returns parsed JSON when data is already an object', () => {
    const response: ExecutionResponse<{ success: boolean }> = {
      status: 'success',
      data: { success: true },
      sessionId: 'test-session',
      exitCode: 0,
      duration: 1000,
      metadata: {},
    };

    const result = parseJsonResponseStrict(response);
    expect(result).toEqual({ success: true });
  });

  it('throws error when no valid JSON found', () => {
    const response = createStringResponse('No JSON here');
    expect(() => parseJsonResponseStrict(response)).toThrow(
      'No valid JSON found in CLI response'
    );
  });

  it('includes response details in error message', () => {
    const response: ExecutionResponse<string> = {
      status: 'error',
      data: 'Some text without JSON',
      sessionId: 'test-session',
      exitCode: 1,
      duration: 1000,
      metadata: {},
    };

    expect(() => parseJsonResponseStrict(response)).toThrow(/status: error/);
    expect(() => parseJsonResponseStrict(response)).toThrow(/Output type: string/);
    expect(() => parseJsonResponseStrict(response)).toThrow(/Output length: 22/);
  });
});
