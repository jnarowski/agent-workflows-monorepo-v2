import { EventEmitter } from 'node:events';
import { prisma } from '@/shared/prisma';
import type { FastifyBaseLogger } from 'fastify';

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
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'running',
          started_at: new Date()
        }
      });

      this.eventBus.emit('workflow:started', {
        executionId,
        projectId: execution.project_id,
        timestamp: new Date().toISOString()
      });

      // Process each step sequentially
      for (const step of execution.steps) {
        try {
          await this.processStep(execution, step);

          // Check if phase is complete
          if (await this.isPhaseComplete(execution, step.phase)) {
            this.eventBus.emit('workflow:phase:completed', {
              executionId,
              projectId: execution.project_id,
              phase: step.phase,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          // Step failed - halt workflow
          this.logger?.error({ executionId, stepId: step.id, error }, 'Step failed, halting workflow');

          await prisma.workflowExecution.update({
            where: { id: executionId },
            data: {
              status: 'failed',
              completed_at: new Date()
            }
          });

          this.eventBus.emit('workflow:failed', {
            executionId,
            projectId: execution.project_id,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });

          return; // Stop processing
        }
      }

      // All steps completed successfully
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'completed',
          completed_at: new Date()
        }
      });

      this.eventBus.emit('workflow:completed', {
        executionId,
        projectId: execution.project_id,
        timestamp: new Date().toISOString()
      });

      this.logger?.info({ executionId }, 'Workflow execution completed successfully');

    } catch (error) {
      this.logger?.error({ executionId, error }, 'Error processing workflow');

      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'failed',
          completed_at: new Date()
        }
      });

      if (projectId) {
        this.eventBus.emit('workflow:failed', {
          executionId,
          projectId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
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
    await prisma.workflowExecutionStep.update({
      where: { id: step.id },
      data: {
        status: 'running',
        started_at: new Date()
      }
    });

    this.eventBus.emit('workflow:step:started', {
      executionId: execution.id,
      projectId: execution.project_id,
      stepId: step.id,
      stepName: step.name,
      phase: step.phase,
      timestamp: new Date().toISOString()
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

      this.eventBus.emit('workflow:step:completed', {
        executionId: execution.id,
        projectId: execution.project_id,
        stepId: step.id,
        stepName: step.name,
        phase: step.phase,
        logs,
        timestamp: new Date().toISOString()
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

      this.eventBus.emit('workflow:step:failed', {
        executionId: execution.id,
        projectId: execution.project_id,
        stepId: step.id,
        stepName: step.name,
        phase: step.phase,
        error,
        timestamp: new Date().toISOString()
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
