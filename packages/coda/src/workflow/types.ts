/**
 * @module workflow/types
 * Type definitions for the CODA workflow engine.
 */

import type { CodaState, Phase, TaskRecord } from '@coda/core';
import type { Submode } from '../../../core/src/state/types';
export type { Phase } from '@coda/core';

/** Runtime metadata surfaced alongside assembled phase context. */
export interface PhaseContextMetadata {
  /** Active lifecycle phase. */
  phase: Phase;
  /** Active review/verify submode, if any. */
  submode: Submode | null;
  /** Current autonomous loop iteration for review/verify flows. */
  loopIteration: number;
  /** Active task number when task-scoped work is in progress. */
  currentTask: number | null;
  /** Active task kind when known. */
  taskKind: TaskRecord['kind'] | null;
  /** Active task title when known. */
  taskTitle: string | null;
}

/** Context object returned by the phase runner for each lifecycle phase. */
export interface PhaseContext {
  /** System prompt describing the agent's role in this phase. */
  systemPrompt: string;
  /** Assembled context string with relevant records and prompts. */
  context: string;
  /** Runtime metadata needed by Pi-facing consumers. */
  metadata: PhaseContextMetadata;
}

/** Extended context for BUILD phase tasks before runtime metadata is attached. */
export interface BuildTaskContext {
  /** System prompt describing the agent's role for the active task. */
  systemPrompt: string;
  /** Assembled context string with relevant task records and prompts. */
  context: string;
  /** The task number being executed. */
  taskId: number;
  /** The task title for display. */
  taskTitle: string;
}

/** Configuration for carry-forward behavior in BUILD loop. */
export interface CarryForwardConfig {
  /** Maximum number of previous task summaries to include. Default: 3. */
  maxTasks: number;
}

/** One verification check that failed for a specific acceptance criterion. */
export interface VerificationFailedCheck {
  type: string;
  detail: string;
}

/** Parsed verification failure artifact content. */
export interface VerificationFailureArtifact {
  acId: string;
  status: 'not-met';
  failedChecks: VerificationFailedCheck[];
  sourceTasks: number[];
  relevantFiles: string[];
}

/** In-memory verification result for one acceptance criterion. */
export interface VerifyAcResult {
  acId: string;
  status: 'met' | 'not-met';
  failedChecks?: VerificationFailedCheck[];
  sourceTasks: number[];
  relevantFiles: string[];
}

/** Optional explicit verification output injected by tests or higher-level orchestration. */
export interface VerificationResult {
  acResults: VerifyAcResult[];
}

/** Options for running the verify runner. */
export interface VerifyRunnerOptions {
  max_verify_iterations?: number;
  verificationResult?: VerificationResult;
  suitePassed?: boolean;
}

/** Outcome when verification found unmet criteria and generated correction tasks. */
export interface VerifyCorrectionsRequiredOutcome {
  outcome: 'corrections-required';
  state: CodaState;
  failures: VerificationFailureArtifact[];
  failureArtifacts: string[];
  correctionTasks: TaskRecord[];
}

/** Outcome when correction work is done and verify should run again. */
export interface VerifyReadyOutcome {
  outcome: 'verify-ready';
  state: CodaState;
}

/** Outcome when all ACs are met and verification succeeds. */
export interface VerifySuccessOutcome {
  outcome: 'success';
  state: CodaState;
  failureArtifacts: string[];
  correctionTasks: TaskRecord[];
}

/** Outcome when the verify/correct loop is exhausted. */
export interface VerifyExhaustedOutcome {
  outcome: 'exhausted';
  state: CodaState;
  failureArtifacts: string[];
}

/** Union of verify-runner outcomes. */
export type VerifyRunnerOutcome =
  | VerifyCorrectionsRequiredOutcome
  | VerifyReadyOutcome
  | VerifySuccessOutcome
  | VerifyExhaustedOutcome;

/** Default carry-forward configuration. */
export const DEFAULT_CARRY_FORWARD: CarryForwardConfig = {
  maxTasks: 3,
};
