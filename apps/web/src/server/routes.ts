import type { FastifyInstance } from "fastify";
import { prisma } from "@/shared/prisma";
import { authRoutes } from "@/server/routes/auth";
import { projectRoutes } from "@/server/routes/projects";
import { sessionRoutes } from "@/server/routes/sessions";
import { slashCommandsRoutes } from "@/server/routes/slash-commands";
import { gitRoutes } from "@/server/routes/git";
import { settingsRoutes } from "@/server/routes/settings";
import { registerWebSocketRoutes } from "@/server/routes/websocket";

export async function registerRoutes(fastify: FastifyInstance) {
  // Register auth routes
  await fastify.register(authRoutes);

  // Register project routes
  await fastify.register(projectRoutes);

  // Register session routes
  await fastify.register(sessionRoutes);

  // Register slash commands routes
  await fastify.register(slashCommandsRoutes);

  // Register git routes
  await fastify.register(gitRoutes);

  // Register settings routes
  await fastify.register(settingsRoutes);

  // Register websocket metrics routes
  await fastify.register(registerWebSocketRoutes);

  // Health check endpoint
  fastify.get("/api/health", async (request) => {
    // Test database connectivity
    let databaseConnected = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;
    } catch (error) {
      // Log warning but don't crash health endpoint
      request.log.warn(
        {
          err: error instanceof Error ? error : new Error(String(error)),
        },
        "Database connectivity check failed"
      );
      databaseConnected = false;
    }

    return {
      status: databaseConnected ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      database: {
        connected: databaseConnected,
      },
      features: {
        aiEnabled: !!process.env.ANTHROPIC_API_KEY,
      },
    };
  });

  // Server status endpoint
  fastify.get("/api/status", async () => {
    return {
      name: "@spectora/agent-workflows-ui",
      version: "0.1.0",
      uptime: process.uptime(),
    };
  });
}
