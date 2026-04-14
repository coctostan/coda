/**
 * @module workflow/gate-automation
 * Configurable gate automation for CODA lifecycle transitions.
 *
 * Provides types and resolution logic for 3 configurable gate points:
 * `plan_review`, `build_review`, and `unify_review`. Each gate can be
 * set to `human`, `auto`, or `auto-unless-block` mode, with per-issue-type
 * overrides and backward compatibility with `human_review_default`.
 */

import type { CodaConfig, GateConfig } from '../forge/types';

/** Gate automation mode — controls whether a gate requires human interaction. */
export type GateMode = 'human' | 'auto' | 'auto-unless-block';

/** Named gate points that are configurable in v0.8. */
export type GatePoint = 'plan_review' | 'build_review' | 'unify_review';

/** Project-level gate automation configuration. */
export interface GateAutomation {
  /** Mode for the PLAN → BUILD human review gate. */
  plan_review: GateMode;
  /** Mode for the BUILD → VERIFY module findings gate. */
  build_review: GateMode;
  /** Mode for the UNIFY → DONE human approval gate. */
  unify_review: GateMode;
}

/** Per-issue-type gate overrides. */
export interface GateOverrides {
  [issueType: string]: Partial<GateAutomation>;
}

/** Hardcoded default gate modes — used as final fallback. */
export const DEFAULT_GATE_MODES: Record<GatePoint, GateMode> = {
  plan_review: 'human',
  build_review: 'auto-unless-block',
  unify_review: 'human',
};

/**
 * Resolve the effective gate mode for a given gate point and issue type.
 *
 * Resolution order:
 * 1. `config.gate_overrides?.[issueType]?.[gate]` — per-issue-type override
 * 2. `config.gates?.[gate]` — project default
 * 3. Backward compat: if no `gates` but `human_review_default` present, derive `plan_review` mode
 * 4. Hardcoded fallback per gate
 *
 * @param gate - The gate point to resolve
 * @param issueType - The issue type (feature, bugfix, etc.)
 * @param config - The project's CodaConfig
 * @returns The resolved GateMode
 */
export function resolveGateMode(
  gate: GatePoint,
  issueType: string,
  config: CodaConfig
): GateMode {
  // 1. Per-issue-type override
  const override = config.gate_overrides?.[issueType]?.[gate];
  if (override) {
    return override;
  }

  // 2. Project-level default
  const projectDefault = config.gates?.[gate];
  if (projectDefault) {
    return projectDefault;
  }

  // 3. Backward compat: derive plan_review from human_review_default
  // Access via indexed lookup to avoid deprecation hint — this is intentional backward-compat.
  const legacyGate = (config as unknown as Record<string, unknown>)['human_review_default'] as
    | GateConfig
    | undefined;
  if (gate === 'plan_review' && !config.gates && legacyGate) {
    const issueTypeEnabled = legacyGate[issueType as keyof GateConfig];
    if (issueTypeEnabled !== undefined) {
      return issueTypeEnabled ? 'human' : 'auto';
    }
  }

  // 4. Hardcoded fallback
  return DEFAULT_GATE_MODES[gate];
}

/**
 * Determine whether a gate should require human interaction.
 *
 * @param mode - The resolved gate mode
 * @param hasBlockingFindings - Whether there are module findings exceeding the block threshold
 * @returns `true` if human interaction is required
 */
export function shouldRequireHuman(
  mode: GateMode,
  hasBlockingFindings: boolean
): boolean {
  switch (mode) {
    case 'human':
      return true;
    case 'auto':
      return false;
    case 'auto-unless-block':
      return hasBlockingFindings;
  }
}
