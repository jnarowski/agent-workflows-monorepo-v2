#!/usr/bin/env tsx
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { registerRoutes } from './routes';
import { registerWebSocket } from './websocket';
import { registerShellRoute } from './routes/shell';
import { authPlugin } from './plugins/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function createServer() {
  const fastify = Fastify({
    logger: {
      level: 'info',
    },
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
