import type { FastifyInstance } from "fastify";
import { authRoutes } from "@/server/routes/auth";
import { projectRoutes } from "@/server/routes/projects";
import { sessionRoutes } from "@/server/routes/sessions";
import { slashCommandsRoutes } from "@/server/routes/slash-commands";

export async function registerRoutes(fastify: FastifyInstance) {
  // Register auth routes
  await fastify.register(authRoutes);

  // Register project routes
  await fastify.register(projectRoutes);

  // Register session routes
  await fastify.register(sessionRoutes);

  // Register slash commands routes
  await fastify.register(slashCommandsRoutes);

  // Health check endpoint
  fastify.get("/api/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
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
