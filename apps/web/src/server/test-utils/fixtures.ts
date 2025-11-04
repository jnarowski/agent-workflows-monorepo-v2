import { PrismaClient, AgentType, SessionState } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import type { JWTPayload } from "@/server/utils/auth";

/**
 * Default password for test users
 */
const DEFAULT_PASSWORD = "testpassword123";

/**
 * Creates a test user with hashed password
 * @param prisma - Prisma client instance
 * @param overrides - Optional fields to override defaults
 * @returns Created user (without password_hash)
 */
export async function createTestUser(
  prisma: PrismaClient,
  overrides?: Partial<{
    email: string;
    password: string;
    is_active: boolean;
  }>
) {
  const email = overrides?.email || "test@example.com";
  const password = overrides?.password || DEFAULT_PASSWORD;
  const is_active = overrides?.is_active ?? true;

  // Hash password with same salt rounds as production
  const saltRounds = 12;
  const password_hash = await bcrypt.hash(password, saltRounds);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password_hash,
      is_active,
      last_login: new Date(),
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      last_login: true,
      is_active: true,
    },
  });

  return user;
}

/**
 * Creates a test project
 * @param prisma - Prisma client instance
 * @param overrides - Optional fields to override defaults
 * @returns Created project
 */
export async function createTestProject(
  prisma: PrismaClient,
  overrides?: Partial<{
    name: string;
    path: string;
    is_hidden: boolean;
    is_starred: boolean;
  }>
) {
  const name = overrides?.name || "Test Project";
  const path = overrides?.path || "/tmp/test-project";
  const is_hidden = overrides?.is_hidden ?? false;
  const is_starred = overrides?.is_starred ?? false;

  const project = await prisma.project.create({
    data: {
      name,
      path,
      is_hidden,
      is_starred,
    },
  });

  return project;
}

/**
 * Creates a test agent session
 * @param prisma - Prisma client instance
 * @param overrides - Required projectId and userId, optional other fields
 * @returns Created session
 */
export async function createTestSession(
  prisma: PrismaClient,
  overrides: {
    projectId: string;
    userId: string;
    name?: string;
    agent?: AgentType;
    state?: SessionState;
    cli_session_id?: string;
    session_path?: string;
    metadata?: Record<string, unknown>;
    error_message?: string;
  }
) {
  const {
    projectId,
    userId,
    name = "Test Session",
    agent = AgentType.claude,
    state = SessionState.idle,
    cli_session_id,
    session_path,
    metadata = {},
    error_message,
  } = overrides;

  const session = await prisma.agentSession.create({
    data: {
      projectId,
      userId,
      name,
      agent,
      state,
      cli_session_id,
      session_path,
      metadata,
      error_message,
    },
  });

  return session;
}

/**
 * Creates a valid JWT token for testing authenticated requests
 * @param userId - User ID to encode in token
 * @param email - User email to encode in token
 * @param fastify - Fastify instance with JWT plugin (required)
 * @returns JWT token string
 */
export function createAuthToken(
  userId: string,
  email: string,
  fastify: FastifyInstance
): string {
  // Use Fastify's JWT plugin to sign token
  return fastify.jwt.sign({
    userId,
    email,
  } as JWTPayload);
}
