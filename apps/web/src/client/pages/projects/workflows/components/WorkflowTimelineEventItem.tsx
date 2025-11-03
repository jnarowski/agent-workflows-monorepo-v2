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
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState(false);

  // Comment events are handled by WorkflowTimelineCommentItem
  if (event.event_type === 'comment_added') {
    return (
      <div className="relative pl-10">
        {/* Timeline Icon */}
        <div className="absolute left-0 -translate-x-1/2 h-9 w-9 flex items-center justify-center rounded-full bg-accent ring-8 ring-background">
          <Clock className="h-5 w-5" />
        </div>
        <WorkflowTimelineCommentItem event={event} />
      </div>
    );
  }

  // System events render with new timeline design
  const { icon: Icon, label, variant, description } = getEventDisplay(event);
  const hasExpandableContent = description && description.length > 0;

  return (
    <div className="relative pl-10">
      {/* Timeline Icon */}
      <div
        className={`absolute left-0 -translate-x-1/2 h-9 w-9 flex items-center justify-center rounded-full ring-8 ring-background ${getEventBgColor(
          event.event_type
        )}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="pt-2 sm:pt-1 space-y-2">
        {hasExpandableContent ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full text-left"
          >
            {/* Event Type Label */}
            <Badge variant={variant} className="rounded-full text-xs">
              {label}
            </Badge>

            {/* Event Title & Timestamp */}
            <div className="mt-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold">{getEventTitle(event)}</h3>
                <span className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatRelativeTime(event.created_at)}</span>
              </div>
            </div>
          </button>
        ) : (
          <>
            {/* Event Type Label */}
            <Badge variant={variant} className="rounded-full text-xs">
              {label}
            </Badge>

            {/* Event Title & Timestamp */}
            <div>
              <h3 className="text-base font-semibold">{getEventTitle(event)}</h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatRelativeTime(event.created_at)}</span>
              </div>
            </div>
          </>
        )}

        {/* Description (collapsible if present) */}
        {hasExpandableContent && isExpanded && (
          <p className="text-sm text-muted-foreground text-pretty pt-1">
            {description}
          </p>
        )}

        {/* Event Data (if any additional metadata) */}
        {isExpanded && renderEventData(event)}
      </div>
    </div>
  );
}

/**
 * Get display properties for each event type
 */
function getEventDisplay(event: WorkflowEvent): {
  icon: typeof PlayCircle;
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  description?: string;
} {
  switch (event.event_type) {
    case 'workflow_started':
      return {
        icon: PlayCircle,
        label: 'Workflow',
        variant: 'default',
      };

    case 'workflow_completed':
      return {
        icon: CheckCircle,
        label: 'Workflow',
        variant: 'default',
      };

    case 'workflow_failed': {
      const data = event.event_data as { error_message?: string };
      return {
        icon: XCircle,
        label: 'Workflow',
        variant: 'destructive',
        description: data.error_message,
      };
    }

    case 'workflow_paused': {
      const data = event.event_data as { user_id?: string; reason?: string };
      return {
        icon: PauseCircle,
        label: 'Workflow',
        variant: 'secondary',
        description: data.reason,
      };
    }

    case 'workflow_resumed':
      return {
        icon: RefreshCw,
        label: 'Workflow',
        variant: 'default',
      };

    case 'workflow_cancelled': {
      const data = event.event_data as { user_id?: string; reason?: string };
      return {
        icon: Ban,
        label: 'Workflow',
        variant: 'destructive',
        description: data.reason,
      };
    }

    case 'phase_started': {
      const data = event.event_data as { phase_name: string };
      return {
        icon: Layers,
        label: 'Phase',
        variant: 'outline',
        description: data.phase_name,
      };
    }

    case 'phase_completed': {
      const data = event.event_data as { phase_name: string };
      return {
        icon: Layers,
        label: 'Phase',
        variant: 'outline',
        description: data.phase_name,
      };
    }

    case 'step_started': {
      const data = event.event_data as { step_id: string; step_name: string };
      return {
        icon: PlayCircle,
        label: 'Step',
        variant: 'outline',
        description: data.step_name,
      };
    }

    default:
      return {
        icon: Clock,
        label: 'Event',
        variant: 'outline',
      };
  }
}

/**
 * Get timeline icon background color based on event type
 */
function getEventBgColor(eventType: string): string {
  switch (eventType) {
    case 'workflow_started':
    case 'workflow_resumed':
      return 'bg-primary text-primary-foreground';
    case 'workflow_completed':
      return 'bg-green-500 text-white';
    case 'workflow_failed':
    case 'workflow_cancelled':
      return 'bg-destructive text-destructive-foreground';
    case 'workflow_paused':
      return 'bg-yellow-500 text-white';
    case 'phase_started':
    case 'phase_completed':
      return 'bg-blue-500 text-white';
    case 'step_started':
      return 'bg-purple-500 text-white';
    default:
      return 'bg-accent';
  }
}

/**
 * Get human-readable title for event
 */
function getEventTitle(event: WorkflowEvent): string {
  switch (event.event_type) {
    case 'workflow_started':
      return 'Workflow Started';
    case 'workflow_completed':
      return 'Workflow Completed Successfully';
    case 'workflow_failed':
      return 'Workflow Failed';
    case 'workflow_paused':
      return 'Workflow Paused';
    case 'workflow_resumed':
      return 'Workflow Resumed';
    case 'workflow_cancelled':
      return 'Workflow Cancelled';
    case 'phase_started': {
      const data = event.event_data as { phase_name: string };
      return `Phase "${data.phase_name}" Started`;
    }
    case 'phase_completed': {
      const data = event.event_data as { phase_name: string };
      return `Phase "${data.phase_name}" Completed`;
    }
    case 'step_started': {
      const data = event.event_data as { step_name: string };
      return `Step "${data.step_name}" Started`;
    }
    default:
      return 'Event';
  }
}

/**
 * Render additional event data as badges
 */
function renderEventData(event: WorkflowEvent): JSX.Element | null {
  const data = event.event_data as Record<string, unknown>;

  // Filter out data we already display (like phase_name, step_name, error_message, reason)
  const excludedKeys = [
    'phase_name',
    'step_name',
    'error_message',
    'reason',
    'user_id',
  ];
  const additionalData = Object.entries(data || {}).filter(
    ([key]) => !excludedKeys.includes(key)
  );

  if (additionalData.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {additionalData.map(([key, value]) => (
        <Badge key={key} variant="secondary" className="rounded-full">
          {key}: {String(value)}
        </Badge>
      ))}
    </div>
  );
}
