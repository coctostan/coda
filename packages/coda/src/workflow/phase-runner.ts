/**
 * @module workflow/phase-runner
 * Per-phase context assembly for the CODA issue lifecycle.
 *
 * Returns a PhaseContext with the right systemPrompt and assembled
 * context string for each lifecycle phase. Does NOT drive the LLM.
 */
import type { CodaState } from '@coda/core';
import type { Phase, PhaseContext, PhaseContextMetadata } from './types';
import {
  loadIssue,
  loadPlan,
  loadTasks,
  loadRefDocs,
  getPreviousTaskSummaries,
  loadRevisionInstructions,
  loadRevisionHistory,
  loadModuleFindingsSummary,
} from './context-builder';
import { buildTaskContext } from './build-loop';
import { getModulePromptForHook } from './module-integration';
import { assembleUnifyContext } from './unify-runner';

const NO_PROD_IMPLEMENTATION_YET = 'Do not start production-code implementation yet.';

function withLifecyclePrompt(
  base: string,
  nextAction: string,
  options: { blockImplementation?: boolean } = {}
): string {
  return [
    base,
    options.blockImplementation ? NO_PROD_IMPLEMENTATION_YET : '',
    nextAction,
  ].filter(Boolean).join(' ');
}

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
      return withMetadata({
        systemPrompt: withLifecyclePrompt('You are specifying an issue. Help the user define requirements and acceptance criteria.', 'When the issue scope and acceptance criteria are ready, use coda_advance to move into plan.', { blockImplementation: true }),
        context: [
          issueContext,
          refs.system ? `## System Reference\n${refs.system}` : '',
          refs.prd ? `## Product Requirements\n${refs.prd}` : '',
        ].filter(Boolean).join('\n\n'),
      }, phase, state);
    }

    case 'plan': {
      const refs = loadRefDocs(codaRoot);
      const modulePrompt = getModulePromptForHook('pre-plan', issueSlug, 'plan', { codaRoot });
      return withMetadata({
        systemPrompt: withLifecyclePrompt('You are planning tasks for this issue. Design an implementation approach.', 'When the plan and task breakdown are ready, use coda_advance to move into review.', { blockImplementation: true }),
        context: [
          issueContext,
          refs.system ? `## System Reference\n${refs.system}` : '',
          modulePrompt || '',
        ].filter(Boolean).join('\n\n'),
      }, phase, state);
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
        return withMetadata({
          systemPrompt: withLifecyclePrompt('You are revising a development plan based on review feedback. Address each issue in the revision instructions without broadening scope.', 'When the revised plan is ready, use coda_advance to return to review.', { blockImplementation: true }),
          context: [
            issueContext,
            planContext,
            taskList,
            revisionInstructions ? `## Revision Instructions\n${revisionInstructions}` : '',
          ].filter(Boolean).join('\n\n'),
        }, phase, state);
      }

      const revisionHistory = state?.loop_iteration && state.loop_iteration > 0
        ? loadRevisionHistory(codaRoot, issueSlug)
        : '';

      return withMetadata({
        systemPrompt: withLifecyclePrompt('You are reviewing the plan. Check AC coverage, task ordering, and scope.', 'When the plan is approved, use coda_advance to move into build.'),
        context: [
          issueContext,
          planContext,
          taskList,
          revisionHistory ? `## Revision History\n${revisionHistory}` : '',
        ].filter(Boolean).join('\n\n'),
      }, phase, state);
    }

    case 'build': {
      const currentTask = state?.current_task ?? 1;
      const completedTasks = state?.completed_tasks ?? [];
      const taskContext = buildTaskContext(codaRoot, issueSlug, currentTask, completedTasks);
      return withMetadata(taskContext, phase, state, issueSlug, codaRoot);
    }

    case 'verify': {
      if (state?.submode === 'correct') {
        const currentTask = state.current_task ?? 1;
        const completedTasks = state.completed_tasks ?? [];
        const taskContext = buildTaskContext(codaRoot, issueSlug, currentTask, completedTasks);
        return withMetadata(taskContext, phase, state, issueSlug, codaRoot);
      }

      const completedTasks = state?.completed_tasks ?? [];
      const summaries = getPreviousTaskSummaries(
        codaRoot, issueSlug, completedTasks, completedTasks.length
      );
      const plan = loadPlan(codaRoot, issueSlug);
      const findingsSummary = loadModuleFindingsSummary(codaRoot, issueSlug);
      return withMetadata({
        systemPrompt: withLifecyclePrompt('You are verifying acceptance criteria against built artifacts.', 'When the acceptance criteria are satisfied, use coda_advance to move into unify.'),
        context: [
          issueContext,
          plan ? `## Plan\n${plan.body}` : '',
          summaries ? `## Task Summaries\n${summaries}` : '',
          findingsSummary ? `## Module Findings\n${findingsSummary}` : '',
        ].filter(Boolean).join('\n\n'),
      }, phase, state);
    }

    case 'unify': {
      return withMetadata(
        assembleUnifyContext(codaRoot, issueSlug, state),
        phase,
        state
      );
    }

    case 'done': {
      return withMetadata({
        systemPrompt: 'This issue is complete.',
        context: issueContext,
      }, phase, state);
    }
  }
}

function withMetadata(
  context: Omit<PhaseContext, 'metadata'>,
  phase: Phase,
  state?: CodaState,
  issueSlug?: string,
  codaRoot?: string
): PhaseContext {
  return {
    ...context,
    metadata: buildMetadata(phase, state, issueSlug, codaRoot),
  };
}

function buildMetadata(
  phase: Phase,
  state?: CodaState,
  issueSlug?: string,
  codaRoot?: string
): PhaseContextMetadata {
  const currentTask = state?.current_task ?? null;
  const task = currentTask !== null && issueSlug && codaRoot
    ? loadTasks(codaRoot, issueSlug).find((candidate) => candidate.frontmatter.id === currentTask)
    : undefined;

  return {
    phase,
    submode: state?.submode ?? null,
    loopIteration: state?.loop_iteration ?? 0,
    currentTask,
    taskKind: task?.frontmatter.kind ?? null,
    taskTitle: task?.frontmatter.title ?? null,
  };
}
