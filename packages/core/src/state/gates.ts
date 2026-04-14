/**
 * @module state/gates
 * Gate definitions and checking for CODA phase transitions.
 *
 * Gates validate that preconditions are met before allowing a phase
 * transition. Each gate inspects specific fields from GateCheckData
 * and returns pass/fail with a human-readable reason.
 */

import type { Phase, Gate, GateCheckData } from './types';

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
      return { passed: true };
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
