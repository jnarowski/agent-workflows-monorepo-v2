/**
 * Gemini CLI integration module.
 *
 * Provides functions for executing Gemini CLI commands, loading sessions,
 * and parsing Gemini messages to unified format.
 */

export { parse } from './parse.js';
export { loadSession } from './loadSession.js';
export { execute } from './execute.js';
export { detectCli } from './detectCli.js';

export type { GeminiMessage, GeminiSession, GeminiToolCall, GeminiThought } from './types.js';
export type { ExecuteOptions, ExecuteResult, GeminiPermissionMode } from './execute.js';
export type { LoadGeminiSessionOptions } from './loadSession.js';
