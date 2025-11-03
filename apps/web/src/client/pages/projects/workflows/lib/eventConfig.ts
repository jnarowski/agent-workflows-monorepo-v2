import type { LucideIcon } from "lucide-react";
import {
  PlayCircle,
  CheckCircle,
  XCircle,
  PauseCircle,
  Ban,
  RefreshCw,
  Layers,
  MessageSquare,
  Clock,
} from "lucide-react";

export interface EventConfig {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
}

/**
 * Event display configuration registry
 * Single source of truth for all event type display properties
 */
export const EVENT_CONFIG: Record<string, EventConfig> = {
  // Workflow lifecycle events
  workflow_started: {
    icon: PlayCircle,
    iconColor: "bg-primary text-primary-foreground",
    label: "Workflow",
    badgeVariant: "default",
  },
  workflow_completed: {
    icon: CheckCircle,
    iconColor: "bg-green-500 text-white",
    label: "Workflow",
    badgeVariant: "default",
  },
  workflow_failed: {
    icon: XCircle,
    iconColor: "bg-destructive text-destructive-foreground",
    label: "Workflow",
    badgeVariant: "destructive",
  },
  workflow_paused: {
    icon: PauseCircle,
    iconColor: "bg-yellow-500 text-white",
    label: "Workflow",
    badgeVariant: "secondary",
  },
  workflow_resumed: {
    icon: RefreshCw,
    iconColor: "bg-primary text-primary-foreground",
    label: "Workflow",
    badgeVariant: "default",
  },
  workflow_cancelled: {
    icon: Ban,
    iconColor: "bg-destructive text-destructive-foreground",
    label: "Workflow",
    badgeVariant: "destructive",
  },

  // Phase events
  phase_started: {
    icon: Layers,
    iconColor: "bg-blue-500 text-white",
    label: "Phase",
    badgeVariant: "outline",
  },
  phase_completed: {
    icon: Layers,
    iconColor: "bg-blue-500 text-white",
    label: "Phase",
    badgeVariant: "outline",
  },

  // Step events
  step_started: {
    icon: PlayCircle,
    iconColor: "bg-purple-500 text-white",
    label: "Step",
    badgeVariant: "outline",
  },

  // Comment events
  comment_added: {
    icon: MessageSquare,
    iconColor: "bg-accent text-accent-foreground",
    label: "Comment",
    badgeVariant: "outline",
  },
};

/**
 * Get event configuration with fallback
 */
export function getEventConfig(eventType: string): EventConfig {
  return (
    EVENT_CONFIG[eventType] || {
      icon: Clock,
      iconColor: "bg-accent text-accent-foreground",
      label: "Event",
      badgeVariant: "outline",
    }
  );
}
