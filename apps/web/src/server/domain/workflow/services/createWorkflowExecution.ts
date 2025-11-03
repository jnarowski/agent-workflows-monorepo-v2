import { prisma } from '@/shared/prisma';
import type { CreateWorkflowExecutionInput } from '../types';
import type { WorkflowExecution } from '@prisma/client';

/**
 * Creates a new workflow execution record
 * Sets initial state: status='pending', current_phase=first_phase, current_step_index=0
 * Returns null if workflow definition not found
 */
export async function createWorkflowExecution(
  data: CreateWorkflowExecutionInput
): Promise<WorkflowExecution | null> {
  // Get workflow definition to extract first phase
  const definition = await prisma.workflowDefinition.findUnique({
    where: { id: data.workflow_definition_id },
  });

  if (!definition) {
    return null;
  }

  // Extract first phase from phases JSON array
  const phases = definition.phases as string[];
  const firstPhase = phases.length > 0 ? phases[0] : null;

  const execution = await prisma.workflowExecution.create({
    data: {
      project_id: data.project_id,
      user_id: data.user_id,
      workflow_definition_id: data.workflow_definition_id,
      name: data.name,
      args: data.args,
      current_phase: firstPhase,
      current_step_index: 0,
      status: 'pending',
    },
    include: {
      workflow_definition: true,
      steps: true,
      events: true,
    },
  });

  return execution;
}
