/**
 * Tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateNonEmptyString,
  validatePositiveNumber,
  validateEnum,
  validateFilePath,
  validateRequiredKeys,
} from '../../../src/utils/validation';
import { ValidationError } from '../../../src/core/errors';

describe('validateNonEmptyString', () => {
  it('should accept valid non-empty strings', () => {
    expect(() => validateNonEmptyString('hello', 'test')).not.toThrow();
    expect(() => validateNonEmptyString('  text  ', 'test')).not.toThrow();
  });

  it('should reject non-string values', () => {
    expect(() => validateNonEmptyString(123, 'test')).toThrow(ValidationError);
    expect(() => validateNonEmptyString(null, 'test')).toThrow(ValidationError);
    expect(() => validateNonEmptyString(undefined, 'test')).toThrow(ValidationError);
  });

  it('should reject empty strings', () => {
    expect(() => validateNonEmptyString('', 'test')).toThrow(ValidationError);
    expect(() => validateNonEmptyString('   ', 'test')).toThrow(ValidationError);
  });
});

describe('validatePositiveNumber', () => {
  it('should accept positive numbers', () => {
    expect(() => validatePositiveNumber(1, 'test')).not.toThrow();
    expect(() => validatePositiveNumber(100.5, 'test')).not.toThrow();
  });

  it('should reject non-numbers', () => {
    expect(() => validatePositiveNumber('123', 'test')).toThrow(ValidationError);
    expect(() => validatePositiveNumber(null, 'test')).toThrow(ValidationError);
  });

  it('should reject zero and negative numbers', () => {
    expect(() => validatePositiveNumber(0, 'test')).toThrow(ValidationError);
    expect(() => validatePositiveNumber(-1, 'test')).toThrow(ValidationError);
  });

  it('should reject non-finite numbers', () => {
    expect(() => validatePositiveNumber(Infinity, 'test')).toThrow(ValidationError);
    expect(() => validatePositiveNumber(NaN, 'test')).toThrow(ValidationError);
  });
});

describe('validateEnum', () => {
  const allowedValues = ['red', 'green', 'blue'] as const;

  it('should accept allowed values', () => {
    expect(() => validateEnum('red', allowedValues, 'color')).not.toThrow();
    expect(() => validateEnum('green', allowedValues, 'color')).not.toThrow();
  });

  it('should reject values not in enum', () => {
    expect(() => validateEnum('yellow', allowedValues, 'color')).toThrow(ValidationError);
    expect(() => validateEnum('', allowedValues, 'color')).toThrow(ValidationError);
  });
});

describe('validateFilePath', () => {
  it('should accept valid file paths', () => {
    expect(() => validateFilePath('/path/to/file.txt', 'path')).not.toThrow();
    expect(() => validateFilePath('./relative/path.js', 'path')).not.toThrow();
  });

  it('should reject paths with null bytes', () => {
    expect(() => validateFilePath('/path/\0/file', 'path')).toThrow(ValidationError);
  });

  it('should reject empty paths', () => {
    expect(() => validateFilePath('', 'path')).toThrow(ValidationError);
  });
});

describe('validateRequiredKeys', () => {
  it('should accept objects with all required keys', () => {
    const obj = { name: 'test', age: 25 };
    expect(() => validateRequiredKeys(obj, ['name', 'age'], 'user')).not.toThrow();
  });

  it('should reject objects missing required keys', () => {
    const obj = { name: 'test' };
    expect(() => validateRequiredKeys(obj, ['name', 'age'], 'user')).toThrow(ValidationError);
  });

  it('should reject non-objects', () => {
    expect(() => validateRequiredKeys(null, ['key'], 'obj')).toThrow(ValidationError);
    expect(() => validateRequiredKeys('string', ['key'], 'obj')).toThrow(ValidationError);
  });
});
