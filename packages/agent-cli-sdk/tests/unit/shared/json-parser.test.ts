/**
 * Tests for JSON parser utilities
 */

import { describe, it, expect } from 'vitest';
import { extractJSON, parseJSONL, safeJSONParse } from '../../../src/shared/json-parser';
import { ParseError } from '../../../src/shared/errors';

describe('extractJSON', () => {
  it('should parse valid JSON', () => {
    const result = extractJSON('{"name": "test", "value": 123}');
    expect(result).toEqual({ name: 'test', value: 123 });
  });

  it('should extract JSON from markdown code block', () => {
    const text = '```json\n{"name": "test"}\n```';
    const result = extractJSON(text);
    expect(result).toEqual({ name: 'test' });
  });

  it('should extract JSON from code block without language', () => {
    const text = '```\n{"name": "test"}\n```';
    const result = extractJSON(text);
    expect(result).toEqual({ name: 'test' });
  });

  it('should extract JSON object from mixed text', () => {
    const text = 'Here is the result: {"status": "success"} - done!';
    const result = extractJSON(text);
    expect(result).toEqual({ status: 'success' });
  });

  it('should throw ParseError for invalid input', () => {
    expect(() => extractJSON('')).toThrow(ParseError);
    expect(() => extractJSON('not json at all')).toThrow(ParseError);
  });
});

describe('parseJSONL', () => {
  it('should parse JSON Lines format', () => {
    const jsonl = '{"type":"start"}\n{"type":"data","value":1}\n{"type":"end"}';
    const result = parseJSONL(jsonl);
    expect(result).toEqual([
      { type: 'start' },
      { type: 'data', value: 1 },
      { type: 'end' },
    ]);
  });

  it('should skip invalid JSON lines', () => {
    const jsonl = '{"valid":true}\ninvalid line\n{"also":"valid"}';
    const result = parseJSONL(jsonl);
    expect(result).toEqual([{ valid: true }, { also: 'valid' }]);
  });

  it('should handle empty input', () => {
    expect(parseJSONL('')).toEqual([]);
    expect(parseJSONL('\n\n')).toEqual([]);
  });

  it('should ignore blank lines', () => {
    const jsonl = '{"a":1}\n\n{"b":2}\n  \n{"c":3}';
    const result = parseJSONL(jsonl);
    expect(result).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });
});

describe('safeJSONParse', () => {
  it('should parse and validate JSON with schema', () => {
    const validator = {
      safeParse: (data: unknown) => {
        if (
          typeof data === 'object' &&
          data !== null &&
          'name' in data &&
          typeof data.name === 'string'
        ) {
          return { success: true, data };
        }
        return { success: false };
      },
    };

    const result = safeJSONParse('{"name":"test"}', validator);
    expect(result).toEqual({ name: 'test' });
  });

  it('should throw ParseError for validation failure', () => {
    const validator = {
      safeParse: () => ({ success: false }),
    };

    expect(() => safeJSONParse('{"name":"test"}', validator)).toThrow(ParseError);
  });

  it('should parse without validator', () => {
    const result = safeJSONParse('{"name":"test"}');
    expect(result).toEqual({ name: 'test' });
  });
});
