import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { NotFoundError } from '@/server/utils/error';
import { buildSuccessResponse } from '@/server/utils/response';
import { getProjectById } from '@/server/services/project';
import * as gitService from '@/server/services/git.service';
import * as gitSchemas from '@/server/schemas/git';

export async function gitRoutes(fastify: FastifyInstance) {
  // GET /api/projects/:id/git/status - Get git status
  fastify.get<{
    Params: z.infer<typeof gitSchemas.gitProjectParamsSchema>;
  }>(
    '/api/projects/:id/git/status',
    {
      schema: {
        params: gitSchemas.gitProjectParamsSchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;

      const project = await getProjectById(id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const status = await gitService.getGitStatus(project.path, fastify.log);
      return reply.send(buildSuccessResponse(status));
    }
  );

  // GET /api/projects/:id/git/branches - Get all branches
  fastify.get<{
    Params: z.infer<typeof gitSchemas.gitProjectParamsSchema>;
  }>(
    '/api/projects/:id/git/branches',
    {
      schema: {
        params: gitSchemas.gitProjectParamsSchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;

      const project = await getProjectById(id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const branches = await gitService.getBranches(project.path, fastify.log);
      return reply.send(buildSuccessResponse(branches));
    }
  );

  // POST /api/projects/:id/git/branch - Create and switch to new branch
  fastify.post<{
    Params: z.infer<typeof gitSchemas.gitProjectParamsSchema>;
    Body: z.infer<typeof gitSchemas.gitBranchBodySchema>;
  }>(
    '/api/projects/:id/git/branch',
    {
      schema: {
        params: gitSchemas.gitProjectParamsSchema,
        body: gitSchemas.gitBranchBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;
      const { name, from } = request.body;
      const userId = request.user!.id;

      const project = await getProjectById(id, userId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const branch = await gitService.createAndSwitchBranch(project.path, name, from, fastify.log);
      return reply.code(201).send(buildSuccessResponse(branch));
    }
  );

  // POST /api/projects/:id/git/branch/switch - Switch to existing branch
  fastify.post<{
    Params: z.infer<typeof gitSchemas.gitProjectParamsSchema>;
    Body: z.infer<typeof gitSchemas.gitSwitchBranchBodySchema>;
  }>(
    '/api/projects/:id/git/branch/switch',
    {
      schema: {
        params: gitSchemas.gitProjectParamsSchema,
        body: gitSchemas.gitSwitchBranchBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;
      const { name } = request.body;
      const userId = request.user!.id;

      const project = await getProjectById(id, userId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const branch = await gitService.switchBranch(project.path, name, fastify.log);
      return reply.send(buildSuccessResponse(branch));
    }
  );

  // POST /api/projects/:id/git/stage - Stage files
  fastify.post<{
    Params: z.infer<typeof gitSchemas.gitProjectParamsSchema>;
    Body: z.infer<typeof gitSchemas.gitStageFilesBodySchema>;
  }>(
    '/api/projects/:id/git/stage',
    {
      schema: {
        params: gitSchemas.gitProjectParamsSchema,
        body: gitSchemas.gitStageFilesBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;
      const { files } = request.body;
      const userId = request.user!.id;

      const project = await getProjectById(id, userId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      await gitService.stageFiles(project.path, files, fastify.log);
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/projects/:id/git/unstage - Unstage files
  fastify.post<{
    Params: z.infer<typeof gitSchemas.gitProjectParamsSchema>;
    Body: z.infer<typeof gitSchemas.gitStageFilesBodySchema>;
  }>(
    '/api/projects/:id/git/unstage',
    {
      schema: {
        params: gitSchemas.gitProjectParamsSchema,
        body: gitSchemas.gitStageFilesBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;
      const { files } = request.body;
      const userId = request.user!.id;

      const project = await getProjectById(id, userId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      await gitService.unstageFiles(project.path, files, fastify.log);
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/projects/:id/git/commit - Commit changes
  fastify.post<{
    Params: z.infer<typeof gitSchemas.gitProjectParamsSchema>;
    Body: z.infer<typeof gitSchemas.gitCommitBodySchema>;
  }>(
    '/api/projects/:id/git/commit',
    {
      schema: {
        params: gitSchemas.gitProjectParamsSchema,
        body: gitSchemas.gitCommitBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;
      const { message, files } = request.body;
      const userId = request.user!.id;

      const project = await getProjectById(id, userId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const hash = await gitService.commitChanges(project.path, message, files, fastify.log);
      return reply.code(201).send(buildSuccessResponse({ hash }));
    }
  );

  // POST /api/projects/:id/git/push - Push to remote
  fastify.post<{
    Params: z.infer<typeof gitSchemas.gitProjectParamsSchema>;
    Body: z.infer<typeof gitSchemas.gitPushBodySchema>;
  }>(
    '/api/projects/:id/git/push',
    {
      schema: {
        params: gitSchemas.gitProjectParamsSchema,
        body: gitSchemas.gitPushBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;
      const { branch, remote } = request.body;
      const userId = request.user!.id;

      const project = await getProjectById(id, userId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      await gitService.pushToRemote(project.path, branch, remote, fastify.log);
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/projects/:id/git/fetch - Fetch from remote
  fastify.post<{
    Params: z.infer<typeof gitSchemas.gitProjectParamsSchema>;
    Body: z.infer<typeof gitSchemas.gitFetchBodySchema>;
  }>(
    '/api/projects/:id/git/fetch',
    {
      schema: {
        params: gitSchemas.gitProjectParamsSchema,
        body: gitSchemas.gitFetchBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;
      const { remote } = request.body;
      const userId = request.user!.id;

      const project = await getProjectById(id, userId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      await gitService.fetchFromRemote(project.path, remote, fastify.log);
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // GET /api/projects/:id/git/diff - Get file diff
  fastify.get<{
    Params: z.infer<typeof gitSchemas.gitProjectParamsSchema>;
    Querystring: z.infer<typeof gitSchemas.gitFilePathQuerySchema>;
  }>(
    '/api/projects/:id/git/diff',
    {
      schema: {
        params: gitSchemas.gitProjectParamsSchema,
        querystring: gitSchemas.gitFilePathQuerySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;
      const { path } = request.query;
      const userId = request.user!.id;

      const project = await getProjectById(id, userId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const diff = await gitService.getFileDiff(project.path, path, fastify.log);
      return reply.send(buildSuccessResponse({ diff }));
    }
  );

  // GET /api/projects/:id/git/history - Get commit history
  fastify.get<{
    Params: z.infer<typeof gitSchemas.gitProjectParamsSchema>;
    Querystring: z.infer<typeof gitSchemas.gitHistoryQuerySchema>;
  }>(
    '/api/projects/:id/git/history',
    {
      schema: {
        params: gitSchemas.gitProjectParamsSchema,
        querystring: gitSchemas.gitHistoryQuerySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;
      const { limit, offset } = request.query;
      const userId = request.user!.id;

      const project = await getProjectById(id, userId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const commits = await gitService.getCommitHistory(project.path, limit, offset, fastify.log);
      return reply.send(buildSuccessResponse(commits));
    }
  );

  // GET /api/projects/:id/git/commit/:hash - Get commit diff
  fastify.get<{
    Params: z.infer<typeof gitSchemas.gitCommitParamsSchema>;
  }>(
    '/api/projects/:id/git/commit/:hash',
    {
      schema: {
        params: gitSchemas.gitCommitParamsSchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id, hash } = request.params;
      const userId = request.user!.id;

      const project = await getProjectById(id, userId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const commitDiff = await gitService.getCommitDiff(project.path, hash, fastify.log);
      return reply.send(buildSuccessResponse(commitDiff));
    }
  );

  // GET /api/projects/:id/git/pr-data - Get PR pre-fill data
  fastify.get<{
    Params: z.infer<typeof gitSchemas.gitProjectParamsSchema>;
    Querystring: z.infer<typeof gitSchemas.gitPrDataQuerySchema>;
  }>(
    '/api/projects/:id/git/pr-data',
    {
      schema: {
        params: gitSchemas.gitProjectParamsSchema,
        querystring: gitSchemas.gitPrDataQuerySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;
      const { base } = request.query;
      const userId = request.user!.id;

      const project = await getProjectById(id, userId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const commits = await gitService.getCommitsSinceBase(project.path, base, fastify.log);

      // Construct PR title from most recent commit
      const title = commits.length > 0 ? commits[0].message : 'New Pull Request';

      // Construct description from all commits
      const description = commits
        .map((commit, index) => `${index + 1}. ${commit.message} (${commit.shortHash})`)
        .join('\n');

      return reply.send(buildSuccessResponse({ title, description, commits }));
    }
  );

  // POST /api/projects/:id/git/pr - Create pull request
  fastify.post<{
    Params: z.infer<typeof gitSchemas.gitProjectParamsSchema>;
    Body: z.infer<typeof gitSchemas.gitCreatePrBodySchema>;
  }>(
    '/api/projects/:id/git/pr',
    {
      schema: {
        params: gitSchemas.gitProjectParamsSchema,
        body: gitSchemas.gitCreatePrBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;
      const { title, description, baseBranch } = request.body;
      const userId = request.user!.id;

      const project = await getProjectById(id, userId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const prResult = await gitService.createPullRequest(
        project.path,
        title,
        description,
        baseBranch,
        fastify.log
      );

      return reply.send(buildSuccessResponse(prResult));
    }
  );

  // POST /api/projects/:id/git/generate-commit-message - Generate AI commit message
  fastify.post<{
    Params: z.infer<typeof gitSchemas.gitProjectParamsSchema>;
    Body: z.infer<typeof gitSchemas.gitGenerateCommitMessageBodySchema>;
  }>(
    '/api/projects/:id/git/generate-commit-message',
    {
      schema: {
        params: gitSchemas.gitProjectParamsSchema,
        body: gitSchemas.gitGenerateCommitMessageBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;
      const { files } = request.body;
      const userId = request.user!.id;

      const project = await getProjectById(id, userId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const message = await gitService.generateCommitMessage(
        project.path,
        files,
        fastify.log
      );

      return reply.send(buildSuccessResponse({ message }));
    }
  );
}
