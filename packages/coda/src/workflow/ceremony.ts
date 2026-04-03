/**
 * @module workflow/ceremony
 * Adaptive ceremony rules per issue type.
 *
 * Controls which lifecycle phases are active, which modules fire,
 * whether TDD is enforced, and whether human review is required.
 * Rules are config-driven — `coda.json` overrides merge with defaults.
 */

/**
 * Ceremony configuration for a single issue type.
 * Controls lifecycle depth: which phases run, iteration limits, and module gating.
 */
export interface CeremonyRules {
  /** Whether the autonomous review phase runs. */
  reviewEnabled: boolean;
  /** Maximum review/revise iterations before escalation. */
  reviewMaxIterations: number;
  /** Whether human review gate is on by default. */
  humanReviewDefault: boolean;
  /** Whether TDD enforcement applies (test-first, red-green-refactor). */
  tddEnabled: boolean;
  /** Whether the autonomous verify phase runs. */
  verifyEnabled: boolean;
  /** Maximum verify/correct iterations before escalation. */
  verifyMaxIterations: number;
  /** Full unify (spec delta + ref update) vs lightweight (record only). */
  unifyFull: boolean;
  /** Whether module hooks (security, quality, etc.) fire for this issue type. */
  modulesEnabled: boolean;
  /** Whether spec delta is required during SPECIFY and UNIFY. */
  specDeltaRequired: boolean;
}

/**
 * Default ceremony rules for each issue type.
 *
 * - **feature**: Full ceremony — all phases, all modules, human review, TDD
 * - **bugfix**: Full ceremony with shorter verify cycle
 * - **refactor**: Lighter review (1 iteration), no human review, lightweight unify
 * - **chore**: Skip review, TDD, and modules entirely
 * - **docs**: Skip review, TDD, verify, and modules — human review at verify instead
 */
export const CEREMONY_DEFAULTS: Record<string, CeremonyRules> = {
  feature: {
    reviewEnabled: true,
    reviewMaxIterations: 3,
    humanReviewDefault: true,
    tddEnabled: true,
    verifyEnabled: true,
    verifyMaxIterations: 3,
    unifyFull: true,
    modulesEnabled: true,
    specDeltaRequired: true,
  },
  bugfix: {
    reviewEnabled: true,
    reviewMaxIterations: 3,
    humanReviewDefault: true,
    tddEnabled: true,
    verifyEnabled: true,
    verifyMaxIterations: 2,
    unifyFull: true,
    modulesEnabled: true,
    specDeltaRequired: true,
  },
  refactor: {
    reviewEnabled: true,
    reviewMaxIterations: 1,
    humanReviewDefault: false,
    tddEnabled: true,
    verifyEnabled: true,
    verifyMaxIterations: 2,
    unifyFull: false,
    modulesEnabled: true,
    specDeltaRequired: true,
  },
  chore: {
    reviewEnabled: false,
    reviewMaxIterations: 0,
    humanReviewDefault: false,
    tddEnabled: false,
    verifyEnabled: true,
    verifyMaxIterations: 1,
    unifyFull: false,
    modulesEnabled: false,
    specDeltaRequired: false,
  },
  docs: {
    reviewEnabled: false,
    reviewMaxIterations: 0,
    humanReviewDefault: false,
    tddEnabled: false,
    verifyEnabled: false,
    verifyMaxIterations: 0,
    unifyFull: false,
    modulesEnabled: false,
    specDeltaRequired: false,
  },
};

/**
 * Get ceremony rules for an issue type, optionally merged with config overrides.
 *
 * Looks up the issue type in `CEREMONY_DEFAULTS`. Unknown types fall back to
 * `feature` defaults. Config overrides (from `coda.json` `ceremony_overrides`)
 * are spread on top — overrides win for any field they specify.
 *
 * @param issueType - The issue type (feature, bugfix, refactor, chore, docs)
 * @param configOverrides - Optional partial overrides from project config
 * @returns Merged ceremony rules
 */
export function getCeremonyRules(
  issueType: string,
  configOverrides?: Partial<CeremonyRules>
): CeremonyRules {
  const defaults = CEREMONY_DEFAULTS[issueType] ?? CEREMONY_DEFAULTS['feature']!;
  if (!configOverrides) return { ...defaults };
  return { ...defaults, ...configOverrides };
}
