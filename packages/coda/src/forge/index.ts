/**
 * @module forge
 * L5 FORGE Design Layer — Project initialization flows.
 *
 * v0.1: Greenfield flow — scaffolds `.coda/`, generates reference docs, creates first milestone.
 * v0.7: Brownfield support — evidence management, backdrop detection.
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

// Evidence management (v0.7)
export type { EvidenceFrontmatter, EvidenceRecord } from './evidence';
export { EVIDENCE_DIR, writeEvidence, readEvidence, readAllEvidence } from './evidence';