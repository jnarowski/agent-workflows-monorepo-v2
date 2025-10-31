import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildSuccessResponse } from '@/server/utils/response';
import * as gitService from '@/server/domain/git/services';
import * as gitSchemas from '@/server/schemas/git';

export async function gitRoutes(fastify: FastifyInstance) {
  // POST /api/git/status - Get git status
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitStatusBodySchema>;
  }>(
    '/api/git/status',
    {
      schema: {
        body: gitSchemas.gitStatusBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path } = request.body;

      const status = await gitService.getGitStatus(path);
      return reply.send(buildSuccessResponse(status));
    }
  );

  // POST /api/git/branches - Get all branches
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitBranchesBodySchema>;
  }>(
    '/api/git/branches',
    {
      schema: {
        body: gitSchemas.gitBranchesBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path } = request.body;

      const branches = await gitService.getBranches(path);
      return reply.send(buildSuccessResponse(branches));
    }
  );

  // POST /api/git/branch - Create and switch to new branch
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitBranchBodySchema>;
  }>(
    '/api/git/branch',
    {
      schema: {
        body: gitSchemas.gitBranchBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, name, from } = request.body;

      const branch = await gitService.createAndSwitchBranch(path, name, from);
      return reply.code(201).send(buildSuccessResponse(branch));
    }
  );

  // POST /api/git/branch/switch - Switch to existing branch
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitSwitchBranchBodySchema>;
  }>(
    '/api/git/branch/switch',
    {
      schema: {
        body: gitSchemas.gitSwitchBranchBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, name } = request.body;

      const branch = await gitService.switchBranch(path, name);
      return reply.send(buildSuccessResponse(branch));
    }
  );

  // POST /api/git/stage - Stage files
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitStageFilesBodySchema>;
  }>(
    '/api/git/stage',
    {
      schema: {
        body: gitSchemas.gitStageFilesBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, files } = request.body;

      await gitService.stageFiles(path, files);
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/unstage - Unstage files
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitStageFilesBodySchema>;
  }>(
    '/api/git/unstage',
    {
      schema: {
        body: gitSchemas.gitStageFilesBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, files } = request.body;

      await gitService.unstageFiles(path, files);
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/commit - Commit changes
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitCommitBodySchema>;
  }>(
    '/api/git/commit',
    {
      schema: {
        body: gitSchemas.gitCommitBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, message, files } = request.body;

      const hash = await gitService.commitChanges(path, message, files);
      return reply.code(201).send(buildSuccessResponse({ hash }));
    }
  );

  // POST /api/git/push - Push to remote
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitPushBodySchema>;
  }>(
    '/api/git/push',
    {
      schema: {
        body: gitSchemas.gitPushBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, branch, remote } = request.body;

      await gitService.pushToRemote(path, branch, remote);
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/fetch - Fetch from remote
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitFetchBodySchema>;
  }>(
    '/api/git/fetch',
    {
      schema: {
        body: gitSchemas.gitFetchBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, remote } = request.body;

      await gitService.fetchFromRemote(path, remote);
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/pull - Pull from remote
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitPullBodySchema>;
  }>(
    '/api/git/pull',
    {
      schema: {
        body: gitSchemas.gitPullBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, remote, branch } = request.body;

      await gitService.pullFromRemote(path, remote, branch);
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/diff - Get file diff
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitDiffBodySchema>;
  }>(
    '/api/git/diff',
    {
      schema: {
        body: gitSchemas.gitDiffBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, filepath } = request.body;

      const diff = await gitService.getFileDiff(path, filepath);
      return reply.send(buildSuccessResponse({ diff }));
    }
  );

  // POST /api/git/history - Get commit history
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitHistoryBodySchema>;
  }>(
    '/api/git/history',
    {
      schema: {
        body: gitSchemas.gitHistoryBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, limit, offset } = request.body;

      const commits = await gitService.getCommitHistory(path, limit, offset);
      return reply.send(buildSuccessResponse(commits));
    }
  );

  // POST /api/git/commit-diff - Get commit diff
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitCommitDiffBodySchema>;
  }>(
    '/api/git/commit-diff',
    {
      schema: {
        body: gitSchemas.gitCommitDiffBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, commitHash } = request.body;

      const commitDiff = await gitService.getCommitDiff(path, commitHash);
      return reply.send(buildSuccessResponse(commitDiff));
    }
  );

  // POST /api/git/pr-data - Get PR pre-fill data
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitPrDataBodySchema>;
  }>(
    '/api/git/pr-data',
    {
      schema: {
        body: gitSchemas.gitPrDataBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, baseBranch } = request.body;

      const commits = await gitService.getCommitsSinceBase(path, baseBranch);

      // Construct PR title from most recent commit
      const title = commits.length > 0 ? commits[0].message : 'New Pull Request';

      // Construct description from all commits
      const description = commits
        .map((commit, index) => `${index + 1}. ${commit.message} (${commit.shortHash})`)
        .join('\n');

      return reply.send(buildSuccessResponse({ title, description, commits }));
    }
  );

  // POST /api/git/pr - Create pull request
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitCreatePrBodySchema>;
  }>(
    '/api/git/pr',
    {
      schema: {
        body: gitSchemas.gitCreatePrBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, title, description, baseBranch } = request.body;

      const prResult = await gitService.createPullRequest(
        path,
        title,
        description,
        baseBranch
      );

      return reply.send(buildSuccessResponse(prResult));
    }
  );

  // POST /api/git/generate-commit-message - Generate AI commit message
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitGenerateCommitMessageBodySchema>;
  }>(
    '/api/git/generate-commit-message',
    {
      schema: {
        body: gitSchemas.gitGenerateCommitMessageBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, files } = request.body;

      const message = await gitService.generateCommitMessage(path, files);

      return reply.send(buildSuccessResponse({ message }));
    }
  );

  // POST /api/git/merge - Merge branches
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitMergeBodySchema>;
  }>(
    '/api/git/merge',
    {
      schema: {
        body: gitSchemas.gitMergeBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, sourceBranch, noFf } = request.body;

      const result = await gitService.mergeBranch(path, sourceBranch, { noFf });
      return reply.send(buildSuccessResponse(result));
    }
  );

  // POST /api/git/stash/save - Save stash
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitStashSaveBodySchema>;
  }>(
    '/api/git/stash/save',
    {
      schema: {
        body: gitSchemas.gitStashSaveBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, message } = request.body;

      await gitService.stashSave(path, message);
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/stash/pop - Pop stash
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitStashPopBodySchema>;
  }>(
    '/api/git/stash/pop',
    {
      schema: {
        body: gitSchemas.gitStashPopBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, index } = request.body;

      await gitService.stashPop(path, index);
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/stash/list - List stashes
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitStashListBodySchema>;
  }>(
    '/api/git/stash/list',
    {
      schema: {
        body: gitSchemas.gitStashListBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path } = request.body;

      const stashes = await gitService.stashList(path);
      return reply.send(buildSuccessResponse(stashes));
    }
  );

  // POST /api/git/stash/apply - Apply stash
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitStashApplyBodySchema>;
  }>(
    '/api/git/stash/apply',
    {
      schema: {
        body: gitSchemas.gitStashApplyBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, index } = request.body;

      await gitService.stashApply(path, index);
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/reset - Reset to commit
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitResetBodySchema>;
  }>(
    '/api/git/reset',
    {
      schema: {
        body: gitSchemas.gitResetBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, commitHash, mode } = request.body;

      await gitService.resetToCommit(path, commitHash, mode);
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );

  // POST /api/git/discard - Discard changes
  fastify.post<{
    Body: z.infer<typeof gitSchemas.gitDiscardBodySchema>;
  }>(
    '/api/git/discard',
    {
      schema: {
        body: gitSchemas.gitDiscardBodySchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { path, files } = request.body;

      await gitService.discardChanges(path, files);
      return reply.send(buildSuccessResponse({ success: true }));
    }
  );
}
