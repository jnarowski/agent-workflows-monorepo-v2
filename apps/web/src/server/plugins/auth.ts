import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyPlugin from "fastify-plugin";
import { prisma } from "@/shared/prisma";
import { JWTPayload } from "@/server/utils/auth.utils";
import { buildErrorResponse } from "@/server/utils/error.utils";

// JWT secret from environment - required for security
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

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
        const decoded = await request.jwtVerify<JWTPayload>();

        // Verify user still exists in database
        const userId = decoded.userId;
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true, is_active: true },
        });

        if (!user || !user.is_active) {
          return reply
            .code(401)
            .send(buildErrorResponse(401, "Invalid token. User not found or inactive."));
        }

        // Attach user to request
        request.user = user;
      } catch (err) {
        fastify.log.debug({ err }, "Authentication failed");
        return reply.code(401).send(buildErrorResponse(401, "Invalid or missing token"));
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
      id: string;
      username: string;
      is_active: boolean;
    };
  }
}
