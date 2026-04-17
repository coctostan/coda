/**
 * @module workflow/build-loop
 * BUILD loop task sequencing and per-task context assembly.
 *
 * Produces context objects for each task in the BUILD phase.
 * Does NOT drive the LLM — that's M7's job.
 */

import { getModulePromptForHook } from './module-integration';
import {
  loadTasks,
  getPreviousTaskSummaries,
  loadVerificationFailure,
  getSourceTaskSummaries,
} from './context-builder';
import type { BuildTaskContext } from './types';
import { DEFAULT_CARRY_FORWARD } from './types';

type BuildTaskRecord = ReturnType<typeof loadTasks>[number];

const BUILD_PROTOCOL_REMINDER = 'Trust the injected workflow guidance and tool descriptions before reading CODA source to infer workflow mechanics.';
const BUILD_NEXT_ACTION_REMINDER = 'Use coda_status and coda_advance for lifecycle next steps.';

/**
 * Build the context for a specific task in the BUILD phase.
 *
 * Assembles the task record, pre-build module prompts, carry-forward
 * summaries from previously completed tasks, and runtime module follow-up
 * prompts for post-task/post-build analysis when applicable.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @param taskId - The task number to build context for
 * @param completedTasks - Array of completed task ids for carry-forward
 * @returns BuildTaskContext with assembled context
 */
export function buildTaskContext(
  codaRoot: string,
  issueSlug: string,
  taskId: number,
  completedTasks: number[]
): BuildTaskContext {
  const tasks = loadTasks(codaRoot, issueSlug);
  const task = tasks.find((t) => t.frontmatter.id === taskId);

  const taskTitle = task?.frontmatter.title ?? `Task ${String(taskId)}`;
  const taskBody = task?.body ?? '';
  const truths = task?.frontmatter.truths ?? [];

  const latestCompletedTaskId = getLatestCompletedTaskId(completedTasks, taskId);
  const postTaskModulePrompt = latestCompletedTaskId === null
    ? ''
    : getModulePromptForHook('post-task', issueSlug, 'build', {
      taskId: latestCompletedTaskId,
      codaRoot,
    });

  const preBuildModulePrompt = getModulePromptForHook('pre-build', issueSlug, 'build', {
    taskId,
    codaRoot,
  });

  const postBuildModulePrompt = task?.frontmatter.kind === 'correction' || !isFinalBuildTask(tasks, taskId)
    ? ''
    : getModulePromptForHook('post-build', issueSlug, 'build', {
      codaRoot,
      changedFiles: collectChangedFiles(tasks, [...completedTasks, taskId]),
    });

  const prevSummaries = getPreviousTaskSummaries(
    codaRoot,
    issueSlug,
    completedTasks,
    DEFAULT_CARRY_FORWARD.maxTasks
  );

  const contextParts: string[] = [
    `## Task: ${taskTitle}`,
    taskBody,
  ];

  if (truths.length > 0) {
    contextParts.push(`## Truths\n${truths.join('\n')}`);
  }

  if (task?.frontmatter.kind === 'correction' && task.frontmatter.fix_for_ac) {
    const failure = loadVerificationFailure(codaRoot, issueSlug, task.frontmatter.fix_for_ac);
    const sourceSummaries = failure
      ? getSourceTaskSummaries(codaRoot, issueSlug, failure.sourceTasks)
      : '';

    if (failure) {
      contextParts.push(formatVerificationFailure(failure));
    }

    if (sourceSummaries) {
      contextParts.push(`## Source Task Summaries\n${sourceSummaries}`);
    }
  }

  if (prevSummaries) {
    contextParts.push(`## Previous Tasks\n${prevSummaries}`);
  }

  if (task?.frontmatter.kind !== 'correction') {
    contextParts.push([
      '## Task Completion Protocol',
      BUILD_PROTOCOL_REMINDER,
      'After completing this task:',
      '1. Mark the task complete with coda_update (set status: "complete")',
      '2. Add a Summary section to the task with coda_edit_body',
      '3. Call coda_status to confirm the next pending task and current lifecycle state',
      '4. If there are more pending tasks, read the next task with coda_read and begin it immediately',
      '5. If all tasks are complete, call coda_advance to move to the verify phase',
    ].join('\n'));
  }

  if (postTaskModulePrompt) {
    contextParts.push(postTaskModulePrompt);
  }

  if (preBuildModulePrompt) {
    contextParts.push(preBuildModulePrompt);
  }

  if (postBuildModulePrompt) {
    contextParts.push(postBuildModulePrompt);
  }

  const systemPrompt = task?.frontmatter.kind === 'correction' && task.frontmatter.fix_for_ac
    ? `You are fixing a verification failure for ${task.frontmatter.fix_for_ac}. Follow TDD and stay narrowly focused on the unmet acceptance criterion. Stay inside the task protocol. ${BUILD_NEXT_ACTION_REMINDER} ${BUILD_PROTOCOL_REMINDER}`
    : `You are executing task ${String(taskId)}: ${taskTitle}. Follow TDD. Stay inside the task protocol. ${BUILD_NEXT_ACTION_REMINDER} ${BUILD_PROTOCOL_REMINDER}`;

  return {
    taskId,
    taskTitle,
    systemPrompt,
    context: contextParts.join('\n\n'),
  };
}

/**
 * Get the sequence of task ids to execute in the BUILD phase.
 *
 * Returns pending/active task ids sorted by id ascending.
 * Excludes completed and blocked tasks.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @returns Array of task ids to execute, in order
 */
export function getBuildSequence(
  codaRoot: string,
  issueSlug: string
): number[] {
  const tasks = loadTasks(codaRoot, issueSlug);
  return tasks
    .filter((t) => t.frontmatter.status === 'pending' || t.frontmatter.status === 'active')
    .map((t) => t.frontmatter.id);
}

function getLatestCompletedTaskId(completedTasks: number[], currentTaskId: number): number | null {
  const priorTaskIds = completedTasks
    .filter((candidate) => candidate !== currentTaskId)
    .sort((a, b) => a - b);

  return priorTaskIds[priorTaskIds.length - 1] ?? null;
}

function isFinalBuildTask(tasks: BuildTaskRecord[], currentTaskId: number): boolean {
  const buildTaskIds = tasks
    .filter((candidate) => candidate.frontmatter.kind !== 'correction')
    .map((candidate) => candidate.frontmatter.id)
    .sort((a, b) => a - b);

  return buildTaskIds[buildTaskIds.length - 1] === currentTaskId;
}

function collectChangedFiles(tasks: BuildTaskRecord[], taskIds: number[]): string[] {
  const relevantTaskIds = new Set(taskIds);
  const changedFiles = tasks
    .filter((candidate) => relevantTaskIds.has(candidate.frontmatter.id))
    .flatMap((candidate) => candidate.frontmatter.files_to_modify ?? []);

  return Array.from(new Set(changedFiles));
}

function formatVerificationFailure(failure: {
  acId: string;
  failedChecks: Array<{ type: string; detail: string }>;
  relevantFiles: string[];
}): string {
  const failedChecks = failure.failedChecks.length > 0
    ? failure.failedChecks.map((check) => `- ${check.type}: ${check.detail}`).join('\n')
    : '- verification failure recorded';

  const relevantFiles = failure.relevantFiles.length > 0
    ? failure.relevantFiles.map((file) => `- ${file}`).join('\n')
    : '- none recorded';

  return [
    `## Verification Failure: ${failure.acId}`,
    failedChecks,
    `## Relevant Files\n${relevantFiles}`,
  ].join('\n');
}
