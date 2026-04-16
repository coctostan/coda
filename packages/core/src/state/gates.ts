/**
 * @module state/gates
 * Gate definitions and checking for CODA phase transitions.
 *
 * Gates validate that preconditions are met before allowing a phase
 * transition. Each gate inspects specific fields from GateCheckData
 * and returns pass/fail with a human-readable reason.
 */

import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import type { Phase, Gate, GateCheckData } from './types';

/** Overlay section headings recognized by the evidence check. */
const OVERLAY_HEADINGS = [
  '## Project Values',
  '## Validated Patterns',
  '## Known False Positives',
  '## Recurring Issues',
];

/** Split frontmatter from a markdown file, returning the body half. */
function stripFrontmatter(content: string): string {
  const normalized = content.replace(/\r\n?/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return normalized;
  }
  const lines = normalized.split('\n');
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === '---') {
      return lines.slice(i + 1).join('\n').trim();
    }
  }
  return normalized;
}

/** Resolve a possibly-relative artifact path against codaRoot. */
function resolveArtifactPath(codaRoot: string | undefined, relative: string): string {
  if (isAbsolute(relative)) return relative;
  if (!codaRoot) return relative;
  return join(codaRoot, relative);
}

/**
 * Verify that a declared artifact path exists on disk and has non-empty
 * content. For overlays, requires at least one `- ` bullet under one of the
 * four overlay section headings. For reference docs, requires non-empty body
 * after frontmatter is stripped.
 */
function verifyArtifactEvidence(
  codaRoot: string | undefined,
  relativePath: string,
  kind: 'overlay' | 'reference_doc'
): { ok: boolean; reason?: string } {
  const absolute = resolveArtifactPath(codaRoot, relativePath);
  if (!existsSync(absolute)) {
    return {
      ok: false,
      reason: `${relativePath} declared in artifacts_produced but does not exist`,
    };
  }

  let content: string;
  try {
    content = readFileSync(absolute, 'utf-8');
  } catch {
    return {
      ok: false,
      reason: `${relativePath} declared in artifacts_produced but could not be read`,
    };
  }

  const body = stripFrontmatter(content);

  if (kind === 'overlay') {
    // Find any overlay heading followed by at least one '- ' bullet before
    // the next heading or end-of-file.
    const lines = body.split('\n');
    let currentHeading: string | null = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (line.startsWith('## ')) {
        currentHeading = OVERLAY_HEADINGS.includes(line) ? line : null;
        continue;
      }
      if (currentHeading !== null && line.startsWith('- ') && line.length > 2) {
        return { ok: true };
      }
    }
    return {
      ok: false,
      reason: `${relativePath} has no non-empty sections`,
    };
  }

  // reference_doc
  if (body.length === 0) {
    return { ok: false, reason: `${relativePath} has empty body` };
  }
  return { ok: true };
}

/**
 * Run the unify→done artifact evidence validation.
 *
 * Rules (in order):
 * 1. Every declared path in artifactsProduced must exist and be non-empty.
 * 2. Every present exemption string must be non-empty.
 * 3. If specDeltaPresent: must have a non-empty reference_docs entry OR a
 *    non-empty exemptions.system_spec.
 * 4. If artifactEvidenceRequired (feature/bugfix): must have at least one
 *    non-empty overlay, reference_doc, or exemptions.{overlays,reference_docs}.
 */
