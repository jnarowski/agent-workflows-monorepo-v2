/**
 * Loading indicator displayed while agent is processing/streaming
 * Shows spinning loader icon with rotating whimsical phrases
 */

import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLoadingPhrase } from "@/client/hooks/useLoadingPhrase";

interface AgentLoadingIndicatorProps {
  isStreaming?: boolean;
}

/**
 * Agent loading indicator component
 * Displays when the agent is thinking/processing a response
 */
export function AgentLoadingIndicator({
  isStreaming = false,
}: AgentLoadingIndicatorProps) {
  const loadingPhrase = useLoadingPhrase(isStreaming);
  const [displayedText, setDisplayedText] = useState("");
  const [currentPhrase, setCurrentPhrase] = useState(loadingPhrase);

  // Typewriter effect when phrase changes
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText("");
      return;
    }

    // Detect phrase change
    if (loadingPhrase !== currentPhrase) {
      setCurrentPhrase(loadingPhrase);
      setDisplayedText("");
    }

    // Typing animation
    if (displayedText.length < loadingPhrase.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(loadingPhrase.slice(0, displayedText.length + 1));
      }, 50); // 50ms per character for smooth typing

      return () => clearTimeout(timeout);
    }
  }, [loadingPhrase, displayedText, currentPhrase, isStreaming]);

  if (!isStreaming) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
      <span className="text-orange-600 dark:text-orange-400 font-medium">
        {displayedText}
        {displayedText.length < loadingPhrase.length && (
          <span className="inline-block w-[2px] h-4 bg-orange-500 ml-0.5 animate-[blink_1s_step-end_infinite]" />
        )}
        {displayedText.length === loadingPhrase.length && "..."}
      </span>
    </div>
  );
}
