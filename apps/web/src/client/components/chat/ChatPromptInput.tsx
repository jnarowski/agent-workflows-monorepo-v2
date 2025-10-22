"use client";

import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputProvider,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  usePromptInputController,
} from "@/client/components/ai-elements/prompt-input";
import { ChatPromptInputFiles } from "@/client/components/chat/ChatPromptInputFiles";
import { GlobeIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigationStore } from "@/client/stores/navigationStore";
import { useActiveProject } from "@/client/hooks/navigation/useActiveProject";
import { insertAtCursor, removeAllOccurrences } from "@/client/lib/fileUtils";

const models = [
  { id: "gpt-4", name: "GPT-4" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  { id: "claude-2", name: "Claude 2" },
  { id: "claude-instant", name: "Claude Instant" },
  { id: "palm-2", name: "PaLM 2" },
  { id: "llama-2-70b", name: "Llama 2 70B" },
  { id: "llama-2-13b", name: "Llama 2 13B" },
  { id: "cohere-command", name: "Command" },
  { id: "mistral-7b", name: "Mistral 7B" },
];

const SUBMITTING_TIMEOUT = 200;
const STREAMING_TIMEOUT = 2000;

interface ChatPromptInputProps {
  onSubmit?: (message: string, images?: File[]) => void | Promise<void>;
  disabled?: boolean;
  isStreaming?: boolean;
}

// Inner component that uses the controller
const ChatPromptInputInner = ({
  onSubmit,
  disabled = false,
  isStreaming: externalIsStreaming = false,
}: ChatPromptInputProps) => {
  const controller = usePromptInputController();
  const [model, setModel] = useState<string>(models[0].id);
  const [status, setStatus] = useState<
    "submitted" | "streaming" | "ready" | "error"
  >("ready");
  const [isAtMenuOpen, setIsAtMenuOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get active project ID from navigation store
  const { activeProjectId } = useNavigationStore();
  const { project } = useActiveProject();

  // Access text from controller instead of local state
  const text = controller.textInput.value;

  // Update status based on external streaming state
  useEffect(() => {
    if (externalIsStreaming) {
      setStatus("streaming");
    } else if (status === "streaming") {
      setStatus("ready");
    }
  }, [externalIsStreaming, status]);

  // Handle text change and detect @ command
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

  const stop = () => {
    console.log("[ChatPromptInput] Stopping request...");

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
      console.log("[ChatPromptInput] No text or attachments, skipping submit");
      return;
    }

    if (disabled) {
      console.log("[ChatPromptInput] Submit disabled, skipping");
      return;
    }

    console.log("[ChatPromptInput] Submitting message:", {
      text: message.text,
      filesCount: message.files?.length || 0,
      hasOnSubmit: !!onSubmit,
    });

    setStatus("submitted");

    // If external onSubmit provided, use it
    if (onSubmit) {
      try {
        await onSubmit(message.text || "", message.files);
        console.log("[ChatPromptInput] Message submitted successfully");
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
      <p>{text}</p>
      <PromptInput globalDrop multiple onSubmit={handleSubmit}>
        <PromptInputBody>
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
          <PromptInputTextarea
            onChange={handleTextChange}
            ref={textareaRef}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
            <ChatPromptInputFiles
              open={isAtMenuOpen}
              onOpenChange={setIsAtMenuOpen}
              projectId={activeProjectId || ""}
              projectPath={project?.path || ""}
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              textareaValue={text}
            />
            <PromptInputSpeechButton
              onTranscriptionChange={controller.textInput.setInput}
              textareaRef={textareaRef}
            />
            <PromptInputButton>
              <GlobeIcon size={16} />
              <span>Search</span>
            </PromptInputButton>
            <PromptInputModelSelect onValueChange={setModel} value={model}>
              <PromptInputModelSelectTrigger>
                <PromptInputModelSelectValue />
              </PromptInputModelSelectTrigger>
              <PromptInputModelSelectContent>
                {models.map((modelOption) => (
                  <PromptInputModelSelectItem
                    key={modelOption.id}
                    value={modelOption.id}
                  >
                    {modelOption.name}
                  </PromptInputModelSelectItem>
                ))}
              </PromptInputModelSelectContent>
            </PromptInputModelSelect>
          </PromptInputTools>
          <PromptInputSubmit className="!h-8" status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
};

// Wrapper component that provides the controller
export const ChatPromptInput = (props: ChatPromptInputProps) => {
  return (
    <PromptInputProvider>
      <ChatPromptInputInner {...props} />
    </PromptInputProvider>
  );
};
