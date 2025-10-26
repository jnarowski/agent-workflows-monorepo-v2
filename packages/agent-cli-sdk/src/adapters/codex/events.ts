/**
 * Codex CLI event types
 * Based on Codex CLI v0.46.0 event format
 *
 * Codex events come in 4 main types:
 * - session_meta: Session metadata (id, git info, cwd, etc.)
 * - response_item: Content items (messages, reasoning, function calls/outputs)
 * - event_msg: Event messages (user message, agent reasoning, token counts)
 * - turn_context: Turn execution context (sandbox policy, model, etc.)
 */

// ============================================================================
// Session Meta Event
// ============================================================================

export interface GitInfo {
  commit_hash: string;
  branch: string;
  repository_url: string;
}

export interface SessionMetaPayload {
  id: string;
  timestamp: string;
  cwd: string;
  originator: string;
  cli_version: string;
  instructions: string | null;
  source: string;
  git: GitInfo;
}

export interface SessionMetaEvent {
  timestamp: string;
  type: 'session_meta';
  payload: SessionMetaPayload;
}

// ============================================================================
// Response Item Event - Content Items
// ============================================================================

// Content item types within messages
export interface InputTextContent {
  type: 'input_text';
  text: string;
}

export interface OutputTextContent {
  type: 'output_text';
  text: string;
}

export type MessageContent = InputTextContent | OutputTextContent;

// Message payload (user or agent messages)
export interface MessagePayload {
  type: 'message';
  role: 'user' | 'agent';
  content: MessageContent[];
}

// Reasoning payload (thinking/planning)
export interface SummaryTextContent {
  type: 'summary_text';
  text: string;
}

export interface ReasoningPayload {
  type: 'reasoning';
  summary: SummaryTextContent[];
  content: null;
  encrypted_content: string;
}

// Function call payload (tool use)
export interface FunctionCallPayload {
  type: 'function_call';
  name: string;
  arguments: string; // JSON string
  call_id: string;
}

// Function call output payload (tool result)
export interface FunctionCallOutputPayload {
  type: 'function_call_output';
  call_id: string;
  output: string; // JSON string with { output, metadata: { exit_code, duration_seconds } }
}

// Custom tool call/output (for custom tools)
export interface CustomToolCallPayload {
  type: 'custom_tool_call';
  name: string;
  arguments: string;
  call_id: string;
}

export interface CustomToolCallOutputPayload {
  type: 'custom_tool_call_output';
  call_id: string;
  output: string;
}

// Union of all response item payloads
export type ResponseItemPayload =
  | MessagePayload
  | ReasoningPayload
  | FunctionCallPayload
  | FunctionCallOutputPayload
  | CustomToolCallPayload
  | CustomToolCallOutputPayload;

export interface ResponseItemEvent {
  timestamp: string;
  type: 'response_item';
  payload: ResponseItemPayload;
}

// ============================================================================
// Event Message Event - Event Stream Messages
// ============================================================================

// User message event (when user sends a message)
export interface UserMessageEventPayload {
  type: 'user_message';
  message: string;
  kind: 'plain' | 'rich';
}

// Agent message event (when agent sends a message)
export interface AgentMessageEventPayload {
  type: 'agent_message';
  message: string;
}

// Agent reasoning event (real-time reasoning updates)
export interface AgentReasoningEventPayload {
  type: 'agent_reasoning';
  text: string;
}

// Token count event (token usage and rate limits)
export interface TokenUsageInfo {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens: number;
  total_tokens: number;
}

export interface RateLimit {
  used_percent: number;
  window_minutes: number;
  resets_in_seconds: number;
}

export interface RateLimits {
  primary: RateLimit;
  secondary: RateLimit;
}

export interface TokenInfo {
  total_token_usage: TokenUsageInfo;
  last_token_usage: TokenUsageInfo;
  model_context_window: number;
}

export interface TokenCountEventPayload {
  type: 'token_count';
  info: TokenInfo | null;
  rate_limits: RateLimits;
}

// Union of all event message payloads
export type EventMsgPayload =
  | UserMessageEventPayload
  | AgentMessageEventPayload
  | AgentReasoningEventPayload
  | TokenCountEventPayload;

export interface EventMsgEvent {
  timestamp: string;
  type: 'event_msg';
  payload: EventMsgPayload;
}

// ============================================================================
// Turn Context Event
// ============================================================================

export interface SandboxPolicy {
  mode: 'workspace-write' | 'workspace-read' | 'off';
  network_access: boolean;
  exclude_tmpdir_env_var: boolean;
  exclude_slash_tmp: boolean;
}

export interface TurnContextPayload {
  cwd: string;
  approval_policy: 'on-request' | 'auto';
  sandbox_policy: SandboxPolicy;
  model: string;
  effort: 'low' | 'medium' | 'high';
  summary: 'auto' | 'manual' | 'off';
}

export interface TurnContextEvent {
  timestamp: string;
  type: 'turn_context';
  payload: TurnContextPayload;
}

// ============================================================================
// Union Types & Type Guards
// ============================================================================

/**
 * Union of all Codex stream event types
 */
export type CodexStreamEvent =
  | SessionMetaEvent
  | ResponseItemEvent
  | EventMsgEvent
  | TurnContextEvent;

// ============================================================================
// Type Guards - Event Types
// ============================================================================

export function isSessionMetaEvent(event: unknown): event is SessionMetaEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    event.type === 'session_meta'
  );
}

export function isResponseItemEvent(event: unknown): event is ResponseItemEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    event.type === 'response_item'
  );
}

export function isEventMsgEvent(event: unknown): event is EventMsgEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    event.type === 'event_msg'
  );
}

export function isTurnContextEvent(event: unknown): event is TurnContextEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    event.type === 'turn_context'
  );
}

// ============================================================================
// Type Guards - Response Item Payloads
// ============================================================================

export function isMessagePayload(payload: ResponseItemPayload): payload is MessagePayload {
  return payload.type === 'message';
}

export function isReasoningPayload(payload: ResponseItemPayload): payload is ReasoningPayload {
  return payload.type === 'reasoning';
}

export function isFunctionCallPayload(payload: ResponseItemPayload): payload is FunctionCallPayload {
  return payload.type === 'function_call';
}

export function isFunctionCallOutputPayload(
  payload: ResponseItemPayload
): payload is FunctionCallOutputPayload {
  return payload.type === 'function_call_output';
}

export function isCustomToolCallPayload(
  payload: ResponseItemPayload
): payload is CustomToolCallPayload {
  return payload.type === 'custom_tool_call';
}

export function isCustomToolCallOutputPayload(
  payload: ResponseItemPayload
): payload is CustomToolCallOutputPayload {
  return payload.type === 'custom_tool_call_output';
}

// ============================================================================
// Type Guards - Event Message Payloads
// ============================================================================

export function isUserMessageEventPayload(
  payload: EventMsgPayload
): payload is UserMessageEventPayload {
  return payload.type === 'user_message';
}

export function isAgentMessageEventPayload(
  payload: EventMsgPayload
): payload is AgentMessageEventPayload {
  return payload.type === 'agent_message';
}

export function isAgentReasoningEventPayload(
  payload: EventMsgPayload
): payload is AgentReasoningEventPayload {
  return payload.type === 'agent_reasoning';
}

export function isTokenCountEventPayload(
  payload: EventMsgPayload
): payload is TokenCountEventPayload {
  return payload.type === 'token_count';
}
