import { EventEmitter } from 'node:events';
import { prisma } from '@/shared/prisma';
import type { FastifyBaseLogger } from 'fastify';
import { createWorkflowEvent } from './createWorkflowEvent';

/**
 * Mock workflow orchestrator that auto-progresses workflows through steps.
 *
 * This is a mock implementation for frontend development - does not run real workflows.
 * Real workflow engine integration will be implemented in Phase 2.
 *
 * Simplified version without queue dependency - workflows are executed directly.
 */
export class MockWorkflowOrchestrator {
  private eventBus: EventEmitter;
  private logger?: FastifyBaseLogger;
  private isRunning = false;

  constructor(eventBus: EventEmitter, logger?: FastifyBaseLogger) {
    this.eventBus = eventBus;
    this.logger = logger;

    this.logger?.info('MockWorkflowOrchestrator initialized');
  }

  /**
   * Start the workflow orchestrator
   */
  start(): void {
    if (this.isRunning) {
      this.logger?.warn('Orchestrator already started');
      return;
    }

    this.isRunning = true;
    this.logger?.info('Workflow orchestrator started');
  }

  /**
   * Stop the workflow orchestrator
   */
  stop(): void {
    if (this.isRunning) {
      this.isRunning = false;
      this.logger?.info('Workflow orchestrator stopped');
    }
  }

  /**
   * Execute a workflow immediately (no queue)
   */
  async executeWorkflow(executionId: string): Promise<void> {
    if (!this.isRunning) {
      this.logger?.error('Cannot execute workflow - orchestrator not running');
      throw new Error('Workflow orchestrator not running');
    }

    this.logger?.info({ executionId }, 'Executing workflow');

    // Process workflow in background (don't await)
    this.processWorkflow(executionId).catch((error) => {
      this.logger?.error({ error, executionId }, 'Error processing workflow');
    });
  }

