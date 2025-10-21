import { useParams } from "react-router-dom";
import { useState } from "react";
import { ChatInterface } from "../components/chat/ChatInterface";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
} from "../../components/ai-elements/prompt-input";

export default function ProjectChat() {
  const { id } = useParams<{ id: string }>();
  const [inputValue, setInputValue] = useState("");

  // Handle message submission
  const handleSubmit = async (message: { text?: string; files?: any[] }) => {
    if (!message.text?.trim()) return;

    // TODO: Implement actual message sending via WebSocket/API
    // This is a placeholder for future implementation
    console.log("Sending message:", message);
    setInputValue("");
  };

  return (
    <div className="flex flex-col h-full relative">
      <ChatInterface projectId={id!} />

      {/* Floating Prompt Input */}
      <div className="absolute bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-10">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(e) => setInputValue(e.target.value)}
                value={inputValue}
                placeholder="Send a message..."
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputSubmit disabled={!inputValue.trim()} />
              </PromptInputTools>
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
