import { useParams } from "react-router-dom";
import { ChatInterface } from "../components/chat/ChatInterface";

export default function ProjectChat() {
  const { id } = useParams<{ id: string }>();

  return <ChatInterface projectId={id!} />;
}
