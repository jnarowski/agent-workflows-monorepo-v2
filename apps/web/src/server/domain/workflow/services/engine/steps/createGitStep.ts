import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "../../../types/engine.types";
import type { GitStepConfig, GitStepResult } from "@repo/workflow-sdk";
import type { GitStepOptions } from "../../../types/event.types";
import { commitChanges } from "@/server/domain/git/services/commitChanges";
import { createAndSwitchBranch } from "@/server/domain/git/services/createAndSwitchBranch";
import { createPullRequest } from "@/server/domain/git/services/createPullRequest";

const DEFAULT_GIT_TIMEOUT = 120000; // 2 minutes

/**
 * Create git step factory function
 * Executes git operations (commit, branch, pr)
 */
export function createGitStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function git(
    id: string,
    config: GitStepConfig,
    options?: GitStepOptions
  ): Promise<GitStepResult> {
    const timeout = options?.timeout ?? DEFAULT_GIT_TIMEOUT;

    // Generate phase-prefixed Inngest step ID
    const inngestStepId = context.currentPhase
      ? `${context.currentPhase}-${id}`
      : id;

    return await inngestStep.run(inngestStepId, async () => {
      const { projectPath } = context;

      const operation = await Promise.race([
        executeGitOperation(projectPath, config),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(new Error(`Git operation timed out after ${timeout}ms`)),
            timeout
          )
        ),
      ]);

      return operation;
    });
  };
}

async function executeGitOperation(
  projectPath: string,
  config: GitStepConfig
): Promise<GitStepResult> {
  switch (config.operation) {
    case "commit": {
      if (!config.message) {
        throw new Error("Commit message is required for commit operation");
      }
      // commitChanges expects (projectPath, message, files[])
      // files defaults to ['.'] to stage all changes
      const commitSha = await commitChanges(projectPath, config.message, ["."]);
      return {
        operation: "commit",
        commitSha,
        success: true,
      };
    }

    case "branch": {
      if (!config.branch) {
        throw new Error("Branch name is required for branch operation");
      }
      // createAndSwitchBranch expects (projectPath, branchName, from?)
      await createAndSwitchBranch(
        projectPath,
        config.branch,
        config.baseBranch
      );
      return {
        operation: "branch",
        branch: config.branch,
        success: true,
      };
    }

    case "pr": {
      if (!config.title) {
        throw new Error("PR title is required for pr operation");
      }
      // createPullRequest expects (projectPath, title, description, baseBranch)
      const result = await createPullRequest(
        projectPath,
        config.title,
        config.body ?? "",
        config.baseBranch ?? "main"
      );
      return {
        operation: "pr",
        prUrl: result.prUrl,
        success: result.success,
      };
    }

    default:
      throw new Error(`Unknown git operation: ${config.operation}`);
  }
}
