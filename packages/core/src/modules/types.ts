/**
 * @module modules/types
 * Type definitions for the CODA module system (L3).
 *
 * Modules are domain-expert advisors that inject context at phase
 * boundaries and produce structured findings. The types here define
 * the vocabulary shared by the registry, dispatcher, and all consumers.
 *
 * Dependency rule: L3 modules MUST NOT import from L1 (data) or L2 (state).
 */

/** A hook point where modules can fire during the issue lifecycle. */
export type HookPoint =
  | 'init-scan'     // During /coda forge — brownfield/greenfield scanning
  | 'pre-specify'   // Before SPECIFY — inject domain context
  | 'pre-plan'      // Before PLAN — inject constraints
  | 'post-plan'     // After PLAN — validate plan
  | 'pre-build'     // Before BUILD — establish baselines
  | 'post-task'     // After each BUILD task — incremental checks
  | 'post-build'    // After all BUILD tasks — comprehensive review
  | 'pre-verify'    // Before VERIFY — setup context
  | 'post-unify';   // After UNIFY — knowledge capture

/** All valid hook points as a readonly array for runtime validation. */
export const HOOK_POINTS: readonly HookPoint[] = [
  'init-scan',
  'pre-specify',
  'pre-plan',
  'post-plan',
  'pre-build',
  'post-task',
  'post-build',
  'pre-verify',
  'post-unify',
] as const;

/** Severity levels for module findings, from lowest to highest. */
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Numeric ordering of severity levels for threshold comparison.
 * Higher number = more severe. Used by the dispatcher to check
 * whether a finding exceeds a module's block threshold.
 */
export const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
} as const;

/** All valid severity values as a readonly array for runtime validation. */
export const SEVERITY_VALUES: readonly FindingSeverity[] = [
  'info',
  'low',
  'medium',
  'high',
  'critical',
] as const;

/**
 * A single module hook registration.
 * Maps a module to a specific lifecycle hook point with ordering priority.
 */
export interface ModuleHook {
  /** Which lifecycle hook this registration targets. */
  hookPoint: HookPoint;
  /** Execution priority — lower runs first when multiple modules share a hook. */
  priority: number;
  /** Path to the markdown prompt file for this hook, relative to promptsDir. */
  promptFile: string;
}

/**
 * Complete definition of a module.
 * Combines identity, hook registrations, and runtime configuration.
 */
export interface ModuleDefinition {
  /** Unique module identifier (e.g., "security", "tdd"). */
  name: string;
  /** Human-readable domain description (e.g., "Security Patterns"). */
  domain: string;
  /** Semantic version of the module definition. */
  version: string;
  /** Hook registrations — which lifecycle points this module participates in. */
  hooks: ModuleHook[];
  /**
   * Findings at or above this severity block phase advancement.
   * Use 'none' for advisory-only modules that should never block.
   */
  blockThreshold: FindingSeverity | 'none';
  /** Whether this module is active for the current project. */
  enabled: boolean;
}

/**
 * A single structured finding produced by a module.
 * The LLM does the analysis; the finding captures the evidence.
 */
export interface Finding {
  /** Which module produced this finding. */
  module: string;
  /** What was checked (e.g., "hardcoded secrets scan"). */
  check: string;
  /** Severity level of the finding. */
  severity: FindingSeverity;
  /** What was found (the actual finding text). */
  finding: string;
  /** At which hook point this was produced. */
  hookPoint?: HookPoint;
  /** Affected file path, if applicable. */
  file?: string;
  /** What must be true for this finding to matter — enables fast false-positive resolution. */
  assumption?: string;
  /** Suggested fix or remediation. */
  recommendation?: string;
  /** Supporting evidence (code snippet, command output, etc.). */
  evidence?: string;
}

/**
 * Result of running all module hooks at a given hook point.
 * Aggregates findings from all modules and reports block status.
 */
export interface HookResult {
  /** Which hook point these results are for. */
  hookPoint: HookPoint;
  /** All findings collected from all modules at this hook point. */
  findings: Finding[];
  /** Whether any finding exceeds its module's block threshold. */
  blocked: boolean;
  /** Human-readable explanations for each blocking finding. */
  blockReasons: string[];
  /** ISO timestamp when the hook was executed. */
  timestamp: string;
}

/**
 * Per-module configuration in coda.json.
 * Allows projects to enable/disable modules and override thresholds.
 */
export interface ModuleConfig {
  /** Whether this module is active. */
  enabled: boolean;
  /** Override the module's default block threshold for this project. */
  blockThreshold?: FindingSeverity | 'none';
}
