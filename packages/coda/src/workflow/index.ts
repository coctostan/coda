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
export type {
  VerificationFailedCheck,
  VerificationFailureArtifact,
  VerifyAcResult,
  VerificationResult,
  VerifyRunnerOptions,
  VerifyRunnerOutcome,
  VerifyCorrectionsRequiredOutcome,
  VerifyReadyOutcome,
  VerifySuccessOutcome,
  VerifyExhaustedOutcome,
} from './types';
export type {
  ReviewIssue,
  ReviewDecision,
  ReviewRunnerOptions,
  ReviewRunnerOutcome,
  ReviewApprovedOutcome,
  ReviewReviseRequiredOutcome,
  ReviewReadyOutcome as ReviewRunnerReadyOutcome,
  ReviewExhaustedOutcome,
} from './review-runner';

// Context builder
export {
  loadIssue,
  loadPlan,
  loadTasks,
  loadRefDocs,
  loadRevisionInstructions,
  loadRevisionHistory,
  getPreviousTaskSummaries,
  loadVerificationFailure,
  loadVerificationFailures,
  getSourceTaskSummaries,
  getCarryForwardSummaries,
} from './context-builder';

// Phase runner
export { getPhaseContext } from './phase-runner';

// UNIFY runner
export { assembleUnifyContext, loadTopicMatchedRefDocs } from './unify-runner';

// Build loop
export { buildTaskContext, getBuildSequence } from './build-loop';

// Review loop
export { runReviewRunner } from './review-runner';

// Verify loop
export { runVerifyRunner } from './verify-runner';

// Module integration (v0.3)
export {
  createModuleSystem,
  buildHookContext,
  getModulePromptForHook,
  loadModuleConfig,
  persistFindings,
  loadFindings,
  summarizeFindings,
} from './module-integration';
export type { ModuleFindingsData } from './module-integration';

// VCS integration (v0.6)
export { createBranch, commitTask, getCurrentBranch } from './vcs';
export type { CreateBranchResult, CommitTaskResult } from './vcs';

// Ceremony rules (v0.7)
export type { CeremonyRules } from './ceremony';
export { CEREMONY_DEFAULTS, getCeremonyRules } from './ceremony';

// Context budgets (v0.7)
export type { ContextSection, BudgetResult } from './context-budgets';
export { PHASE_BUDGETS, estimateTokens, assembleWithinBudget } from './context-budgets';