/**
 * Router for message renderers
 * Dispatches to UserMessage or AssistantMessage based on role
 */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { SessionMessage } from "@/shared/types/message.types";
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { ChevronDown, ChevronRight } from "lucide-react";

interface MessageRendererProps {
  message: SessionMessage;
  toolResults?: Map<string, { content: string; is_error?: boolean }>;
}

export function MessageRenderer({ message, toolResults }: MessageRendererProps) {
  const [searchParams] = useSearchParams();
  const debugMode = searchParams.get('debug') === 'true';
  const [isJsonExpanded, setIsJsonExpanded] = useState(false);

  const messageContent = (() => {
    switch (message.role) {
      case 'user':
        return <UserMessage message={message} />;

      case 'assistant':
        return <AssistantMessage message={message} toolResults={toolResults} />;

      default:
        console.warn('Unknown message role:', message.role);
        return null;
    }
  })();

  if (!debugMode) {
    return messageContent;
  }

  return (
    <div className="space-y-2">
      {messageContent}

      {/* Debug JSON viewer */}
      <div className="border border-orange-300 dark:border-orange-700 rounded-lg overflow-hidden bg-orange-50 dark:bg-orange-950/20">
        <button
          onClick={() => setIsJsonExpanded(!isJsonExpanded)}
          className="w-full px-3 py-2 flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
        >
          {isJsonExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span>Message JSON ({message.role})</span>
          <span className="text-xs opacity-70 ml-auto">ID: {message.id.substring(0, 8)}</span>
        </button>

        {isJsonExpanded && (
          <pre className="px-3 py-2 text-xs overflow-x-auto bg-white dark:bg-gray-950 border-t border-orange-200 dark:border-orange-800">
            <code className="text-gray-800 dark:text-gray-200">
              {JSON.stringify(message, null, 2)}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}
