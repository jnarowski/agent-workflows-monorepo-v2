import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface WorkflowTimelineItemHeaderProps {
  /** Main title/heading */
  title: string;
  /** Whether the item is expanded */
  isExpanded: boolean;
  /** Callback when header is clicked */
  onToggle: () => void;
  /** Content for line 2 (metadata like timestamp, step number, etc.) */
  metadata?: ReactNode;
  /** Badge component to show on line 3 */
  badge?: ReactNode;
  /** Whether to show background when expanded */
  showExpandedBackground?: boolean;
  /** Optional children to render in expanded state */
  children?: ReactNode;
}

/**
 * Reusable timeline item header with consistent layout:
 * - Line 1: Title
 * - Line 2: Metadata (timestamp, step info, etc.)
 * - Line 3: Badge (status, type, etc.)
 * - Chevron on the right, vertically centered
 * - Optional background when expanded
 * - Optional divider and children when expanded
 */
export function WorkflowTimelineItemHeader({
  title,
  isExpanded,
  onToggle,
  metadata,
  badge,
  showExpandedBackground = true,
  children,
}: WorkflowTimelineItemHeaderProps) {
  return (
    <div
      className={`pt-2 sm:pt-1 space-y-2 rounded-lg transition-colors ${
        showExpandedBackground && isExpanded ? "bg-muted/30" : ""
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left flex items-stretch gap-3"
      >
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-base font-semibold truncate">{title}</h3>

          {/* Metadata (line 2) */}
          {metadata && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              {metadata}
            </div>
          )}

          {/* Badge (line 3) */}
          {badge && <div className="mt-2">{badge}</div>}
        </div>

        {/* Chevron - centered vertically on the right */}
        <div className="flex items-center self-stretch flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && children && (
        <div className="pt-5 space-y-3 border-t mt-5">{children}</div>
      )}
    </div>
  );
}
