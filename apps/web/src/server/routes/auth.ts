import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../../shared/prisma';

// Type augmentation for request.user
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: number;
      username: string;
      is_active: boolean;
    };
  }
}

// Authentication middleware
async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();

    // Verify user still exists in database
    const userId = (request.user as { userId: number }).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, is_active: true },
    });

    if (!user || !user.is_active) {
      return reply.code(401).send({ error: 'Invalid token. User not found or inactive.' });
    }

    // Attach user to request
    request.user = user;
  } catch (err) {
    return reply.code(401).send({ error: 'Invalid or missing token' });
  }
}

export async function authRoutes(fastify: FastifyInstance) {
  // Check auth status and setup requirements
  fastify.get('/api/auth/status', async (request, reply) => {
    try {
      const userCount = await prisma.user.count();
      const needsSetup = userCount === 0;

      return reply.send({
        needsSetup,
        isAuthenticated: false, // Will be overridden by frontend if token exists
      });
    } catch (error) {
      fastify.log.error('Auth status error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // User registration (setup) - only allowed if no users exist
  fastify.post<{
    Body: { username: string; password: string };
  }>('/api/auth/register', async (request, reply) => {
    try {
      const { username, password } = request.body;

      // Validate input
      if (!username || !password) {
        return reply.code(400).send({ error: 'Username and password are required' });
      }

      if (username.length < 3 || password.length < 6) {
        return reply.code(400).send({
          error: 'Username must be at least 3 characters, password at least 6 characters',
        });
      }

      // Check if users already exist (only allow one user)
      const existingUserCount = await prisma.user.count();
      if (existingUserCount > 0) {
        return reply.code(403).send({
          error: 'User already exists. This is a single-user system.',
        });
      }

      // Hash password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          password_hash,
          last_login: new Date(),
        },
        select: {
          id: true,
          username: true,
        },
      });

      // Generate token (no expiration)
      const token = fastify.jwt.sign(
        {
          userId: user.id,
          username: user.username,
        },
        // No expiration - token lasts forever
      );

      return reply.send({
        success: true,
        user,
        token,
      });
    } catch (error) {
      fastify.log.error('Registration error:', error);

      // Check for unique constraint violation
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        return reply.code(409).send({ error: 'Username already exists' });
      }

      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // User login
  fastify.post<{
    Body: { username: string; password: string };
  }>('/api/auth/login', async (request, reply) => {
    try {
      const { username, password } = request.body;

      // Validate input
      if (!username || !password) {
        return reply.code(400).send({ error: 'Username and password are required' });
      }

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { username },
      });

      if (!user) {
        return reply.code(401).send({ error: 'Invalid username or password' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return reply.code(401).send({ error: 'Invalid username or password' });
      }

      // Check if user is active
      if (!user.is_active) {
        return reply.code(403).send({ error: 'Account is inactive' });
      }

      // Generate token (no expiration)
      let token;
      try {
        token = fastify.jwt.sign(
          {
            userId: user.id,
            username: user.username,
          },
          // No expiration - token lasts forever
        );
      } catch (jwtError) {
        fastify.log.error('JWT signing error:', jwtError);
        return reply.code(500).send({ error: 'Failed to generate token' });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { last_login: new Date() },
      });

      return reply.send({
        success: true,
        user: {
          id: user.id,
          username: user.username,
        },
        token,
      });
    } catch (error) {
      fastify.log.error('Login error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get current user (protected route)
  fastify.get('/api/auth/user', {
    preHandler: authenticate,
  }, async (request, reply) => {
    return reply.send({
      user: request.user,
    });
  });

  // Logout (client-side token removal, but this endpoint exists for consistency)
  fastify.post('/api/auth/logout', {
    preHandler: authenticate,
  }, async (request, reply) => {
    // In a simple JWT system, logout is mainly client-side
    // This endpoint exists for consistency and potential future logging
    return reply.send({
      success: true,
      message: 'Logged out successfully',
    });
  });
}
