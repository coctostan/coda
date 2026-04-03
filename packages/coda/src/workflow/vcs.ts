/**
 * @module workflow/vcs
 * Version control operations for the CODA lifecycle.
 *
 * Centralizes all git operations: branch creation on issue activation,
 * per-task commits during BUILD. All operations are best-effort —
 * VCS failures never break CODA tool operations.
 *
 * Per spec v7: feature branch per issue, commit per BUILD task,
 * branch ready for PR on DONE.
 */

import { execSync } from 'node:child_process';

/** Result of a branch creation attempt. */
export interface CreateBranchResult {
  /** The full branch name (e.g., "feat/my-issue"). */
  branch: string;
  /** Whether a new branch was created (false if already on it). */
  created: boolean;
}

/** Result of a task commit attempt. */
export interface CommitTaskResult {
  /** Whether a commit was actually created. */
  committed: boolean;
  /** The commit message used, or reason for no-op. */
  message: string;
}

/**
 * Get the branch prefix based on issue type.
 *
 * @param issueType - The issue type (feature, bugfix, refactor, chore, docs)
 * @returns "fix" for bugfix, "feat" for everything else
 */
function branchPrefix(issueType: string): string {
  return issueType === 'bugfix' ? 'fix' : 'feat';
}

/**
 * Create a feature branch for an issue.
 *
 * If the target branch already exists and is checked out, returns a no-op result.
 * If the branch exists but is not checked out, switches to it.
 * Otherwise creates and checks out a new branch.
 *
 * @param projectRoot - Absolute path to the project root
 * @param issueSlug - The issue slug (used in branch name)
 * @param issueType - The issue type (determines feat/ vs fix/ prefix)
 * @returns CreateBranchResult with branch name and whether it was created
 */
export function createBranch(
  projectRoot: string,
  issueSlug: string,
  issueType: string
): CreateBranchResult {
  const prefix = branchPrefix(issueType);
  const branch = `${prefix}/${issueSlug}`;

  const currentBranch = getCurrentBranch(projectRoot);

  if (currentBranch === branch) {
    return { branch, created: false };
  }

  // Check if branch already exists locally
  const branchExists = localBranchExists(projectRoot, branch);

  if (branchExists) {
    execSync(`git checkout ${branch}`, { cwd: projectRoot, stdio: 'pipe' });
    return { branch, created: false };
  }

  execSync(`git checkout -b ${branch}`, { cwd: projectRoot, stdio: 'pipe' });
  return { branch, created: true };
}

/**
 * Commit all changes for a completed BUILD task.
 *
 * Stages all changes (`git add .`) and commits with a standardized message.
 * No-ops gracefully if the working tree is clean (nothing to commit).
 *
 * @param projectRoot - Absolute path to the project root
 * @param taskId - The completed task number
 * @param taskTitle - The task title for the commit message
 * @returns CommitTaskResult with committed flag and message
 */
export function commitTask(
  projectRoot: string,
  taskId: number,
  taskTitle: string
): CommitTaskResult {
  const message = `task ${String(taskId)}: ${taskTitle}`;

  // Stage all changes
  execSync('git add .', { cwd: projectRoot, stdio: 'pipe' });

  // Check if there's anything to commit
  const status = execSync('git diff --cached --name-only', {
    cwd: projectRoot,
    encoding: 'utf-8',
  }).trim();

  if (status.length === 0) {
    return { committed: false, message: 'nothing to commit' };
  }

  execSync(`git commit -m ${JSON.stringify(message)}`, {
    cwd: projectRoot,
    stdio: 'pipe',
  });

  return { committed: true, message };
}

/**
 * Get the current git branch name.
 *
 * @param projectRoot - Absolute path to the project root
 * @returns The current branch name
 */
export function getCurrentBranch(projectRoot: string): string {
  return execSync('git rev-parse --abbrev-ref HEAD', {
    cwd: projectRoot,
    encoding: 'utf-8',
  }).trim();
}

/**
 * Check if a local branch exists.
 *
 * @param projectRoot - Absolute path to the project root
 * @param branch - Branch name to check
 * @returns true if the branch exists locally
 */
function localBranchExists(projectRoot: string, branch: string): boolean {
  try {
    execSync(`git rev-parse --verify ${branch}`, {
      cwd: projectRoot,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}
