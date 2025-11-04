import 'fastify';
import type { MockWorkflowOrchestrator } from '@/server/domain/workflow/services/MockWorkflowOrchestrator';

declare module 'fastify' {
  interface FastifyInstance {
    workflowOrchestrator: MockWorkflowOrchestrator;
  }
}
