/**
 * Tool Types
 *
 * Defines the input types for various tools that agents can use.
 * Each tool has a specific input structure.
 */

/**
 * Union type of all possible tool inputs
 */
export type ToolInput =
  | BashToolInput
  | ReadToolInput
  | WriteToolInput
  | EditToolInput
  | GlobToolInput
  | GrepToolInput
  | TodoWriteToolInput
  | WebFetchToolInput
  | WebSearchToolInput
  | TaskToolInput
  | AskUserQuestionToolInput
  | NotebookEditToolInput
  | KillShellToolInput
  | BashOutputToolInput
  | SkillToolInput
  | SlashCommandToolInput;

/**
 * Bash command execution tool
 */
export interface BashToolInput {
  command: string;
  description?: string;
  timeout?: number;
  run_in_background?: boolean;
  dangerouslyDisableSandbox?: boolean;
}

/**
 * Read file tool
 */
export interface ReadToolInput {
  file_path: string;
  offset?: number;
  limit?: number;
}

/**
 * Write file tool
 */
export interface WriteToolInput {
  file_path: string;
  content: string;
}

/**
 * Edit file tool
 */
export interface EditToolInput {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

/**
 * Glob pattern matching tool
 */
export interface GlobToolInput {
  pattern: string;
  path?: string;
}

/**
 * Grep search tool
 */
export interface GrepToolInput {
  pattern: string;
  path?: string;
  output_mode?: 'content' | 'files_with_matches' | 'count';
  glob?: string;
  type?: string;
  '-i'?: boolean;
  '-n'?: boolean;
  '-A'?: number;
  '-B'?: number;
  '-C'?: number;
  head_limit?: number;
  multiline?: boolean;
}

/**
 * Todo list management tool
 */
export interface TodoWriteToolInput {
  todos: Array<{
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    activeForm: string;
  }>;
}

/**
 * Web fetch tool
 */
export interface WebFetchToolInput {
  url: string;
  prompt: string;
}

/**
 * Web search tool
 */
export interface WebSearchToolInput {
  query: string;
  allowed_domains?: string[];
  blocked_domains?: string[];
}

/**
 * Task/agent spawning tool
 */
export interface TaskToolInput {
  prompt: string;
  description: string;
  subagent_type: string;
}

/**
 * Ask user question tool
 */
export interface AskUserQuestionToolInput {
  questions: Array<{
    question: string;
    header: string;
    options: Array<{
      label: string;
      description: string;
    }>;
    multiSelect: boolean;
  }>;
  answers?: Record<string, string>;
}

/**
 * Notebook edit tool
 */
export interface NotebookEditToolInput {
  notebook_path: string;
  new_source: string;
  cell_id?: string;
  cell_type?: 'code' | 'markdown';
  edit_mode?: 'replace' | 'insert' | 'delete';
}

/**
 * Kill shell tool
 */
export interface KillShellToolInput {
  shell_id: string;
}

/**
 * Bash output tool
 */
export interface BashOutputToolInput {
  bash_id: string;
  filter?: string;
}

/**
 * Skill tool
 */
export interface SkillToolInput {
  command: string;
}

/**
 * Slash command tool
 */
export interface SlashCommandToolInput {
  command: string;
}
