/**
 * Tool use block with expandable input/output
 * Shows tool calls with collapsible details
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";
import { ToolInputRenderer } from "./tools/ToolInputRenderer";
import { ToolResultRenderer } from "./tools/ToolResultRenderer";

interface ToolUseBlockProps {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: {
    content: string;
    is_error?: boolean;
  };
  className?: string;
}

export function ToolUseBlock({
  name,
  input,
  result,
  className = "",
}: ToolUseBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Extract contextual info based on tool type
  const getContextInfo = (): string | null => {
    switch (name) {
      case "Read":
      case "Write":
      case "Edit": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filePath = (input as any).file_path as string | undefined;
        if (filePath) {
          // Show just the filename or last part of path
          const parts = filePath.split("/");
          return parts[parts.length - 1];
        }
        return null;
      }
      case "Glob":
      case "Grep": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pattern = (input as any).pattern as string | undefined;
        return pattern || null;
      }
      case "Bash": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const description = (input as any).description as string | undefined;
        if (description) return description;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const command = (input as any).command as string | undefined;
        if (command && command.length <= 40) return command;
        return null;
      }
      case "TodoWrite": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const todos = (input as any).todos as
          | Array<{ status: string }>
          | undefined;
        if (todos) {
          const completedCount = todos.filter(
            (t) => t.status === "completed"
          ).length;
          return `${completedCount} / ${todos.length} todos completed`;
        }
        return null;
      }
      case "WebSearch":
      case "WebFetch": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query = (input as any).query as string | undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const url = (input as any).url as string | undefined;
        return query || url || null;
      }
      default:
        return null;
    }
  };

  const contextInfo = getContextInfo();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-2 w-full">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <Badge variant="secondary" className="text-xs font-mono">
                {name}
              </Badge>
              {contextInfo && (
                <span className="text-xs text-muted-foreground font-mono truncate">
                  {contextInfo}
                </span>
              )}
            </div>
          </Button>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-2 space-y-3 border-t border-gray-200 dark:border-gray-800">
            {/* Tool Input */}
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">
                Input:
              </div>
              <ToolInputRenderer toolName={name} input={input} />
            </div>

            {/* Tool Result */}
            {result && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">
                  Output:
                </div>
                <ToolResultRenderer
                  result={result.content}
                  isError={result.is_error}
                />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
