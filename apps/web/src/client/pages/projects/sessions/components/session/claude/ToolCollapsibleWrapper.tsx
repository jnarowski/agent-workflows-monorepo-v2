/**
 * Reusable collapsible wrapper for tool blocks
 * Handles the collapsible UI logic while allowing tools to customize icon, title, and content
 */

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";

interface ToolCollapsibleWrapperProps {
  icon: LucideIcon;
  toolName: string;
  contextInfo?: string | null;
  children: ReactNode;
  className?: string;
}

export function ToolCollapsibleWrapper({
  icon: Icon,
  toolName,
  contextInfo,
  children,
  className = "",
}: ToolCollapsibleWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);

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
              <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <Badge variant="secondary" className="text-xs font-mono">
                {toolName}
              </Badge>
              {contextInfo && (
                <span className="text-xs text-muted-foreground font-mono truncate">
                  {contextInfo}
                </span>
              )}
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </Button>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-2 space-y-3 border-t border-gray-200 dark:border-gray-800">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
