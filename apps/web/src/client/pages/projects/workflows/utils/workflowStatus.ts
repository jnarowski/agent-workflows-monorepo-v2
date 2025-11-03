import { WorkflowStatus, StepStatus } from '../types';
import type { LucideIcon } from 'lucide-react';
import {
  Clock,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Ban,
  Circle,
  Loader2,
} from 'lucide-react';

export interface StatusConfig {
  color: string;
  bgColor: string;
  textColor: string;
  icon: LucideIcon;
  label: string;
}

const WORKFLOW_STATUS_CONFIG: Record<WorkflowStatus, StatusConfig> = {
  [WorkflowStatus.PENDING]: {
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    icon: Clock,
    label: 'Pending',
  },
  [WorkflowStatus.RUNNING]: {
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    icon: Play,
    label: 'Running',
  },
  [WorkflowStatus.PAUSED]: {
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    icon: Pause,
    label: 'Paused',
  },
  [WorkflowStatus.COMPLETED]: {
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    icon: CheckCircle2,
    label: 'Completed',
  },
  [WorkflowStatus.FAILED]: {
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    icon: XCircle,
    label: 'Failed',
  },
  [WorkflowStatus.CANCELLED]: {
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    icon: Ban,
    label: 'Cancelled',
  },
};

const STEP_STATUS_CONFIG: Record<StepStatus, StatusConfig> = {
  [StepStatus.PENDING]: {
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    icon: Circle,
    label: 'Pending',
  },
  [StepStatus.RUNNING]: {
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    icon: Loader2,
    label: 'Running',
  },
  [StepStatus.COMPLETED]: {
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    icon: CheckCircle2,
    label: 'Completed',
  },
  [StepStatus.FAILED]: {
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    icon: XCircle,
    label: 'Failed',
  },
  [StepStatus.SKIPPED]: {
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-500',
    icon: Circle,
    label: 'Skipped',
  },
};

export function getWorkflowStatusConfig(status: WorkflowStatus): StatusConfig {
  return WORKFLOW_STATUS_CONFIG[status];
}

export function getStepStatusConfig(status: StepStatus): StatusConfig {
  return STEP_STATUS_CONFIG[status];
}

// Utility to check if a workflow is in a terminal state
export function isTerminalStatus(status: WorkflowStatus): boolean {
  return [
    WorkflowStatus.COMPLETED,
    WorkflowStatus.FAILED,
    WorkflowStatus.CANCELLED,
  ].includes(status);
}

// Utility to check if a workflow is active
export function isActiveStatus(status: WorkflowStatus): boolean {
  return [WorkflowStatus.RUNNING, WorkflowStatus.PAUSED].includes(status);
}

// Utility to check if a step is in a terminal state
export function isStepTerminal(status: StepStatus): boolean {
  return [
    StepStatus.COMPLETED,
    StepStatus.FAILED,
    StepStatus.SKIPPED,
  ].includes(status);
}
