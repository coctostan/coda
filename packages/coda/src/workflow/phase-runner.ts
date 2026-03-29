/**
 * @module workflow/phase-runner
 * Per-phase context assembly for the CODA issue lifecycle.
 *
 * Returns a PhaseContext with the right systemPrompt and assembled
 * context string for each lifecycle phase. Does NOT drive the LLM.
 */
import type { CodaState } from '@coda/core';
import type { Phase, PhaseContext } from './types';
import {
  loadIssue,
  loadPlan,
  loadTasks,
  loadRefDocs,
  getPreviousTaskSummaries,
  loadRevisionInstructions,
  loadRevisionHistory,
} from './context-builder';
import { buildTaskContext } from './build-loop';

/**
 * Get the context object for a given lifecycle phase.
 *
 * Assembles the appropriate system prompt and context string
 * by loading relevant records from `.coda/`.
 *
 * @param phase - The lifecycle phase
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @param state - Optional CodaState (required for build/verify/unify phases)
 * @returns PhaseContext with systemPrompt and assembled context
 */
export function getPhaseContext(
  phase: Phase,
  codaRoot: string,
  issueSlug: string,
  state?: CodaState
): PhaseContext {
  const issue = loadIssue(codaRoot, issueSlug);
  const issueContext = issue
    ? `## Issue: ${issue.frontmatter.title}\n${issue.body}`
    : '## Issue\nNo issue found.';

  switch (phase) {
    case 'specify': {
      const refs = loadRefDocs(codaRoot);
      return {
        systemPrompt: 'You are specifying an issue. Help the user define requirements and acceptance criteria.',
        context: [
          issueContext,
          refs.system ? `## System Reference\n${refs.system}` : '',
          refs.prd ? `## Product Requirements\n${refs.prd}` : '',
        ].filter(Boolean).join('\n\n'),
      };
    }

    case 'plan': {
      const refs = loadRefDocs(codaRoot);
      return {
        systemPrompt: 'You are planning tasks for this issue. Design an implementation approach.',
        context: [
          issueContext,
          refs.system ? `## System Reference\n${refs.system}` : '',
        ].filter(Boolean).join('\n\n'),
      };
    }

    case 'review': {
      const plan = loadPlan(codaRoot, issueSlug);
      const tasks = loadTasks(codaRoot, issueSlug);
      const planContext = plan ? `## Plan\n${plan.body}` : '';
      const taskList = tasks.length > 0
        ? `## Tasks\n${tasks.map((t) => `- Task ${String(t.frontmatter.id)}: ${t.frontmatter.title} (${t.frontmatter.status})`).join('\n')}`
        : '';

      if (state?.submode === 'revise') {
        const revisionInstructions = loadRevisionInstructions(codaRoot, issueSlug);
        return {
          systemPrompt: 'You are revising a development plan based on review feedback. Address each issue in the revision instructions without broadening scope.',
          context: [
            issueContext,
            planContext,
            taskList,
            revisionInstructions ? `## Revision Instructions\n${revisionInstructions}` : '',
          ].filter(Boolean).join('\n\n'),
        };
      }

      const revisionHistory = state?.loop_iteration && state.loop_iteration > 0
        ? loadRevisionHistory(codaRoot, issueSlug)
        : '';

      return {
        systemPrompt: 'You are reviewing the plan. Check AC coverage, task ordering, and scope.',
        context: [
          issueContext,
          planContext,
          taskList,
          revisionHistory ? `## Revision History\n${revisionHistory}` : '',
        ].filter(Boolean).join('\n\n'),
      };
    }

    case 'build': {
      const currentTask = state?.current_task ?? 1;
      const completedTasks = state?.completed_tasks ?? [];
      return buildTaskContext(codaRoot, issueSlug, currentTask, completedTasks);
    }

    case 'verify': {
      const completedTasks = state?.completed_tasks ?? [];
      const summaries = getPreviousTaskSummaries(
        codaRoot, issueSlug, completedTasks, completedTasks.length
      );
      return {
        systemPrompt: 'You are verifying acceptance criteria against built artifacts.',
        context: [
          issueContext,
          summaries ? `## Task Summaries\n${summaries}` : '',
        ].filter(Boolean).join('\n\n'),
      };
    }

    case 'unify': {
      const plan = loadPlan(codaRoot, issueSlug);
      const completedTasks = state?.completed_tasks ?? [];
      const summaries = getPreviousTaskSummaries(
        codaRoot, issueSlug, completedTasks, completedTasks.length
      );
      const refs = loadRefDocs(codaRoot);
      return {
        systemPrompt: 'You are closing the loop. Write the completion record and update reference docs.',
        context: [
          issueContext,
          plan ? `## Plan\n${plan.body}` : '',
          summaries ? `## Task Summaries\n${summaries}` : '',
          refs.system ? `## System Reference\n${refs.system}` : '',
        ].filter(Boolean).join('\n\n'),
      };
    }

    case 'done': {
      return {
        systemPrompt: 'This issue is complete.',
        context: issueContext,
      };
    }
  }
}
