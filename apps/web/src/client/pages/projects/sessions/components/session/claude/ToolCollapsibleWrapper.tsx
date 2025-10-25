/**
 * Reusable collapsible wrapper for tool blocks
 * Handles the collapsible UI logic while allowing tools to customize icon, title, and content
 */

import { useState, type ReactNode } from "react";
import { Button } from "@/client/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";
import { ToolDot } from "./components/ToolDot";
import { getToolColor } from "./utils/getToolColor";

interface ToolCollapsibleWrapperProps {
  toolName: string;
  contextInfo?: string | null;
  description?: string | null;
  hasError?: boolean;
  children: ReactNode;
  className?: string;
}

export function ToolCollapsibleWrapper({
  toolName,
  contextInfo,
  description,
  hasError = false,
  children,
  className = "",
}: ToolCollapsibleWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dotColor = getToolColor(toolName, hasError);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      {/* Header */}
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start px-0 py-1.5 hover:bg-transparent h-auto"
        >
          <div className="flex items-center gap-2.5 w-full min-w-0">
            <ToolDot color={dotColor} />
            <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-sm font-semibold">{toolName}</span>
                {contextInfo && (
                  <span className="text-xs text-muted-foreground font-mono truncate">
                    {contextInfo}
                  </span>
                )}
              </div>
              {description && (
                <span className="text-xs text-muted-foreground">
                  ↳ {description}
                </span>
              )}
            </div>
          </div>
        </Button>
      </CollapsibleTrigger>

      {/* Content */}
      <CollapsibleContent>
        <div className="pl-5 pt-2 pb-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
