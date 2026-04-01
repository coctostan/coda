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

/**
 * Build the context for a specific task in the BUILD phase.
 *
 * Assembles the task record, Todd TDD prompt, and carry-forward
 * summaries from previously completed tasks.
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

  // Get module prompts for pre-build injection (v0.3 dispatcher)
  const modulePrompt = getModulePromptForHook('pre-build', issueSlug, 'build', { taskId, codaRoot });

  // Get carry-forward summaries
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

  if (modulePrompt) {
    contextParts.push(modulePrompt);
  }

  const systemPrompt = task?.frontmatter.kind === 'correction' && task.frontmatter.fix_for_ac
    ? `You are fixing a verification failure for ${task.frontmatter.fix_for_ac}. Follow TDD and stay narrowly focused on the unmet acceptance criterion.`
    : `You are executing task ${String(taskId)}: ${taskTitle}. Follow TDD.`;

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
