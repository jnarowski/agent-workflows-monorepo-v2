import type { FastifyInstance } from 'fastify';
import { authRoutes } from './routes/auth';

export async function registerRoutes(fastify: FastifyInstance) {
  // Register auth routes
  await fastify.register(authRoutes);

  // Health check endpoint
  fastify.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Server status endpoint
  fastify.get('/api/status', async () => {
    return {
      name: '@spectora/agent-workflows-ui',
      version: '0.1.0',
      uptime: process.uptime(),
    };
  });

  // Fake data endpoint with timeout to demonstrate React Query
  fastify.get('/api/workflows', async () => {
    // Simulate a slow API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      workflows: [
        {
          id: '1',
          name: 'Code Review Workflow',
          status: 'running',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          steps: 5,
          completedSteps: 3,
        },
        {
          id: '2',
          name: 'Documentation Generation',
          status: 'completed',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          steps: 3,
          completedSteps: 3,
        },
        {
          id: '3',
          name: 'Test Suite Execution',
          status: 'pending',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          steps: 8,
          completedSteps: 0,
        },
      ],
    };
  });
}
