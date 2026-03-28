/**
 * @module workflow/build-loop
 * BUILD loop task sequencing and per-task context assembly.
 *
 * Produces context objects for each task in the BUILD phase.
 * Does NOT drive the LLM — that's M7's job.
 */

import { getModulePrompts } from '../modules';
import { loadTasks, getPreviousTaskSummaries } from './context-builder';
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

  // Get Todd prompt for pre-build injection
  const toddPrompts = getModulePrompts('pre-build');

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

  if (prevSummaries) {
    contextParts.push(`## Previous Tasks\n${prevSummaries}`);
  }

  if (toddPrompts.length > 0) {
    contextParts.push(toddPrompts.join('\n'));
  }

  return {
    taskId,
    taskTitle,
    systemPrompt: `You are executing task ${String(taskId)}: ${taskTitle}. Follow TDD.`,
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
