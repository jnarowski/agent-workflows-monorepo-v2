import type { ReactNode } from "react";

export interface TimelineHeaderProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  metadata?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
  isExpandable?: boolean;
}

/**
 * Shared timeline header component
 * Renders: title + subtitle + metadata + badge in consistent layout
 * Can be clickable when onClick is provided (for expandable items)
 */
export function TimelineHeader({
  title,
  subtitle,
  metadata,
  badge,
  onClick,
  isExpandable = false,
}: TimelineHeaderProps) {
  const content = (
    <div className="flex-1 space-y-1">
      {/* Title */}
      <h3 className="text-sm font-medium leading-none flex items-center gap-2">
        <div>{typeof title === "string" ? title : title}</div>
        <div>{badge}</div>
      </h3>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-xs text-muted-foreground">
          {typeof subtitle === "string" ? subtitle : subtitle}
        </div>
      )}

      {/* Metadata */}
      {metadata && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {metadata}
        </div>
      )}
    </div>
  );

  if (onClick && isExpandable) {
    return (
      <button
        onClick={onClick}
        className="flex items-start justify-between gap-4 py-2 w-full text-left -mx-2 px-2 rounded-md transition-colors cursor-pointer hover:bg-muted/50"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4 py-2">{content}</div>
  );
}
