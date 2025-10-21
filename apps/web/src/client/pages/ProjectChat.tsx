import { useParams } from "react-router-dom";
import { ChatInterface } from "../components/chat/ChatInterface";
import { ChatPromptInput } from "../components/chat/ChatPromptInput";

export default function ProjectChat() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Chat Messages Container - takes up remaining space */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface projectId={id!} />
      </div>

      {/* Fixed Input Container at Bottom */}
      <div className="pb-4">
        <div className="mx-auto max-w-4xl">
          <ChatPromptInput />
        </div>
      </div>
    </div>
  );
}
