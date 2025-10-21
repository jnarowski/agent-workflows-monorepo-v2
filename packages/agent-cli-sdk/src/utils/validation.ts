/**
 * Input validation utilities
 */

import { ValidationError } from '../core/errors';

/**
 * Validate that a value is a non-empty string
 */
export function validateNonEmptyString(
  value: unknown,
  fieldName: string
): asserts value is string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  if (value.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }
}

/**
 * Validate that a value is a positive number
 */
export function validatePositiveNumber(
  value: unknown,
  fieldName: string
): asserts value is number {
  if (typeof value !== 'number') {
    throw new ValidationError(`${fieldName} must be a number`);
  }
  if (value <= 0) {
    throw new ValidationError(`${fieldName} must be positive`);
  }
  if (!Number.isFinite(value)) {
    throw new ValidationError(`${fieldName} must be a finite number`);
  }
}

/**
 * Validate that a value is one of allowed values
 */
export function validateEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName: string
): asserts value is T {
  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }
}

/**
 * Validate file path exists (basic check)
 */
export function validateFilePath(path: unknown, fieldName: string): asserts path is string {
  validateNonEmptyString(path, fieldName);

  // Basic path validation (not checking existence, just format)
  if (path.includes('\0')) {
    throw new ValidationError(`${fieldName} contains invalid characters`);
  }
}

/**
 * Validate object has required keys
 */
export function validateRequiredKeys<T extends object>(
  obj: unknown,
  requiredKeys: (keyof T)[],
  objectName: string
): asserts obj is T {
  if (typeof obj !== 'object' || obj === null) {
    throw new ValidationError(`${objectName} must be an object`);
  }

  for (const key of requiredKeys) {
    if (!(key in obj)) {
      throw new ValidationError(
        `${objectName} is missing required key: ${String(key)}`
      );
    }
  }
}
