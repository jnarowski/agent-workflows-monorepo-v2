import type { WorkflowEvent } from '../types';
import { WorkflowTimelineCommentItem } from './WorkflowTimelineCommentItem';
import { formatRelativeTime } from '../utils/workflowFormatting';
import { Badge } from '@/client/components/ui/badge';
import {
  PlayCircle,
  CheckCircle,
  XCircle,
  PauseCircle,
  Ban,
  RefreshCw,
  Layers,
  Clock,
} from 'lucide-react';

export interface WorkflowTimelineEventItemProps {
  event: WorkflowEvent;
}

/**
 * Timeline item for workflow events (system events, comments, phase transitions)
 *
 * Renders different UI based on event_type:
 * - workflow_started, workflow_paused, workflow_resumed, workflow_cancelled, workflow_completed, workflow_failed
 * - phase_started, phase_completed
 * - comment_added (delegates to WorkflowTimelineCommentItem)
 */
export function WorkflowTimelineEventItem({ event }: WorkflowTimelineEventItemProps) {
  // Comment events are handled by WorkflowTimelineCommentItem
  if (event.event_type === 'comment_added') {
    return (
      <div className="relative pl-10">
        {/* Timeline dot */}
        <div className="absolute left-[7px] top-4 h-[14px] w-[14px] rounded-full border-4 border-background bg-muted-foreground" />
        <WorkflowTimelineCommentItem event={event} />
      </div>
    );
  }

  // System events render as compact timeline items
  const { icon, label, variant, description } = getEventDisplay(event);

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div
        className={`absolute left-[7px] top-4 h-[14px] w-[14px] rounded-full border-4 border-background ${getEventDotColor(
          event.event_type
        )}`}
      />

      {/* Event card */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={`flex-shrink-0 ${getIconColor(event.event_type)}`}>
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={variant} className="text-xs">
                {label}
              </Badge>
            </div>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(event.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Get display properties for each event type
 */
function getEventDisplay(event: WorkflowEvent): {
  icon: JSX.Element;
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  description?: string;
} {
  switch (event.event_type) {
    case 'workflow_started':
      return {
        icon: <PlayCircle className="h-4 w-4" />,
        label: 'Workflow Started',
        variant: 'default',
      };

    case 'workflow_completed':
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        label: 'Workflow Completed',
        variant: 'default',
      };

    case 'workflow_failed': {
      const data = event.event_data as { error_message?: string };
      return {
        icon: <XCircle className="h-4 w-4" />,
        label: 'Workflow Failed',
        variant: 'destructive',
        description: data.error_message,
      };
    }

    case 'workflow_paused': {
      const data = event.event_data as { user_id?: string; reason?: string };
      return {
        icon: <PauseCircle className="h-4 w-4" />,
        label: 'Workflow Paused',
        variant: 'secondary',
        description: data.reason,
      };
    }

    case 'workflow_resumed':
      return {
        icon: <RefreshCw className="h-4 w-4" />,
        label: 'Workflow Resumed',
        variant: 'default',
      };

    case 'workflow_cancelled': {
      const data = event.event_data as { user_id?: string; reason?: string };
      return {
        icon: <Ban className="h-4 w-4" />,
        label: 'Workflow Cancelled',
        variant: 'destructive',
        description: data.reason,
      };
    }

    case 'phase_started': {
      const data = event.event_data as { phase_name: string };
      return {
        icon: <Layers className="h-4 w-4" />,
        label: 'Phase Started',
        variant: 'outline',
        description: data.phase_name,
      };
    }

    case 'phase_completed': {
      const data = event.event_data as { phase_name: string };
      return {
        icon: <Layers className="h-4 w-4" />,
        label: 'Phase Completed',
        variant: 'outline',
        description: data.phase_name,
      };
    }

    case 'step_started': {
      const data = event.event_data as { step_id: string; step_name: string };
      return {
        icon: <PlayCircle className="h-4 w-4" />,
        label: 'Step Started',
        variant: 'outline',
        description: data.step_name,
      };
    }

    default:
      return {
        icon: <Clock className="h-4 w-4" />,
        label: 'Event',
        variant: 'outline',
      };
  }
}

/**
 * Get timeline dot color based on event type
 */
function getEventDotColor(eventType: string): string {
  switch (eventType) {
    case 'workflow_started':
    case 'workflow_resumed':
      return 'bg-primary';
    case 'workflow_completed':
      return 'bg-green-500';
    case 'workflow_failed':
    case 'workflow_cancelled':
      return 'bg-destructive';
    case 'workflow_paused':
      return 'bg-yellow-500';
    case 'phase_started':
    case 'phase_completed':
      return 'bg-blue-500';
    case 'step_started':
      return 'bg-purple-500';
    default:
      return 'bg-muted-foreground';
  }
}

/**
 * Get icon color based on event type
 */
function getIconColor(eventType: string): string {
  switch (eventType) {
    case 'workflow_started':
    case 'workflow_resumed':
      return 'text-primary';
    case 'workflow_completed':
      return 'text-green-500';
    case 'workflow_failed':
    case 'workflow_cancelled':
      return 'text-destructive';
    case 'workflow_paused':
      return 'text-yellow-500';
    case 'phase_started':
    case 'phase_completed':
      return 'text-blue-500';
    case 'step_started':
      return 'text-purple-500';
    default:
      return 'text-muted-foreground';
  }
}