  /**
   * Process a workflow execution
   */
  private async processWorkflow(executionId: string): Promise<void> {
    let projectId: string | null = null;

    try {
      // Fetch execution with all steps
      const execution = await prisma.workflowExecution.findUnique({
        where: { id: executionId },
        include: {
          steps: {
            orderBy: { order: 'asc' }
          },
          definition: true
        }
      });

      if (!execution) {
        this.logger?.error({ executionId }, 'Workflow execution not found');
        return;
      }

      projectId = execution.project_id;

      // Update status to running and emit started event
      const startedAt = new Date();
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'running',
          started_at: startedAt
        }
      });

      // Create workflow_started event
      await createWorkflowEvent({
        workflow_execution_id: executionId,
        event_type: 'workflow_started',
        event_data: {},
        created_at: startedAt,
        logger: this.logger
      });

      this.eventBus.emit(`project:${execution.project_id}`, {
        type: 'workflow:started',
        data: {
          executionId,
          projectId: execution.project_id,
          timestamp: startedAt.toISOString()
        }
      });

      // Process each step sequentially
      let currentPhase: string | null = null;
      for (const step of execution.steps) {
        try {
          // Check if entering a new phase
          if (currentPhase !== step.phase) {
            currentPhase = step.phase;

            // Create phase_started event
            await createWorkflowEvent({
              workflow_execution_id: executionId,
              event_type: 'phase_started',
              event_data: {
                phase_name: step.phase
              },
              logger: this.logger
            });
          }

          await this.processStep(execution, step);

          // Check if phase is complete
          if (await this.isPhaseComplete(execution, step.phase)) {
            // Create phase_completed event
            await createWorkflowEvent({
              workflow_execution_id: executionId,
              event_type: 'phase_completed',
              event_data: {
                phase_name: step.phase
              },
              logger: this.logger
            });

            this.eventBus.emit(`project:${execution.project_id}`, {
              type: 'workflow:phase:completed',
              data: {
                executionId,
                projectId: execution.project_id,
                phase: step.phase,
                timestamp: new Date().toISOString()
              }
            });
          }
        } catch (error) {
          // Step failed - halt workflow
          this.logger?.error({ executionId, stepId: step.id, error }, 'Step failed, halting workflow');

          const failedAt = new Date();
          await prisma.workflowExecution.update({
            where: { id: executionId },
            data: {
              status: 'failed',
              completed_at: failedAt
            }
          });

          // Create workflow_failed event
          await createWorkflowEvent({
            workflow_execution_id: executionId,
            event_type: 'workflow_failed',
            event_data: {
              error: error instanceof Error ? error.message : 'Unknown error'
            },
            created_at: failedAt,
            logger: this.logger
          });

          this.eventBus.emit(`project:${execution.project_id}`, {
            type: 'workflow:failed',
            data: {
              executionId,
              projectId: execution.project_id,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: failedAt.toISOString()
            }
          });

          return; // Stop processing
        }
      }

      // All steps completed successfully
      const completedAt = new Date();
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'completed',
          completed_at: completedAt
        }
      });

      // Create workflow_completed event
      await createWorkflowEvent({
        workflow_execution_id: executionId,
        event_type: 'workflow_completed',
        event_data: {},
        created_at: completedAt,
        logger: this.logger
      });

      this.eventBus.emit(`project:${execution.project_id}`, {
        type: 'workflow:completed',
        data: {
          executionId,
          projectId: execution.project_id,
          timestamp: completedAt.toISOString()
        }
      });

      this.logger?.info({ executionId }, 'Workflow execution completed successfully');

    } catch (error) {
      this.logger?.error({ executionId, error }, 'Error processing workflow');

      const failedAt = new Date();
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'failed',
          completed_at: failedAt
        }
      });

      // Create workflow_failed event
      await createWorkflowEvent({
        workflow_execution_id: executionId,
        event_type: 'workflow_failed',
        event_data: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        created_at: failedAt,
        logger: this.logger
      });

      if (projectId) {
        this.eventBus.emit(`project:${projectId}`, {
          type: 'workflow:failed',
          data: {
            executionId,
            projectId,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: failedAt.toISOString()
          }
        });
      }
    }
  }

  /**
   * Process a single workflow step
   */
  private async processStep(
    execution: { id: string; project_id: string | null },
    step: { id: string; name: string; order: number; phase: string }
  ): Promise<void> {
    this.logger?.info({ executionId: execution.id, stepId: step.id, stepName: step.name }, 'Processing step');

    // Update step status to running
    const startedAt = new Date();
    await prisma.workflowExecutionStep.update({
      where: { id: step.id },
      data: {
        status: 'running',
        started_at: startedAt
      }
    });

    // Create step_started event (using step's started_at timestamp)
    await createWorkflowEvent({
      workflow_execution_id: execution.id,
      event_type: 'step_started',
      event_data: {
        step_id: step.id,
        step_name: step.name
      },
      workflow_execution_step_id: step.id,
      created_at: startedAt,
      logger: this.logger
    });

    this.eventBus.emit(`project:${execution.project_id}`, {
      type: 'workflow:step:started',
      data: {
        executionId: execution.id,
        projectId: execution.project_id,
        stepId: step.id,
        stepName: step.name,
        phase: step.phase,
        timestamp: startedAt.toISOString()
      }
    });

    // Simulate work with random delay (3-5 seconds)
    const delay = Math.random() * 2000 + 3000;
    await new Promise(resolve => setTimeout(resolve, delay));

    // 90% success rate (10% random failure)
    const success = Math.random() > 0.1;

    if (success) {
      // Generate mock logs
      const logs = this.generateMockLogs(step.name);

      // Update step status to completed
      await prisma.workflowExecutionStep.update({
        where: { id: step.id },
        data: {
          status: 'completed',
          completed_at: new Date(),
          logs
        }
      });

      this.eventBus.emit(`project:${execution.project_id}`, {
        type: 'workflow:step:completed',
        data: {
          executionId: execution.id,
          projectId: execution.project_id,
          stepId: step.id,
          stepName: step.name,
          phase: step.phase,
          logs,
          timestamp: new Date().toISOString()
        }
      });

      this.logger?.info({ executionId: execution.id, stepId: step.id }, 'Step completed successfully');
    } else {
      // Step failed
      const error = `Step "${step.name}" failed during execution`;

      await prisma.workflowExecutionStep.update({
        where: { id: step.id },
        data: {
          status: 'failed',
          completed_at: new Date(),
          logs: `[ERROR] ${error}`
        }
      });

      this.eventBus.emit(`project:${execution.project_id}`, {
        type: 'workflow:step:failed',
        data: {
          executionId: execution.id,
          projectId: execution.project_id,
          stepId: step.id,
          stepName: step.name,
          phase: step.phase,
          error,
          timestamp: new Date().toISOString()
        }
      });

      throw new Error(error);
    }
  }

  /**
   * Generate realistic mock logs for a step
   */
  private generateMockLogs(stepName: string): string {
    const timestamp = new Date().toISOString();
    const templates: Record<string, string[]> = {
      'Clone repository': [
        `[${timestamp}] Cloning repository...`,
        `[${timestamp}] Fetching objects: 100% (1234/1234), done.`,
        `[${timestamp}] Repository cloned successfully`,
      ],
      'Install dependencies': [
        `[${timestamp}] Installing dependencies...`,
        `[${timestamp}] Resolving packages...`,
        `[${timestamp}] Fetching packages: 100% (45/45)`,
        `[${timestamp}] Dependencies installed successfully`,
      ],
      'Run tests': [
        `[${timestamp}] Running test suite...`,
        `[${timestamp}] Test Suites: 12 passed, 12 total`,
        `[${timestamp}] Tests: 145 passed, 145 total`,
        `[${timestamp}] Snapshots: 0 total`,
        `[${timestamp}] Time: 23.456s`,
        `[${timestamp}] All tests passed!`,
      ],
      'Build application': [
        `[${timestamp}] Building application...`,
        `[${timestamp}] Compiling TypeScript...`,
        `[${timestamp}] Bundling assets...`,
        `[${timestamp}] Build completed: dist/ (2.3 MB)`,
      ],
      'Deploy to staging': [
        `[${timestamp}] Deploying to staging environment...`,
        `[${timestamp}] Uploading artifacts...`,
        `[${timestamp}] Running health checks...`,
        `[${timestamp}] Deployment successful: https://staging.example.com`,
      ],
    };

    // Use specific template if available, otherwise generic
    const logs = templates[stepName] || [
      `[${timestamp}] Executing step: ${stepName}`,
      `[${timestamp}] Processing...`,
      `[${timestamp}] Step completed successfully`,
    ];

    return logs.join('\n');
  }

  /**
   * Check if all steps in a phase are complete
   */
  private async isPhaseComplete(
    execution: { id: string },
    phase: string
  ): Promise<boolean> {
    const steps = await prisma.workflowExecutionStep.findMany({
      where: {
        workflow_execution_id: execution.id,
        phase
      }
    });

    return steps.every(step =>
      step.status === 'completed' || step.status === 'skipped'
    );
  }
}
