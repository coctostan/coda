/**
 * @module forge/types
 * Shared types for the FORGE design layer.
 */

/** Result of backdrop detection — determines which FORGE flow to use. */
export type ForgeBackdrop =
  | { type: 'greenfield' }
  | { type: 'existing' };

/** Answers collected from the conversational interview. */
export interface ForgeInterviewAnswers {
  /** What is being built (one sentence). */
  building: string;
  /** Who uses this and what do they need. */
  users: string;
  /** Technology stack. */
  techStack: string;
  /** What's in scope for v1 and what's explicitly out. */
  scope: string;
  /** Key constraints, or null if none provided. */
  constraints: string | null;
}

/** Input context for the greenfield FORGE flow. */
export interface ForgeContext {
  /** Absolute path to the project root. */
  projectRoot: string;
  /** Pre-collected interview answers. */
  answers: ForgeInterviewAnswers;
}

/** Result of a FORGE flow execution. */
export interface ForgeResult {
  /** Whether the flow completed successfully. */
  success: boolean;
  /** Path to the created .coda/ directory. */
  codaRoot: string;
  /** Human-readable status message. */
  message: string;
}

/** Gate configuration — which issue types enforce a behavior. */
export interface GateConfig {
  feature: boolean;
  bugfix: boolean;
  refactor: boolean;
  chore: boolean;
  docs: boolean;
}

/** Shape of the .coda/coda.json configuration file. */
export interface CodaConfig {
  /** Command to run TDD tests (null until configured). */
  tdd_test_command: string | null;
  /** Command to run the full test suite (null until configured). */
  full_suite_command: string | null;
  /** Additional verification commands to run. */
  verification_commands: string[];
  /** Which issue types enforce TDD gating. */
  tdd_gate: GateConfig;
  /** Which issue types require human review by default. */
  human_review_default: GateConfig;
}