function checkArtifactEvidence(d: GateCheckData): { passed: boolean; reason?: string } {
  const artifacts = d.artifactsProduced ?? { overlays: [], reference_docs: [], decisions: [] };
  const exemptions = d.artifactExemptions ?? {};

  // Rule 1 + 2: any declared path or exemption is validated unconditionally.
  for (const overlayPath of artifacts.overlays) {
    const result = verifyArtifactEvidence(d.codaRoot, overlayPath, 'overlay');
    if (!result.ok) return { passed: false, reason: result.reason };
  }
  for (const refPath of artifacts.reference_docs) {
    const result = verifyArtifactEvidence(d.codaRoot, refPath, 'reference_doc');
    if (!result.ok) return { passed: false, reason: result.reason };
  }
  for (const key of ['overlays', 'reference_docs', 'system_spec'] as const) {
    if (Object.prototype.hasOwnProperty.call(exemptions, key) && (exemptions[key] ?? '').trim().length === 0) {
      return {
        passed: false,
        reason: `exemption requires a non-empty reason (exemptions.${key} is empty)`,
      };
    }
  }

  const hasOverlay = artifacts.overlays.length > 0;
  const hasRefDoc = artifacts.reference_docs.length > 0;
  const hasOverlayExemption = (exemptions.overlays ?? '').trim().length > 0;
  const hasRefDocExemption = (exemptions.reference_docs ?? '').trim().length > 0;
  const hasSystemSpecExemption = (exemptions.system_spec ?? '').trim().length > 0;

  // Rule 3: spec_delta enforcement regardless of ceremony.
  if (d.specDeltaPresent === true) {
    if (!hasRefDoc && !hasSystemSpecExemption) {
      return {
        passed: false,
        reason: 'spec_delta declared but ref-system.md not updated (or exemption missing)',
      };
    }
  }

  // Rule 4: ceremony-driven evidence requirement.
  if (d.artifactEvidenceRequired === true) {
    if (!hasOverlay && !hasRefDoc && !hasOverlayExemption && !hasRefDocExemption) {
      return {
        passed: false,
        reason: 'no compounding artifacts produced and no exemption declared',
      };
    }
  }

  return { passed: true };
}

/**
 * v0.1/v0.2 gate definitions — one per valid phase transition.
 * Each gate checks a specific precondition before allowing the move.
 */
export const GATES: Record<string, Gate> = {
  'specify→plan': {
    name: 'specify→plan',
    check: (d: GateCheckData) => ({
      passed: (d.issueAcCount ?? 0) > 0,
      reason: 'Issue must have at least one acceptance criterion',
    }),
  },
  'plan→review': {
    name: 'plan→review',
    check: (d: GateCheckData) => ({
      passed: d.planExists === true,
      reason: 'Plan must exist before review',
    }),
  },
  'review→build': {
    name: 'review→build',
    check: (d: GateCheckData) => {
      if (d.planApproved !== true) {
        return {
          passed: false,
          reason: 'Plan must be approved before build',
        };
      }

      if (d.humanReviewRequired === true && d.humanReviewStatus !== 'approved') {
        return {
          passed: false,
          reason: 'Human plan review pending',
        };
      }

      return { passed: true };
    },
  },
  'build→verify': {
    name: 'build→verify',
    check: (d: GateCheckData) => {
      if (d.allPlannedTasksComplete !== true) {
        return { passed: false, reason: 'All planned tasks must be complete' };
      }
      if ((d.moduleBlockFindings ?? 0) > 0) {
        return { passed: false, reason: 'Module findings require attention' };
      }
      return { passed: true };
    },
  },
  'verify→unify': {
    name: 'verify→unify',
    check: (d: GateCheckData) => ({
      passed: d.allAcsMet === true,
      reason: 'All acceptance criteria must be met',
    }),
  },
  'unify→done': {
    name: 'unify→done',
    check: (d: GateCheckData) => {
      if (d.completionRecordExists !== true) {
        return { passed: false, reason: 'Completion record must exist' };
      }
      if (d.systemSpecUpdated !== true) {
        return { passed: false, reason: 'Spec delta must be merged into ref-system.md (or explicitly confirmed no change)' };
      }
      if (d.referenceDocsReviewed !== true) {
        return { passed: false, reason: 'Reference docs must be reviewed for updates' };
      }
      if (d.milestoneUpdated !== true) {
        return { passed: false, reason: 'Milestone progress must be updated (or confirmed no milestone)' };
      }
      if (d.unifyReviewStatus !== 'approved') {
        return { passed: false, reason: 'UNIFY review pending — human must approve before advancing to DONE' };
      }
      return checkArtifactEvidence(d);
    },
  },
};

/**
 * Check the gate for a specific phase transition.
 *
 * @param from - The current phase
 * @param to - The target phase
 * @param data - Data to pass to the gate check function
 * @returns Gate check result — passes if no gate is defined for this transition
 */
export function checkGate(
  from: Phase,
  to: Phase,
  data: GateCheckData
): { passed: boolean; reason?: string } {
  const key = `${from}→${to}`;
  const gate = GATES[key];

  if (!gate) {
    return { passed: true };
  }

  return gate.check(data);
}
