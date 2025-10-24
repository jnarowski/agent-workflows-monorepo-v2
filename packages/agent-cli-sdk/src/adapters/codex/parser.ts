import type { ExecutionResponse, StreamEvent, TokenUsage } from "../../types";
import { extractJSON } from "../../utils/json-parser";

/**
 * Parse Codex CLI output
 * Based on Codex CLI 0.46.0 event format
 * @param stdout Raw stdout from CLI
 * @param duration Execution duration in ms
 * @param exitCode CLI exit code
 * @param responseSchema Optional response schema for validation
 * @returns Parsed execution response
 */
export async function parseCodexOutput<T = string>(
  stdout: string,
  duration: number,
  exitCode: number,
  responseSchema?: true | { safeParse: (data: unknown) => { success: boolean; data?: unknown; error?: { message: string } } }
): Promise<ExecutionResponse<T>> {
  const events = parseStreamEvents(stdout);

  // Extract thread ID (session ID)
  const sessionId = extractThreadId(events);

  // Extract final text output from agent_message items
  let output: T;
  const agentMessages = events
    .filter((e) => {
      if (e.type !== "item.completed") return false;
      const data = e.data as Record<string, unknown>;
      return (data?.item as Record<string, unknown>)?.type === "agent_message";
    })
    .map((e) => {
      const data = e.data as Record<string, unknown>;
      return (data?.item as Record<string, unknown>)?.text;
    })
    .filter(Boolean);

  const lastMessage = agentMessages[agentMessages.length - 1];

  if (responseSchema) {
    // Extract and validate JSON
    const jsonResult = extractJSON((typeof lastMessage === 'string' ? lastMessage : '') || stdout);
    if (responseSchema === true) {
      output = jsonResult as T;
    } else if (responseSchema.safeParse) {
      const parseResult = responseSchema.safeParse(jsonResult);
      if (!parseResult.success) {
        throw new Error(
          `Response validation failed: ${parseResult.error?.message || 'Unknown validation error'}`
        );
      }
      output = parseResult.data as T;
    } else {
      output = jsonResult as T;
    }
  } else {
    // Plain text output - join all agent messages
    output = (agentMessages.join('\n') || stdout.trim()) as T;
  }

  // Build response
  const response: ExecutionResponse<T> = {
    data: output,
    events,
    sessionId: sessionId || generateSessionId(),
    status: exitCode === 0 ? "success" : "error",
    exitCode,
    duration,
    metadata: {
      toolsUsed: extractToolsUsed(events),
      filesModified: extractFilesModified(events),
    },
    raw: {
      stdout,
      stderr: "",
    },
  };

  // Add usage information if available
  const usage = extractUsage(events);
  if (usage) {
    response.usage = usage;
  }

  return response;
}

/**
 * Parse JSONL stream events
 * @param output Raw CLI output
 * @returns Array of parsed events
 */
function parseStreamEvents(output: string): StreamEvent[] {
  const lines = output.split("\n").filter((line) => line.trim());
  const events: StreamEvent[] = [];

  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      events.push({
        type: event.type || "unknown",
        data: event.data || event,
        timestamp: event.timestamp || Date.now(),
      });
    } catch {
      // Not a JSON line, skip
    }
  }

  return events;
}

/**
 * Extract tools used from events
 * @param events Stream events
 * @returns Array of tool names
 */
function extractToolsUsed(events: StreamEvent[]): string[] {
  const tools = new Set<string>();

  for (const event of events) {
    if (event.type === "tool.started" || event.type === "tool_use") {
      const data = event.data as Record<string, unknown>;
      const toolName = data?.toolName || data?.name;
      if (typeof toolName === 'string') {
        tools.add(toolName);
      }
    }
  }

  return Array.from(tools);
}

/**
 * Extract files modified from events
 * @param events Stream events
 * @returns Array of file paths
 */
function extractFilesModified(events: StreamEvent[]): string[] {
  const files = new Set<string>();

  for (const event of events) {
    if (event.type === "file.written" || event.type === "file.modified") {
      const data = event.data as Record<string, unknown>;
      const filePath = data?.path || data?.file;
      if (typeof filePath === 'string') {
        files.add(filePath);
      }
    }
  }

  return Array.from(files);
}

/**
 * Extract token usage from events
 * Codex uses turn.completed events with usage field
 * @param events Stream events
 * @returns Token usage information
 */
function extractUsage(events: StreamEvent[]): TokenUsage | null {
  // Look for turn.completed events which contain usage
  const turnCompleted = events.find((e) => e.type === "turn.completed");
  if (turnCompleted?.data?.usage) {
    const usage = turnCompleted.data.usage as Record<string, unknown>;
    return {
      inputTokens: Number(usage.input_tokens) || 0,
      outputTokens: Number(usage.output_tokens) || 0,
      totalTokens: Number(usage.total_tokens) || (Number(usage.input_tokens) || 0) + (Number(usage.output_tokens) || 0),
    };
  }

  // Fallback for other event types
  for (const event of events) {
    if (event.type === "usage" || event.type === "completion") {
      if (event.data?.usage) {
        const usage = event.data.usage as Record<string, unknown>;
        return {
          inputTokens: Number(usage.input_tokens) || 0,
          outputTokens: Number(usage.output_tokens) || 0,
          totalTokens: Number(usage.total_tokens) || (Number(usage.input_tokens) || 0) + (Number(usage.output_tokens) || 0),
        };
      }
    }
  }

  return null;
}

/**
 * Extract thread ID (session ID) from events
 * @param events Stream events
 * @returns Thread ID or null
 */
function extractThreadId(events: StreamEvent[]): string | null {
  const threadStarted = events.find((e) => e.type === "thread.started");
  if (threadStarted) {
    const data = threadStarted.data as Record<string, unknown>;
    const threadId = data?.thread_id;
    if (typeof threadId === 'string') {
      return threadId;
    }
  }
  return null;
}

/**
 * Generate a session ID
 * @returns Session ID string
 */
function generateSessionId(): string {
  return `codex-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
