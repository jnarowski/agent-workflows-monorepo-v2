#!/usr/bin/env tsx
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider
} from 'fastify-type-provider-zod';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { registerRoutes } from '@/server/routes';
import { registerWebSocket } from '@/server/websocket';
import { registerShellRoute } from '@/server/routes/shell';
import { authPlugin } from '@/server/plugins/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function createServer() {
  const fastify = Fastify({
    logger: process.env.NODE_ENV === 'production'
      ? {
          level: process.env.LOG_LEVEL || 'info',
          transport: {
            targets: [
              // Console output (for Docker, PM2, systemd)
              {
                target: 'pino/file',
                options: { destination: 1 }, // stdout
                level: 'info'
              },
              // File output
              {
                target: 'pino/file',
                options: {
                  destination: process.env.LOG_FILE || './logs/app.log',
                  mkdir: true
                },
                level: process.env.LOG_LEVEL || 'info'
              }
            ]
          }
        }
      : {
          // Development: pretty-print to console + log file
          level: process.env.LOG_LEVEL || 'info',
          transport: {
            targets: [
              // Pretty console output
              {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'HH:MM:ss Z',
                  ignore: 'pid,hostname'
                },
                level: process.env.LOG_LEVEL || 'info'
              },
              // File output (plain JSON)
              {
                target: 'pino/file',
                options: {
                  destination: process.env.LOG_FILE || './logs/app.log',
                  mkdir: true
                },
                level: process.env.LOG_LEVEL || 'info'
              }
            ]
          }
        }
  }).withTypeProvider<ZodTypeProvider>();

  // Set up Zod validation
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Custom error handler for Zod validation
  fastify.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      return reply.status(400).send({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.validation,
          statusCode: 400,
        },
      });
    }

    const statusCode = error.statusCode || 500;
    fastify.log.error({
      err: error,
      url: request.url,
      method: request.method,
    }, 'Request error');

    return reply.status(statusCode).send({
      error: {
        message: error.message,
        statusCode,
      },
    });
  });

  // Configure JSON parser to allow empty bodies
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (req, body, done) => {
      try {
        // Allow empty bodies (e.g., DELETE requests with Content-Type: application/json)
        const json = body === '' ? {} : JSON.parse(body as string);
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  // Register CORS
  await fastify.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
    credentials: true,
  });

  // Register rate limiting (global: false - only on specific routes)
  await fastify.register(rateLimit, {
    global: false,
  });

  // Register auth plugin (JWT)
  await fastify.register(authPlugin);

  // Register WebSocket support
  await fastify.register(fastifyWebsocket);

  // Register API routes
  await registerRoutes(fastify);

  // Register WebSocket handler
  await registerWebSocket(fastify);

  // Register Shell WebSocket handler
  await registerShellRoute(fastify);

  // Serve static files from dist/client/ (production build only)
  // In production, the built client files are in dist/client/
  const distDir = join(__dirname, '../../dist/client');
  const hasDistDir = existsSync(distDir);

  if (hasDistDir) {
    await fastify.register(fastifyStatic, {
      root: distDir,
      prefix: '/',
    });

    // SPA fallback: serve index.html for all non-API routes
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api') || request.url.startsWith('/ws') || request.url.startsWith('/shell')) {
        reply.code(404).send({ error: 'Not found' });
      } else {
        reply.sendFile('index.html');
      }
    });
  } else {
    // Development mode: no static files, just API and WebSocket
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api') || request.url.startsWith('/ws') || request.url.startsWith('/shell')) {
        reply.code(404).send({ error: 'Not found' });
      } else {
        reply.code(200).send({
          message: 'Development mode: Frontend not built',
          hint: 'Run "pnpm dev" to start both frontend (Vite) and backend servers',
          viteUrl: 'http://localhost:5173',
          apiUrl: 'http://localhost:3456/api',
        });
      }
    });
  }

  return fastify;
}

// Start server when run directly (not imported as module)
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = parseInt(process.env.PORT || '3456');
  const HOST = process.env.HOST || '127.0.0.1';

  const server = await createServer();

  await server.listen({
    port: PORT,
    host: HOST,
  });

  console.log('');
  console.log('🚀 Fastify server running at:');
  console.log(`   http://${HOST}:${PORT}`);
  console.log('');
}
