import { spawn } from 'cross-spawn';

export interface SpawnOptions {
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  verbose?: boolean;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
  onError?: (error: Error) => void;
  onClose?: (exitCode: number) => void;
}

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

/**
 * Spawns a process and returns stdout/stderr with optional callbacks
 */
export async function spawnProcess(
  command: string,
  options: SpawnOptions,
): Promise<SpawnResult> {
  const startTime = Date.now();

  // Verbose logging
  if (options.verbose) {
    console.log('[agent-cli-sdk-two:spawn] Spawning process');
    console.log('[agent-cli-sdk-two:spawn] Command:', command);
    console.log('[agent-cli-sdk-two:spawn] Args:', options.args);
    console.log('[agent-cli-sdk-two:spawn] CWD:', options.cwd || process.cwd());
    console.log('[agent-cli-sdk-two:spawn] Timeout:', options.timeout ? `${options.timeout}ms` : 'none');
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(command, options.args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ['pipe', 'pipe', 'pipe'], // Explicitly set stdio
    });

    // Close stdin immediately since we're not sending any input
    proc.stdin?.end();

    let stdout = '';
    let stderr = '';
    let timeoutId: NodeJS.Timeout | undefined;

    if (options.timeout) {
      timeoutId = setTimeout(() => {
        proc.kill();
        reject(new Error(`Process timeout after ${options.timeout}ms`));
      }, options.timeout);
    }

    proc.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      options.onStdout?.(text);
    });

    proc.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      options.onStderr?.(text);
    });

    proc.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);

      const exitCode = code || 0;
      const result = {
        stdout,
        stderr,
        exitCode,
        duration: Date.now() - startTime,
      };

      if (options.verbose) {
        console.log('[agent-cli-sdk-two:spawn] Process completed');
        console.log('[agent-cli-sdk-two:spawn] Exit code:', result.exitCode);
        console.log('[agent-cli-sdk-two:spawn] Duration:', `${result.duration}ms`);
      }

      options.onClose?.(exitCode);
      resolve(result);
    });

    proc.on('error', (err) => {
      if (timeoutId) clearTimeout(timeoutId);
      options.onError?.(err);
      reject(err);
    });
  });
}
