import { BaseAdapter } from "../../core/base-adapter";
import type {
  ExecutionResponse,
  AdapterCapabilities,
} from "../../core/interfaces";
import type { CodexConfig, CodexExecutionOptions } from "../../types/codex";
import { CLINotFoundError, ExecutionError } from "../../core/errors";
import { detectCodexCLI } from "./cli-detector";
import { executeCodexCLI } from "./cli-wrapper";
import { parseCodexOutput } from "./parser";

/**
 * Codex CLI adapter implementation
 */
export class CodexAdapter extends BaseAdapter {
  constructor(config: CodexConfig = {}) {
    const resolvedPath = config.cliPath || detectCodexCLI();

    if (!resolvedPath) {
      throw new CLINotFoundError(
        "codex",
        "Codex CLI not found. Install it or set CODEX_CLI_PATH environment variable"
      );
    }

    super(resolvedPath, config);
  }

  async execute<T = string>(
    prompt: string,
    options: CodexExecutionOptions = {}
  ): Promise<ExecutionResponse<T>> {
    // Validate inputs
    this.validatePrompt(prompt);
    this.validateOptions(options);

    // Merge config with options (options take precedence)
    const mergedOptions: CodexExecutionOptions = {
      ...this.config,
      ...options,
    };

    // Set defaults
    if (mergedOptions.fullAuto === undefined) {
      // Default to full-auto for programmatic use
      mergedOptions.fullAuto = true;
    }

    // Prepare logging
    const inputData = { prompt, options: mergedOptions };
    let response: ExecutionResponse<T> | null = null;
    let executionError: Error | null = null;

    try {
      // Execute CLI (with optional session resumption)
      const result = await executeCodexCLI(
        this.cliPath,
        prompt,
        mergedOptions,
        mergedOptions.sessionId // Pass sessionId if resuming
      );

      // Parse output
      response = await parseCodexOutput<T>(
        result.stdout,
        result.duration,
        result.exitCode,
        mergedOptions.responseSchema
      );

      // Add stderr
      if (response.raw) {
        response.raw.stderr = result.stderr;
      }
    } catch (error) {
      executionError =
        error instanceof Error ? error : new Error(String(error));
    } finally {
      // Always log (non-blocking)
      if (mergedOptions.logPath) {
        await this.safeWriteLogs(
          mergedOptions.logPath,
          inputData,
          response,
          executionError
        );
      }
    }

    // Handle errors
    if (executionError) {
      throw new ExecutionError(
        `Codex execution failed: ${executionError.message}`
      );
    }

    if (!response) {
      throw new ExecutionError("Execution completed but no response generated");
    }

    return response;
  }

  getCapabilities(): AdapterCapabilities {
    return {
      streaming: true,
      sessionManagement: false, // TODO: Implement CodexSession in v1.1 (currently no createSession method)
      toolCalling: true,
      multiModal: true, // Codex supports images via -i flag
    };
  }
}
