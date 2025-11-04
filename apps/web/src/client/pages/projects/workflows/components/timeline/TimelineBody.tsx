import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export interface TimelineBodyProps {
  isExpanded: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

/**
 * Shared timeline body component
 * Renders: expandable section with chevron
 * Only shows chevron if children provided (optional expandable)
 */
export function TimelineBody({ isExpanded, onToggle, children }: TimelineBodyProps) {
  // Don't render anything if no children
  if (!children) {
    return null;
  }

  return (
    <>
      {/* Expand/Collapse Button */}
      <button
        onClick={onToggle}
        className="absolute right-0 top-2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label={isExpanded ? "Collapse" : "Expand"}
      >
        <ChevronRight
          className={`h-4 w-4 transition-transform duration-200 ${
            isExpanded ? "rotate-90" : ""
          }`}
        />
      </button>

      {/* Divider */}
      {isExpanded && (
        <div className="my-2 border-t border-border" />
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="pb-2">
          {children}
        </div>
      )}
    </>
  );
}
