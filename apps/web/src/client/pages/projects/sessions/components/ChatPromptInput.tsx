"use client";

import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputPermissionModeSelect,
  PromptInputPermissionModeSelectContent,
  PromptInputPermissionModeSelectItem,
  PromptInputPermissionModeSelectTrigger,
  PromptInputPermissionModeSelectValue,
  PromptInputProvider,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputController,
} from "@/client/components/ai-elements/PromptInput";
import { ChatPromptInputFiles } from "./ChatPromptInputFiles";
import { ChatPromptInputSlashCommands } from "./ChatPromptInputSlashCommands";
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { useNavigationStore } from "@/client/stores/navigationStore";
import {
  useSessionStore,
  type ClaudePermissionMode,
} from "@/client/pages/projects/sessions/stores/sessionStore";
import { useActiveProject } from "@/client/hooks/navigation/useActiveProject";
import { insertAtCursor, removeAllOccurrences } from "@/client/pages/projects/files/lib/fileUtils";
import { cn } from "@/client/lib/utils";

const permissionModes: Array<{
  id: ClaudePermissionMode;
  name: string;
  color: string;
}> = [
  { id: "default", name: "Default", color: "bg-gray-500" },
  { id: "plan", name: "Plan Mode", color: "bg-green-500" },
  { id: "acceptEdits", name: "Accept Edits", color: "bg-purple-500" },
  { id: "reject", name: "Reject", color: "bg-red-500" },
];

const SUBMITTING_TIMEOUT = 200;
const STREAMING_TIMEOUT = 2000;

interface ChatPromptInputProps {
  onSubmit?: (message: string, images?: File[]) => void | Promise<void>;
  disabled?: boolean;
  isStreaming?: boolean;
  totalTokens?: number; // Total session tokens
  currentMessageTokens?: number; // Tokens for currently streaming message
}

export interface ChatPromptInputHandle {
  focus: () => void;
}

