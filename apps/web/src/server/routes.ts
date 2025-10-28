import type { FastifyInstance } from "fastify";
import { authRoutes } from "@/server/routes/auth";
import { projectRoutes } from "@/server/routes/projects";
import { sessionRoutes } from "@/server/routes/sessions";
import { slashCommandsRoutes } from "@/server/routes/slash-commands";
import { gitRoutes } from "@/server/routes/git";
import { settingsRoutes } from "@/server/routes/settings";

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

  // Health check endpoint
  fastify.get("/api/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
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
