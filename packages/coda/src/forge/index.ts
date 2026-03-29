/**
 * @module forge
 * L5 FORGE Design Layer — Project initialization flows.
 *
 * v0.1: Greenfield flow only — scaffolds `.coda/`, generates
 * reference docs, and creates the first milestone.
 */

// Types
export type {
  ForgeBackdrop,
  ForgeInterviewAnswers,
  ForgeContext,
  ForgeResult,
  CodaConfig,
  GateConfig,
} from './types';

// Scaffold operations
export { detectBackdrop, scaffoldCoda, getDefaultConfig } from './scaffold';

// Greenfield flow
export { generateRefDocs, createFirstMilestone, forgeGreenfield } from './greenfield';
