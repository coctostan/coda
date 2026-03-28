/**
 * @module workflow/types
 * Type definitions for the CODA workflow engine.
 */

export type { Phase } from '@coda/core';

/** Context object returned by the phase runner for each lifecycle phase. */
export interface PhaseContext {
  /** System prompt describing the agent's role in this phase. */
  systemPrompt: string;
  /** Assembled context string with relevant records and prompts. */
  context: string;
}

/** Extended context for BUILD phase tasks. */
export interface BuildTaskContext extends PhaseContext {
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

/** Default carry-forward configuration. */
export const DEFAULT_CARRY_FORWARD: CarryForwardConfig = {
  maxTasks: 3,
};
