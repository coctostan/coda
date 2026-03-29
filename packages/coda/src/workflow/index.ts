/**
 * @module workflow
 * L6 Workflow Engine — Issue lifecycle orchestration.
 *
 * Assembles context for each lifecycle phase and sequences
 * BUILD tasks with module prompt injection. Does NOT drive
 * the LLM — that's M7's job.
 */

// Types
export type { PhaseContext, BuildTaskContext, CarryForwardConfig } from './types';
export { DEFAULT_CARRY_FORWARD } from './types';

// Context builder
export {
  loadIssue,
  loadPlan,
  loadTasks,
  loadRefDocs,
  getPreviousTaskSummaries,
} from './context-builder';

// Phase runner
export { getPhaseContext } from './phase-runner';

// Build loop
export { buildTaskContext, getBuildSequence } from './build-loop';
