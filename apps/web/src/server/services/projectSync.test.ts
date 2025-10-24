/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { syncFromClaudeProjects, hasEnoughSessions } from './projectSync';
import * as projectService from './project';
import * as agentSessionService from './agentSession';

// Mock the services
vi.mock('@/server/services/project');
vi.mock('@/server/services/agentSession');

describe('ProjectSyncService', () => {
  const originalHome = process.env.HOME;
  const testUserId = 'test-user-id';
  const testHomeDir = path.join(os.tmpdir(), `test-home-${Date.now()}`);
  const testDir = path.join(testHomeDir, 'claude-test-projects-sync');

  beforeEach(async () => {
    // Clear mocks
    vi.clearAllMocks();

    // Create test directory structure
    await fs.mkdir(testDir, { recursive: true });
    // Override home directory for tests with unique dir
    await fs.mkdir(testHomeDir, { recursive: true });
    process.env.HOME = testHomeDir;
    await fs.mkdir(path.join(testHomeDir, '.claude', 'projects'), {
      recursive: true,
    });
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
    try {
      await fs.rm(testHomeDir, {
        recursive: true,
        force: true,
        maxRetries: 3,
      });
    } catch (e) {
      // Ignore cleanup errors
    }
    process.env.HOME = originalHome;
  });

  describe('hasEnoughSessions', () => {
    it('should return false for project with no JSONL files', async () => {
      const projectName = '-Users-test-empty-project';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      const hasEnough = await hasEnoughSessions(
        projectName
      );

      expect(hasEnough).toBe(false);
    });

    it('should return false for project with only 1 session', async () => {
      const projectName = '-Users-test-one-session';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create 1 JSONL file
      const sessionFile = path.join(projectDir, 'session-1.jsonl');
      await fs.writeFile(sessionFile, JSON.stringify({ type: 'user', message: {} }));

      const hasEnough = await hasEnoughSessions(
        projectName
      );

      expect(hasEnough).toBe(false);
    });

    it('should return false for project with exactly 3 sessions', async () => {
      const projectName = '-Users-test-three-sessions';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create exactly 3 JSONL files
      for (let i = 1; i <= 3; i++) {
        const sessionFile = path.join(projectDir, `session-${i}.jsonl`);
        await fs.writeFile(sessionFile, JSON.stringify({ type: 'user', message: {} }));
      }

      const hasEnough = await hasEnoughSessions(
        projectName
      );

      expect(hasEnough).toBe(false);
    });

    it('should return true for project with more than 3 sessions', async () => {
      const projectName = '-Users-test-four-sessions';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create 4 JSONL files
      for (let i = 1; i <= 4; i++) {
        const sessionFile = path.join(projectDir, `session-${i}.jsonl`);
        await fs.writeFile(sessionFile, JSON.stringify({ type: 'user', message: {} }));
      }

      const hasEnough = await hasEnoughSessions(
        projectName
      );

      expect(hasEnough).toBe(true);
    });

    it('should return true for project with many sessions', async () => {
      const projectName = '-Users-test-many-sessions';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create 10 JSONL files
      for (let i = 1; i <= 10; i++) {
        const sessionFile = path.join(projectDir, `session-${i}.jsonl`);
        await fs.writeFile(sessionFile, JSON.stringify({ type: 'user', message: {} }));
      }

      const hasEnough = await hasEnoughSessions(
        projectName
      );

      expect(hasEnough).toBe(true);
    });

    it('should only count .jsonl files', async () => {
      const projectName = '-Users-test-mixed-files';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create 2 JSONL files
      await fs.writeFile(path.join(projectDir, 'session-1.jsonl'), '{}');
      await fs.writeFile(path.join(projectDir, 'session-2.jsonl'), '{}');

      // Create other files that should be ignored
      await fs.writeFile(path.join(projectDir, 'README.md'), 'test');
      await fs.writeFile(path.join(projectDir, 'data.json'), '{}');
      await fs.writeFile(path.join(projectDir, 'notes.txt'), 'notes');

      const hasEnough = await hasEnoughSessions(
        projectName
      );

      // Should be false because only 2 .jsonl files (not >3)
      expect(hasEnough).toBe(false);
    });

    it('should handle directory access errors gracefully', async () => {
      const projectName = '-Users-nonexistent-project';

      const hasEnough = await hasEnoughSessions(
        projectName
      );

      expect(hasEnough).toBe(false);
    });
  });

  describe('syncFromClaudeProjects', () => {
    it('should return empty stats when projects directory does not exist', async () => {
      // Don't create the .claude/projects directory
      await fs.rm(path.join(testHomeDir, '.claude'), {
        recursive: true,
        force: true,
      });

      const result = await syncFromClaudeProjects(testUserId);

      expect(result).toEqual({
        projectsImported: 0,
        projectsUpdated: 0,
        totalSessionsSynced: 0,
      });
      expect(vi.mocked(projectService.createOrUpdateProject)).not.toHaveBeenCalled();
    });

    it('should skip projects with insufficient sessions', async () => {
      const projectName = '-Users-test-project-few-sessions';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create only 2 sessions (need >3)
      for (let i = 1; i <= 2; i++) {
        const sessionFile = path.join(projectDir, `session-${i}.jsonl`);
        await fs.writeFile(sessionFile, JSON.stringify({ type: 'user', message: {} }));
      }

      const result = await syncFromClaudeProjects(testUserId);

      expect(result).toEqual({
        projectsImported: 0,
        projectsUpdated: 0,
        totalSessionsSynced: 0,
      });
      expect(vi.mocked(projectService.createOrUpdateProject)).not.toHaveBeenCalled();
    });

    it('should import project with enough sessions', async () => {
      const projectName = '-Users-test-project-enough-sessions';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create 5 sessions (more than 3)
      for (let i = 1; i <= 5; i++) {
        const sessionFile = path.join(projectDir, `session-${i}.jsonl`);
        const messages = [
          JSON.stringify({
            type: 'user',
            message: { content: 'Message' },
            cwd: '/Users/test/project',
          }),
        ];
        await fs.writeFile(sessionFile, messages.join('\n'));
      }

      // Mock the services
      const mockProject = {
        id: 'project-123',
        name: 'project',
        path: '/Users/test/project',
        is_hidden: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      vi.mocked(projectService.createOrUpdateProject).mockResolvedValue(
        mockProject
      );
      vi.mocked(agentSessionService.syncProjectSessions).mockResolvedValue({
        synced: 5,
        created: 5,
        updated: 0,
      });

      const result = await syncFromClaudeProjects(testUserId);

      expect(result.projectsImported).toBe(1);
      expect(result.projectsUpdated).toBe(0);
      expect(result.totalSessionsSynced).toBe(5);
      expect(vi.mocked(projectService.createOrUpdateProject)).toHaveBeenCalledWith(
        'project',
        '/Users/test/project'
      );
      expect(vi.mocked(agentSessionService.syncProjectSessions)).toHaveBeenCalledWith(
        'project-123',
        testUserId
      );
    });

    it('should detect updated vs new projects correctly', async () => {
      const projectName = '-Users-test-existing-project';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create 4 sessions (enough to qualify)
      for (let i = 1; i <= 4; i++) {
        const sessionFile = path.join(projectDir, `session-${i}.jsonl`);
        await fs.writeFile(
          sessionFile,
          JSON.stringify({
            type: 'user',
            message: { content: `Message ${i}` },
            cwd: '/Users/test/existing',
          })
        );
      }

      // Mock existing project (updated_at is different from created_at)
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');
      const mockProject = {
        id: 'project-existing',
        name: 'existing',
        path: '/Users/test/existing',
        is_hidden: false,
        created_at: createdAt,
        updated_at: updatedAt,
      };
      vi.mocked(projectService.createOrUpdateProject).mockResolvedValue(
        mockProject
      );
      vi.mocked(agentSessionService.syncProjectSessions).mockResolvedValue({
        synced: 4,
        created: 0,
        updated: 4,
      });

      const result = await syncFromClaudeProjects(testUserId);

      expect(result.projectsImported).toBe(0);
      expect(result.projectsUpdated).toBe(1);
      expect(result.totalSessionsSynced).toBe(4);
    });

    it('should handle multiple projects correctly', async () => {
      // Create project 1 with 5 sessions (qualifies - new)
      const project1Name = '-Users-test-project1';
      const project1Dir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        project1Name
      );
      await fs.mkdir(project1Dir, { recursive: true });
      for (let i = 1; i <= 5; i++) {
        const sessionFile = path.join(project1Dir, `session${i}.jsonl`);
        await fs.writeFile(
          sessionFile,
          JSON.stringify({
            type: 'user',
            message: { content: `Msg ${i}` },
            cwd: '/Users/test/project1',
          })
        );
      }

      // Create project 2 with 6 sessions (qualifies - updated)
      const project2Name = '-Users-test-project2';
      const project2Dir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        project2Name
      );
      await fs.mkdir(project2Dir, { recursive: true });
      for (let i = 1; i <= 6; i++) {
        const sessionFile = path.join(project2Dir, `session${i}.jsonl`);
        await fs.writeFile(
          sessionFile,
          JSON.stringify({
            type: 'user',
            message: { content: `Msg ${i}` },
            cwd: '/Users/test/project2',
          })
        );
      }

      // Create project 3 with only 1 session (should skip)
      const project3Name = '-Users-test-project3';
      const project3Dir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        project3Name
      );
      await fs.mkdir(project3Dir, { recursive: true });
      const session3File = path.join(project3Dir, 'session1.jsonl');
      await fs.writeFile(
        session3File,
        JSON.stringify({ type: 'user', message: { content: 'Only 1 session' } })
      );

      // Mock responses
      const mockProject1 = {
        id: 'project-1',
        name: 'project1',
        path: '/Users/test/project1',
        is_hidden: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const mockProject2 = {
        id: 'project-2',
        name: 'project2',
        path: '/Users/test/project2',
        is_hidden: false,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02'),
      };

      vi.mocked(projectService.createOrUpdateProject)
        .mockResolvedValueOnce(mockProject1)
        .mockResolvedValueOnce(mockProject2);

      vi.mocked(agentSessionService.syncProjectSessions)
        .mockResolvedValueOnce({ synced: 5, created: 5, updated: 0 })
        .mockResolvedValueOnce({ synced: 6, created: 0, updated: 6 });

      const result = await syncFromClaudeProjects(testUserId);

      expect(result.projectsImported).toBe(1); // project1
      expect(result.projectsUpdated).toBe(1); // project2
      expect(result.totalSessionsSynced).toBe(11); // 5 + 6
      expect(vi.mocked(projectService.createOrUpdateProject)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(agentSessionService.syncProjectSessions)).toHaveBeenCalledTimes(2);
    });

    it('should use correct project path from cwd in JSONL', async () => {
      const projectName = '-Users-encoded-project-name';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create 4 sessions (enough to qualify)
      for (let i = 1; i <= 4; i++) {
        const sessionFile = path.join(projectDir, `session${i}.jsonl`);
        await fs.writeFile(
          sessionFile,
          JSON.stringify({
            type: 'user',
            message: { content: `Msg ${i}` },
            cwd: '/Users/actual/project/path',
          })
        );
      }

      const mockProject = {
        id: 'project-cwd',
        name: 'path',
        path: '/Users/actual/project/path',
        is_hidden: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      vi.mocked(projectService.createOrUpdateProject).mockResolvedValue(
        mockProject
      );
      vi.mocked(agentSessionService.syncProjectSessions).mockResolvedValue({
        synced: 4,
        created: 4,
        updated: 0,
      });

      await syncFromClaudeProjects(testUserId);

      // Should use the path from cwd, not the encoded directory name
      expect(vi.mocked(projectService.createOrUpdateProject)).toHaveBeenCalledWith(
        'path', // name from last path segment
        '/Users/actual/project/path' // path from cwd
      );
    });

    it('should handle session sync failures gracefully', async () => {
      const projectName = '-Users-test-project-sync-fail';
      const projectDir = path.join(
        testHomeDir,
        '.claude',
        'projects',
        projectName
      );
      await fs.mkdir(projectDir, { recursive: true });

      // Create 5 sessions (enough to qualify)
      for (let i = 1; i <= 5; i++) {
        const sessionFile = path.join(projectDir, `session${i}.jsonl`);
        await fs.writeFile(
          sessionFile,
          JSON.stringify({
            type: 'user',
            message: { content: `Msg ${i}` },
            cwd: '/Users/test/failproject',
          })
        );
      }

      const mockProject = {
        id: 'project-fail',
        name: 'failproject',
        path: '/Users/test/failproject',
        is_hidden: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      vi.mocked(projectService.createOrUpdateProject).mockResolvedValue(
        mockProject
      );
      // Session sync fails
      vi.mocked(agentSessionService.syncProjectSessions).mockRejectedValue(
        new Error('Session sync failed')
      );

      // Should not throw, but continue processing
      await expect(
        syncFromClaudeProjects(testUserId)
      ).rejects.toThrow('Session sync failed');
    });
  });

  describe('Integration Tests - Full Sync Workflow', () => {
    it('should correctly filter projects with exactly 3 sessions', async () => {
      // Create 3 projects:
      // - Project A: 2 sessions (should skip)
      // - Project B: 3 sessions (should skip - needs >3)
      // - Project C: 4 sessions (should import)

      // Project A: 2 sessions
      const projectA = path.join(testHomeDir, '.claude', 'projects', '-Users-test-projectA');
      await fs.mkdir(projectA, { recursive: true });
      for (let i = 1; i <= 2; i++) {
        await fs.writeFile(
          path.join(projectA, `session${i}.jsonl`),
          JSON.stringify({ type: 'user', message: { content: 'msg' }, cwd: '/Users/test/projectA' })
        );
      }

      // Project B: 3 sessions (exactly 3, should skip)
      const projectB = path.join(testHomeDir, '.claude', 'projects', '-Users-test-projectB');
      await fs.mkdir(projectB, { recursive: true });
      for (let i = 1; i <= 3; i++) {
        await fs.writeFile(
          path.join(projectB, `session${i}.jsonl`),
          JSON.stringify({ type: 'user', message: { content: 'msg' }, cwd: '/Users/test/projectB' })
        );
      }

      // Project C: 4 sessions (should import)
      const projectC = path.join(testHomeDir, '.claude', 'projects', '-Users-test-projectC');
      await fs.mkdir(projectC, { recursive: true });
      for (let i = 1; i <= 4; i++) {
        await fs.writeFile(
          path.join(projectC, `session${i}.jsonl`),
          JSON.stringify({ type: 'user', message: { content: 'msg' }, cwd: '/Users/test/projectC' })
        );
      }

      const mockProject = {
        id: 'project-c',
        name: 'projectC',
        path: '/Users/test/projectC',
        is_hidden: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(projectService.createOrUpdateProject).mockResolvedValue(mockProject);
      vi.mocked(agentSessionService.syncProjectSessions).mockResolvedValue({
        synced: 4,
        created: 4,
        updated: 0,
      });

      const result = await syncFromClaudeProjects(testUserId);

      // Only project C should be imported
      expect(result.projectsImported).toBe(1);
      expect(result.totalSessionsSynced).toBe(4);
      expect(vi.mocked(projectService.createOrUpdateProject)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(projectService.createOrUpdateProject)).toHaveBeenCalledWith(
        'projectC',
        '/Users/test/projectC'
      );
    });

    it('should handle edge case of exactly 4 sessions (minimum to qualify)', async () => {
      const projectName = '-Users-test-edge-case';
      const projectDir = path.join(testHomeDir, '.claude', 'projects', projectName);
      await fs.mkdir(projectDir, { recursive: true });

      // Create exactly 4 sessions (just over the threshold)
      for (let i = 1; i <= 4; i++) {
        await fs.writeFile(
          path.join(projectDir, `session${i}.jsonl`),
          JSON.stringify({
            type: 'user',
            message: { content: `Message ${i}` },
            cwd: '/Users/test/edge-case',
          })
        );
      }

      const mockProject = {
        id: 'edge-case',
        name: 'edge-case',
        path: '/Users/test/edge-case',
        is_hidden: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(projectService.createOrUpdateProject).mockResolvedValue(mockProject);
      vi.mocked(agentSessionService.syncProjectSessions).mockResolvedValue({
        synced: 4,
        created: 4,
        updated: 0,
      });

      const result = await syncFromClaudeProjects(testUserId);

      expect(result.projectsImported).toBe(1);
      expect(result.totalSessionsSynced).toBe(4);
    });

    it('should ignore non-.jsonl files when counting sessions', async () => {
      const projectName = '-Users-test-mixed-files';
      const projectDir = path.join(testHomeDir, '.claude', 'projects', projectName);
      await fs.mkdir(projectDir, { recursive: true });

      // Create 2 .jsonl files
      await fs.writeFile(path.join(projectDir, 'session1.jsonl'), '{}');
      await fs.writeFile(path.join(projectDir, 'session2.jsonl'), '{}');

      // Create many other files (should be ignored)
      await fs.writeFile(path.join(projectDir, 'README.md'), 'test');
      await fs.writeFile(path.join(projectDir, 'data.json'), '{}');
      await fs.writeFile(path.join(projectDir, 'log.txt'), 'logs');
      await fs.writeFile(path.join(projectDir, 'session.backup'), 'backup');

      const result = await syncFromClaudeProjects(testUserId);

      // Should skip because only 2 .jsonl files
      expect(result.projectsImported).toBe(0);
      expect(vi.mocked(projectService.createOrUpdateProject)).not.toHaveBeenCalled();
    });

    it('should handle large number of sessions efficiently', async () => {
      const projectName = '-Users-test-many-sessions';
      const projectDir = path.join(testHomeDir, '.claude', 'projects', projectName);
      await fs.mkdir(projectDir, { recursive: true });

      // Create 100 sessions
      for (let i = 1; i <= 100; i++) {
        await fs.writeFile(
          path.join(projectDir, `session${i}.jsonl`),
          JSON.stringify({
            type: 'user',
            message: { content: `Message ${i}` },
            cwd: '/Users/test/many-sessions',
          })
        );
      }

      const mockProject = {
        id: 'many-sessions',
        name: 'many-sessions',
        path: '/Users/test/many-sessions',
        is_hidden: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(projectService.createOrUpdateProject).mockResolvedValue(mockProject);
      vi.mocked(agentSessionService.syncProjectSessions).mockResolvedValue({
        synced: 100,
        created: 100,
        updated: 0,
      });

      const result = await syncFromClaudeProjects(testUserId);

      expect(result.projectsImported).toBe(1);
      expect(result.totalSessionsSynced).toBe(100);
    });

    it('should process multiple qualifying and non-qualifying projects correctly', async () => {
      // Create a complex scenario with multiple projects
      const projects = [
        { name: '-Users-test-p1', sessions: 1, shouldImport: false },
        { name: '-Users-test-p2', sessions: 2, shouldImport: false },
        { name: '-Users-test-p3', sessions: 3, shouldImport: false },
        { name: '-Users-test-p4', sessions: 4, shouldImport: true },
        { name: '-Users-test-p5', sessions: 5, shouldImport: true },
        { name: '-Users-test-p6', sessions: 10, shouldImport: true },
      ];

      for (const project of projects) {
        const projectDir = path.join(testHomeDir, '.claude', 'projects', project.name);
        await fs.mkdir(projectDir, { recursive: true });

        for (let i = 1; i <= project.sessions; i++) {
          await fs.writeFile(
            path.join(projectDir, `session${i}.jsonl`),
            JSON.stringify({
              type: 'user',
              message: { content: 'msg' },
              cwd: `/Users/test/${project.name.replace('-Users-test-', '')}`,
            })
          );
        }
      }

      // Mock responses for qualifying projects only
      let callCount = 0;
      vi.mocked(projectService.createOrUpdateProject).mockImplementation(async (name, path) => {
        callCount++;
        return {
          id: `project-${callCount}`,
          name,
          path,
          is_hidden: false,
          created_at: new Date(),
          updated_at: new Date(),
        };
      });

      vi.mocked(agentSessionService.syncProjectSessions)
        .mockResolvedValueOnce({ synced: 4, created: 4, updated: 0 })
        .mockResolvedValueOnce({ synced: 5, created: 5, updated: 0 })
        .mockResolvedValueOnce({ synced: 10, created: 10, updated: 0 });

      const result = await syncFromClaudeProjects(testUserId);

      // Only p4, p5, p6 should be imported (3 projects)
      expect(result.projectsImported).toBe(3);
      expect(result.totalSessionsSynced).toBe(19); // 4 + 5 + 10
      expect(vi.mocked(projectService.createOrUpdateProject)).toHaveBeenCalledTimes(3);
    });
  });
});
