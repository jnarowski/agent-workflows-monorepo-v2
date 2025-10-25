/**
 * Tests for custom error classes
 */

import { describe, it, expect } from 'vitest';
import {
  AgentSDKError,
  ValidationError,
  CLINotFoundError,
  AuthenticationError,
  ExecutionError,
  TimeoutError,
  ParseError,
  SessionError,
} from '../../../src/shared/errors';

describe('AgentSDKError', () => {
  it('should create error with message', () => {
    const error = new AgentSDKError('Test error message');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AgentSDKError);
    expect(error.message).toBe('Test error message');
    expect(error.name).toBe('AgentSDKError');
  });

  it('should have stack trace', () => {
    const error = new AgentSDKError('Test error');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AgentSDKError');
  });

  it('should be throwable and catchable', () => {
    expect(() => {
      throw new AgentSDKError('Test throw');
    }).toThrow(AgentSDKError);

    expect(() => {
      throw new AgentSDKError('Test throw');
    }).toThrow('Test throw');
  });
});

describe('ValidationError', () => {
  it('should extend AgentSDKError', () => {
    const error = new ValidationError('Invalid input');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AgentSDKError);
    expect(error).toBeInstanceOf(ValidationError);
  });

  it('should have correct name', () => {
    const error = new ValidationError('Invalid input');

    expect(error.name).toBe('ValidationError');
  });

  it('should preserve message', () => {
    const error = new ValidationError('Field must be a string');

    expect(error.message).toBe('Field must be a string');
  });

  it('should be distinguishable from other error types', () => {
    try {
      throw new ValidationError('Validation failed');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).not.toBeInstanceOf(TimeoutError);
      expect(error).not.toBeInstanceOf(ExecutionError);
    }
  });
});

describe('CLINotFoundError', () => {
  it('should store CLI name', () => {
    const error = new CLINotFoundError('claude');

    expect(error.cliName).toBe('claude');
  });

  it('should use default message', () => {
    const error = new CLINotFoundError('codex');

    expect(error.message).toContain('codex CLI not found');
    expect(error.message).toContain('install it');
    expect(error.message).toContain('environment variable');
  });

  it('should accept custom message', () => {
    const error = new CLINotFoundError('claude', 'Custom CLI error message');

    expect(error.message).toBe('Custom CLI error message');
    expect(error.cliName).toBe('claude');
  });

  it('should have correct name', () => {
    const error = new CLINotFoundError('test');

    expect(error.name).toBe('CLINotFoundError');
  });

  it('should extend AgentSDKError', () => {
    const error = new CLINotFoundError('test');

    expect(error).toBeInstanceOf(AgentSDKError);
  });
});

describe('AuthenticationError', () => {
  it('should store CLI name', () => {
    const error = new AuthenticationError('claude');

    expect(error.cliName).toBe('claude');
  });

  it('should use default message', () => {
    const error = new AuthenticationError('codex');

    expect(error.message).toContain('Authentication failed');
    expect(error.message).toContain('codex');
    expect(error.message).toContain('credentials');
  });

  it('should accept custom message', () => {
    const error = new AuthenticationError('claude', 'Invalid API key provided');

    expect(error.message).toBe('Invalid API key provided');
    expect(error.cliName).toBe('claude');
  });

  it('should have correct name', () => {
    const error = new AuthenticationError('test');

    expect(error.name).toBe('AuthenticationError');
  });

  it('should extend AgentSDKError', () => {
    const error = new AuthenticationError('test');

    expect(error).toBeInstanceOf(AgentSDKError);
  });
});

describe('ExecutionError', () => {
  it('should store exit code', () => {
    const error = new ExecutionError('Execution failed', 1);

    expect(error.exitCode).toBe(1);
  });

  it('should store stderr', () => {
    const error = new ExecutionError('Execution failed', 2, 'error output');

    expect(error.stderr).toBe('error output');
  });

  it('should work with only message', () => {
    const error = new ExecutionError('Simple execution error');

    expect(error.message).toBe('Simple execution error');
    expect(error.exitCode).toBeUndefined();
    expect(error.stderr).toBeUndefined();
  });

  it('should have correct name', () => {
    const error = new ExecutionError('Test error');

    expect(error.name).toBe('ExecutionError');
  });

  it('should store all parameters', () => {
    const error = new ExecutionError('Command failed', 127, 'command not found\n');

    expect(error.message).toBe('Command failed');
    expect(error.exitCode).toBe(127);
    expect(error.stderr).toBe('command not found\n');
  });

  it('should extend AgentSDKError', () => {
    const error = new ExecutionError('Test');

    expect(error).toBeInstanceOf(AgentSDKError);
  });
});