// Inner component that uses the controller
const ChatPromptInputInner = forwardRef<ChatPromptInputHandle, ChatPromptInputProps>(({
  onSubmit,
  disabled = false,
  isStreaming: externalIsStreaming = false,
  totalTokens,
  currentMessageTokens,
}, ref) => {
  const controller = usePromptInputController();
  const [status, setStatus] = useState<
    "submitted" | "streaming" | "ready" | "error"
  >("ready");
  const [isAtMenuOpen, setIsAtMenuOpen] = useState(false);
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get active project and session IDs from navigation store
  const { activeProjectId, activeSessionId } = useNavigationStore();
  const { project } = useActiveProject();

  // Session store for permission modes
  const defaultPermissionMode = useSessionStore((s) => s.defaultPermissionMode);
  const getPermissionMode = useSessionStore((s) => s.getPermissionMode);
  const setSessionPermissionMode = useSessionStore((s) => s.setPermissionMode);

  // Initialize permission mode from store (current session or default)
  const [permissionMode, setPermissionMode] = useState<ClaudePermissionMode>(
    () => {
      if (activeSessionId) {
        return getPermissionMode();
      }
      return defaultPermissionMode;
    }
  );

  // Sync permission mode when session changes
  useEffect(() => {
    if (activeSessionId) {
      const sessionMode = getPermissionMode();
      setPermissionMode(sessionMode);
    } else {
      setPermissionMode(defaultPermissionMode);
    }
  }, [activeSessionId, getPermissionMode, defaultPermissionMode]);

  // Handle permission mode change
  const handlePermissionModeChange = (mode: ClaudePermissionMode) => {
    setPermissionMode(mode);
    if (activeSessionId) {
      setSessionPermissionMode(mode);
    }
  };

  // Cycle to next permission mode
  const cyclePermissionMode = () => {
    const currentIndex = permissionModes.findIndex(
      (m) => m.id === permissionMode
    );
    const nextIndex = (currentIndex + 1) % permissionModes.length;
    const nextMode = permissionModes[nextIndex].id;
    handlePermissionModeChange(nextMode);
  };

  // Access text from controller instead of local state
  const text = controller.textInput.value;

  // Expose focus method to parent components
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    },
  }));

  // Update status based on external streaming state
  useEffect(() => {
    if (externalIsStreaming) {
      setStatus("streaming");
    } else if (status === "streaming") {
      setStatus("ready");
    }
  }, [externalIsStreaming, status]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Enter key for submission (before Tab handling)
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
      return;
    }

    // Shift+Tab to cycle permission modes
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      cyclePermissionMode();
      return;
    }
    // Shift+Enter creates new line (default textarea behavior)
  };

  // Handle text change and detect @ and / commands
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    controller.textInput.setInput(newValue);

    // Track cursor position
    setCursorPosition(e.target.selectionStart);

    // Check if user just typed "@" at the end
    if (newValue.endsWith("@")) {
      setIsAtMenuOpen(true);
      // Remove the @ from the text and update cursor position
      const textWithoutAt = newValue.slice(0, -1);
      controller.textInput.setInput(textWithoutAt);
      setCursorPosition(textWithoutAt.length);
    }

    // Slash command menu disabled - "/" will not trigger the menu
    // if (newValue.endsWith("/")) {
    //   setIsSlashMenuOpen(true);
    //   // Remove the / from the text and update cursor position
    //   const textWithoutSlash = newValue.slice(0, -1);
    //   controller.textInput.setInput(textWithoutSlash);
    //   setCursorPosition(textWithoutSlash.length);
    // }
  };

  // Handle file selection from file picker
  const handleFileSelect = (filePath: string) => {
    // Add a space after the file path for better formatting
    const filePathWithSpace = `${filePath} `;
    const result = insertAtCursor(text, filePathWithSpace, cursorPosition);

    // Update controller state
    controller.textInput.setInput(result.text);
    setCursorPosition(result.cursorPosition);
    setIsAtMenuOpen(false);

    // Focus and update cursor position
    if (textareaRef.current) {
      textareaRef.current.focus();

      // Update cursor position after a short delay to ensure DOM is updated
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(
            result.cursorPosition,
            result.cursorPosition
          );
        }
      }, 0);
    }
  };

  // Handle file removal from file picker
  const handleFileRemove = (filePath: string) => {
    const newText = removeAllOccurrences(text, filePath);
    controller.textInput.setInput(newText);
  };

  // Handle command selection from slash menu
  const handleCommandSelect = (command: string) => {
    // Insert command at position 0 with trailing space
    const commandText = `${command} `;
    const newText = commandText + text;
    controller.textInput.setInput(newText);

    // Close menu
    setIsSlashMenuOpen(false);

    // Focus textarea and position cursor after command
    if (textareaRef.current) {
      textareaRef.current.focus();
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = commandText.length;
          textareaRef.current.setSelectionRange(newPosition, newPosition);
          setCursorPosition(newPosition);
        }
      }, 0);
    }
  };

  const stop = () => {
    if (import.meta.env.DEV) {
      console.log("[ChatPromptInput] Stopping request...");
    }

    // Clear any pending timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setStatus("ready");
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    // If currently streaming or submitted, stop instead of submitting
    if (status === "streaming" || status === "submitted") {
      stop();
      return;
    }

    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      if (import.meta.env.DEV) {
        console.log("[ChatPromptInput] No text or attachments, skipping submit");
      }
      return;
    }

    if (disabled) {
      if (import.meta.env.DEV) {
        console.log("[ChatPromptInput] Submit disabled, skipping");
      }
      return;
    }

    if (import.meta.env.DEV) {
      console.log("[ChatPromptInput] Submitting message:", {
        text: message.text,
        filesCount: message.files?.length || 0,
        hasOnSubmit: !!onSubmit,
      });
    }

    setStatus("submitted");

    // If external onSubmit provided, use it
    if (onSubmit) {
      try {
        await onSubmit(message.text || "", message.files);
        if (import.meta.env.DEV) {
          console.log("[ChatPromptInput] Message submitted successfully");
        }
      } catch (error) {
        console.error("[ChatPromptInput] Error submitting message:", error);
        setStatus("error");
        return;
      }
    } else {
      console.warn(
        "[ChatPromptInput] No onSubmit handler provided, using mock"
      );
      // Mock behavior for demo
      setTimeout(() => {
        setStatus("streaming");
      }, SUBMITTING_TIMEOUT);

      timeoutRef.current = setTimeout(() => {
        setStatus("ready");
        timeoutRef.current = null;
      }, STREAMING_TIMEOUT);
    }
  };

  return (
    <div className="flex flex-col justify-end size-full">
      <PromptInput
        globalDrop
        multiple
        onSubmit={handleSubmit}
        inputGroupClassName={cn(
          "transition-colors",
          permissionMode === "plan" && "border-green-500 md:has-[[data-slot=input-group-control]:focus-visible]:border-green-500",
          permissionMode === "acceptEdits" && "border-purple-500 md:has-[[data-slot=input-group-control]:focus-visible]:border-purple-500",
          permissionMode === "reject" && "border-red-500 md:has-[[data-slot=input-group-control]:focus-visible]:border-red-500"
        )}
      >
        <PromptInputBody>
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
          <PromptInputTextarea
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            ref={textareaRef}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <ChatPromptInputFiles
              open={isAtMenuOpen}
              onOpenChange={setIsAtMenuOpen}
              projectId={activeProjectId || ""}
              projectPath={project?.path || ""}
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              textareaValue={text}
            />
            <ChatPromptInputSlashCommands
              open={isSlashMenuOpen}
              onOpenChange={setIsSlashMenuOpen}
              projectId={activeProjectId}
              onCommandSelect={handleCommandSelect}
            />
            <PromptInputSpeechButton
              onTranscriptionChange={controller.textInput.setInput}
              textareaRef={textareaRef}
            />
            <PromptInputPermissionModeSelect
              onValueChange={handlePermissionModeChange}
              value={permissionMode}
            >
              <PromptInputPermissionModeSelectTrigger>
                <PromptInputPermissionModeSelectValue />
              </PromptInputPermissionModeSelectTrigger>
              <PromptInputPermissionModeSelectContent>
                {permissionModes.map((mode) => (
                  <PromptInputPermissionModeSelectItem
                    key={mode.id}
                    value={mode.id}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`size-2 rounded-full ${mode.color}`} />
                      <span>{mode.name}</span>
                    </div>
                  </PromptInputPermissionModeSelectItem>
                ))}
              </PromptInputPermissionModeSelectContent>
            </PromptInputPermissionModeSelect>
          </PromptInputTools>
          <div className="flex items-center gap-2">
            {/* Token count display */}
            {totalTokens !== undefined && (
              <div className="text-xs text-muted-foreground">
                <span>
                  {totalTokens.toLocaleString()}
                  {currentMessageTokens && currentMessageTokens > 0 ? (
                    <span className="text-primary"> (+{currentMessageTokens.toLocaleString()})</span>
                  ) : null}
                  {' '}tokens
                </span>
              </div>
            )}
            <PromptInputSubmit
              className={cn(
                "!h-8 transition-colors",
                permissionMode === "plan" && "bg-green-500 hover:bg-green-600 text-white",
                permissionMode === "acceptEdits" && "bg-purple-500 hover:bg-purple-600 text-white",
                permissionMode === "reject" && "bg-red-500 hover:bg-red-600 text-white",
                permissionMode === "default" && "bg-gray-500 hover:bg-gray-600 text-white"
              )}
              status={status}
            />
          </div>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
});

ChatPromptInputInner.displayName = "ChatPromptInputInner";

// Wrapper component that provides the controller
export const ChatPromptInput = forwardRef<ChatPromptInputHandle, ChatPromptInputProps>((props, ref) => {
  return (
    <PromptInputProvider>
      <ChatPromptInputInner {...props} ref={ref} />
    </PromptInputProvider>
  );
});

ChatPromptInput.displayName = "ChatPromptInput";
