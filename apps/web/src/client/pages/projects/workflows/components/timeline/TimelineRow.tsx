import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface TimelineRowProps {
  icon: LucideIcon;
  iconColor: string;
  children: ReactNode;
}

/**
 * Shared timeline row layout component
 * Provides: icon circle + connector line + content area
 */
export function TimelineRow({
  icon: Icon,
  iconColor,
  children,
}: TimelineRowProps) {
  return (
    <div className="relative pl-10">
      {/* Timeline Icon */}
      <div
        className={`absolute left-0 -translate-x-1/2 h-9 w-9 flex items-center justify-center rounded-full ring-8 ring-background ${iconColor}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Content Area */}
      {children}
    </div>
  );
}