describe('TimeoutError', () => {
  it('should store timeout value', () => {
    const error = new TimeoutError(5000);

    expect(error.timeoutMs).toBe(5000);
  });

  it('should use default message', () => {
    const error = new TimeoutError(3000);

    expect(error.message).toContain('exceeded timeout');
    expect(error.message).toContain('3000ms');
  });

  it('should accept custom message', () => {
    const error = new TimeoutError(10000, 'Operation took too long');

    expect(error.message).toBe('Operation took too long');
    expect(error.timeoutMs).toBe(10000);
  });

  it('should have correct name', () => {
    const error = new TimeoutError(1000);

    expect(error.name).toBe('TimeoutError');
  });

  it('should extend AgentSDKError', () => {
    const error = new TimeoutError(1000);

    expect(error).toBeInstanceOf(AgentSDKError);
  });

  it('should handle different timeout values', () => {
    const error1 = new TimeoutError(100);
    const error2 = new TimeoutError(60000);

    expect(error1.timeoutMs).toBe(100);
    expect(error2.timeoutMs).toBe(60000);
    expect(error1.message).toContain('100ms');
    expect(error2.message).toContain('60000ms');
  });
});

describe('ParseError', () => {
  it('should store raw data', () => {
    const error = new ParseError('Failed to parse', 'raw data here');

    expect(error.raw).toBe('raw data here');
  });

  it('should work without raw data', () => {
    const error = new ParseError('Parse failed');

    expect(error.message).toBe('Parse failed');
    expect(error.raw).toBeUndefined();
  });

  it('should have correct name', () => {
    const error = new ParseError('Test');

    expect(error.name).toBe('ParseError');
  });

  it('should extend AgentSDKError', () => {
    const error = new ParseError('Test');

    expect(error).toBeInstanceOf(AgentSDKError);
  });

  it('should preserve both message and raw data', () => {
    const rawJson = '{"invalid": json}';
    const error = new ParseError('Invalid JSON format', rawJson);

    expect(error.message).toBe('Invalid JSON format');
    expect(error.raw).toBe(rawJson);
  });

  it('should handle large raw data', () => {
    const largeRaw = 'x'.repeat(10000);
    const error = new ParseError('Parse error', largeRaw);

    expect(error.raw).toBe(largeRaw);
    expect(error.raw?.length).toBe(10000);
  });
});

describe('SessionError', () => {
  it('should store session ID', () => {
    const error = new SessionError('Session error', 'session-123');

    expect(error.sessionId).toBe('session-123');
  });

  it('should work without session ID', () => {
    const error = new SessionError('Session failed');

    expect(error.message).toBe('Session failed');
    expect(error.sessionId).toBeUndefined();
  });

  it('should have correct name', () => {
    const error = new SessionError('Test');

    expect(error.name).toBe('SessionError');
  });

  it('should extend AgentSDKError', () => {
    const error = new SessionError('Test');

    expect(error).toBeInstanceOf(AgentSDKError);
  });

  it('should preserve both message and session ID', () => {
    const error = new SessionError('Session not found', 'abc-def-123');

    expect(error.message).toBe('Session not found');
    expect(error.sessionId).toBe('abc-def-123');
  });
});

describe('Error hierarchy', () => {
  it('should distinguish between different error types', () => {
    const validation = new ValidationError('Invalid');
    const timeout = new TimeoutError(1000);
    const execution = new ExecutionError('Failed');
    const parse = new ParseError('Bad format');

    expect(validation).toBeInstanceOf(ValidationError);
    expect(timeout).toBeInstanceOf(TimeoutError);
    expect(execution).toBeInstanceOf(ExecutionError);
    expect(parse).toBeInstanceOf(ParseError);

    expect(validation).not.toBeInstanceOf(TimeoutError);
    expect(timeout).not.toBeInstanceOf(ExecutionError);
    expect(execution).not.toBeInstanceOf(ParseError);
    expect(parse).not.toBeInstanceOf(ValidationError);
  });

  it('should all extend Error', () => {
    const errors = [
      new ValidationError('test'),
      new CLINotFoundError('test'),
      new AuthenticationError('test'),
      new ExecutionError('test'),
      new TimeoutError(1000),
      new ParseError('test'),
      new SessionError('test'),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('should all extend AgentSDKError', () => {
    const errors = [
      new ValidationError('test'),
      new CLINotFoundError('test'),
      new AuthenticationError('test'),
      new ExecutionError('test'),
      new TimeoutError(1000),
      new ParseError('test'),
      new SessionError('test'),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(AgentSDKError);
    }
  });
});

describe('Error catching and type checking', () => {
  it('should allow specific error catching', () => {
    try {
      throw new TimeoutError(5000);
    } catch (error) {
      if (error instanceof TimeoutError) {
        expect(error.timeoutMs).toBe(5000);
      } else {
        expect.fail('Should have caught TimeoutError');
      }
    }
  });

  it('should allow generic AgentSDKError catching', () => {
    const errors = [
      new ValidationError('test'),
      new TimeoutError(1000),
      new ExecutionError('test'),
    ];

    for (const error of errors) {
      try {
        throw error;
      } catch (caught) {
        expect(caught).toBeInstanceOf(AgentSDKError);
      }
    }
  });

  it('should preserve error chain in catches', () => {
    try {
      try {
        throw new ExecutionError('Inner error', 1, 'stderr');
      } catch (inner) {
        throw new ParseError('Outer error', JSON.stringify(inner));
      }
    } catch (outer) {
      expect(outer).toBeInstanceOf(ParseError);
      expect((outer as ParseError).raw).toBeDefined();
    }
  });
});
