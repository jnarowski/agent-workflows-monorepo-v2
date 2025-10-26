/**
 * Claude CLI argument builder
 */

import type { ClaudeOptions } from './types';

/**
 * Build Claude CLI arguments from options
 */
export function buildClaudeArgs(
  prompt: string,
  options: ClaudeOptions
): string[] {
  const args: string[] = [];

  // Programmatic mode (non-interactive)
  args.push('-p');

  // Model selection
  if (options.model) {
    args.push('--model', options.model);
  }

  // Session management (sessionId, continue, and resume are mutually exclusive)
  if (options.sessionId && options.resume) {
    // Resume an existing session with specific ID
    args.push('--resume', options.sessionId);
  } else if (options.sessionId) {
    // Create new session with specific ID
    args.push('--session-id', options.sessionId);
  } else if (options.continue) {
    args.push('--continue');
  }

  // Permission mode
  if (options.permissionMode) {
    args.push('--permission-mode', options.permissionMode);
  } else if (options.dangerouslySkipPermissions) {
    args.push('--permission-mode', 'acceptEdits');
  }

  // Output format (stream-json requires --verbose)
  const useStreamJson = options.streaming !== false;
  if (useStreamJson) {
    args.push('--output-format', 'stream-json');
    args.push('--verbose'); // Required for stream-json
  } else if (options.verbose) {
    args.push('--verbose');
  }

  // Tool settings
  if (options.toolSettings?.allowedTools) {
    args.push('--allowed-tools', options.toolSettings.allowedTools.join(','));
  }
  if (options.toolSettings?.disallowedTools) {
    args.push(
      '--disallowed-tools',
      options.toolSettings.disallowedTools.join(',')
    );
  }

  // Images
  if (options.images && options.images.length > 0) {
    for (const image of options.images) {
      args.push('-i', image.path);
    }
  }

  // Prompt (must be last)
  args.push(prompt);

  return args;
}
