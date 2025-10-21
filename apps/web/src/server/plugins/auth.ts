import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyPlugin from "fastify-plugin";
import { prisma } from "../../shared/prisma";

// JWT secret from environment or default for development
const JWT_SECRET =
  process.env.JWT_SECRET || "agent-workflows-dev-secret-change-in-production";

async function authPluginFunction(fastify: FastifyInstance) {
  // Register JWT plugin
  await fastify.register(fastifyJwt, {
    secret: JWT_SECRET,
  });

  // Decorate request with authenticate method
  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();

        // Verify user still exists in database
        const userId = (request.user as { userId: number }).userId;
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true, is_active: true },
        });

        if (!user || !user.is_active) {
          return reply
            .code(401)
            .send({ error: "Invalid token. User not found or inactive." });
        }

        // Attach user to request
        request.user = user;
      } catch (err) {
        console.error("err", err);
        return reply.code(401).send({ error: "Invalid or missing token" });
      }
    }
  );
}

// Export wrapped with fastify-plugin to avoid encapsulation
export const authPlugin = fastifyPlugin(authPluginFunction, {
  name: "auth-plugin",
});

// Type augmentation for FastifyInstance
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }

  interface FastifyRequest {
    user?: {
      id: number;
      username: string;
      is_active: boolean;
    };
  }
}
