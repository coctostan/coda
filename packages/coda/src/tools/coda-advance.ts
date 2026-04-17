/**
 * @module tools/coda-advance
 * Request a phase transition for the focused issue.
 *
 * Gathers gate data from mdbase records, passes it to the
 * state engine's transition function, and updates both the
 * issue record and state.json on success.
 */
import {
  createRegistry,
  readRecord,
  updateFrontmatter,
  transition,
  loadState,
  persistState,
} from '@coda/core';
import type {
  CodaState,
  CompletionRecord,
  FindingSeverity,
  GateCheckData,
  HookPoint,
  IssueRecord,
  Phase,
  PlanRecord,
  RegistryConfig,
} from '@coda/core';
import { basename, join } from 'path';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { isLoopExhausted } from '../../../core/src/state/machine';
import type { LoopIterationConfig } from '../../../core/src/state/types';
import { codaEditBody } from './coda-edit-body';
import type { AdvanceInput, AdvanceResult } from './types';
import { sortByNumericSuffix } from './sort-utils';
import { resolveGateMode, shouldRequireHuman } from '../workflow/gate-automation';
import type { GateMode } from '../workflow/gate-automation';
import type { CodaConfig } from '../forge/types';
import { loadCodaConfig } from './coda-config';
import { getCeremonyRules } from '../workflow/ceremony';

type PersistedHookResult = {
  hookPoint?: string;
  blockReasons?: string[];
};

function getLatestPersistedHookResults(hookResults: PersistedHookResult[]): PersistedHookResult[] {
  const latestByHookPoint = new Map<string, PersistedHookResult>();

  for (const hookResult of hookResults) {
    if (!hookResult.hookPoint) {
      continue;
    }

    latestByHookPoint.set(hookResult.hookPoint, hookResult);
  }

  return [...latestByHookPoint.values()];
}

/**
 * Find the completion record file path for a given issue slug.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @returns Absolute path to the completion record, or null if not found
 */
export function findCompletionRecordPath(codaRoot: string, issueSlug: string): string | null {
  const recordsDir = join(codaRoot, 'records');
  if (!existsSync(recordsDir)) {
    return null;
  }

  const completionFiles = readdirSync(recordsDir)
    .filter((file) => file.endsWith('.md'));
  const matchingFile = completionFiles.find((file) => file.includes(issueSlug));
  return matchingFile ? join(recordsDir, matchingFile) : null;
}

/**
 * Gather gate check data from the issue's mdbase records.
 * Also extracts the issue type for gate automation resolution.
 */
function gatherGateData(
  codaRoot: string,
  issueSlug: string
): { gateData: GateCheckData; issueType: string } {
  const issuePath = join(codaRoot, 'issues', `${issueSlug}.md`);
  const issueDir = join(codaRoot, 'issues', issueSlug);
  const data: GateCheckData = {};
  let issueType = 'feature'; // fallback
  if (existsSync(issuePath)) {
    const { frontmatter } = readRecord<IssueRecord>(issuePath);
    data.issueAcCount = frontmatter.acceptance_criteria.length;
    data.humanReviewRequired = frontmatter.human_review;
    data.allAcsMet = frontmatter.acceptance_criteria.length > 0
      && frontmatter.acceptance_criteria.every((ac) => ac.status === 'met');
    issueType = frontmatter.issue_type ?? 'feature';
  }
  const planPath = getLatestPlanPath(codaRoot, issueSlug);
  if (planPath) {
    const { frontmatter } = readRecord<PlanRecord>(planPath);
    data.planExists = true;
    data.planApproved = frontmatter.status === 'approved';
    data.humanReviewStatus = frontmatter.human_review_status;
    if (frontmatter.task_count !== undefined) {
      const tasksDir = join(issueDir, 'tasks');
      if (existsSync(tasksDir)) {
        const taskFiles = readdirSync(tasksDir)
          .filter((file) => file.endsWith('.md'))
          .map((file) => join(tasksDir, file));
        const completeTasks = taskFiles.filter((taskPath) => {
          const { frontmatter: task } = readRecord<Record<string, unknown>>(taskPath);
          return task['status'] === 'complete';
        });
        data.allPlannedTasksComplete = completeTasks.length >= frontmatter.task_count;
      } else {
        data.allPlannedTasksComplete = frontmatter.task_count === 0;
      }
    }
  } else {
    data.planExists = false;
  }
  // Module block findings — read from persisted findings (Phase 24 creates the file).
  // Only the latest result for each hook point should affect gates.
  const findingsPath = join(codaRoot, 'issues', issueSlug, 'module-findings.json');
  if (existsSync(findingsPath)) {
    try {
      const findingsData = JSON.parse(readFileSync(findingsPath, 'utf-8')) as {
        hookResults?: PersistedHookResult[];
      };
      const blockCount = getLatestPersistedHookResults(findingsData.hookResults ?? [])
        .reduce((sum, hr) => sum + (hr.blockReasons?.length ?? 0), 0);
      data.moduleBlockFindings = blockCount;
    } catch {
      data.moduleBlockFindings = 0;
    }
  } else {
    data.moduleBlockFindings = 0;
  }
  const completionRecordPath = findCompletionRecordPath(codaRoot, issueSlug);
  data.completionRecordExists = Boolean(completionRecordPath);
  if (completionRecordPath) {
    try {
      const record = readRecord<CompletionRecord>(completionRecordPath);
      data.systemSpecUpdated = record.frontmatter.system_spec_updated === true;
      data.referenceDocsReviewed = record.frontmatter.reference_docs_reviewed === true;
      data.milestoneUpdated = record.frontmatter.milestone_updated === true;
      data.unifyReviewStatus = record.frontmatter.unify_review_status;
      const { artifacts, exemptions } = readArtifactFields(record.frontmatter);
      data.artifactsProduced = artifacts;
      data.artifactExemptions = exemptions;
    } catch {
      data.systemSpecUpdated = false;
      data.referenceDocsReviewed = false;
      data.milestoneUpdated = false;
    }
  }

  // Ceremony-derived booleans (kept in coda; gate stays dumb).
  const ceremony = getCeremonyRules(issueType);
  data.artifactEvidenceRequired = ceremony.unifyFull === true;
  if (ceremony.specDeltaRequired === true) {
    const issueFrontmatter = existsSync(issuePath)
      ? readRecord<IssueRecord>(issuePath).frontmatter
      : undefined;
    data.specDeltaPresent = Boolean(issueFrontmatter?.spec_delta);
  } else {
    data.specDeltaPresent = false;
  }
  data.codaRoot = codaRoot;
  return { gateData: data, issueType };
}

/**
 * Read artifacts_produced and exemptions from a completion record's
 * frontmatter with defensive defaults. Keeps optional-field handling
 * contained so gatherGateData stays readable.
 */
function readArtifactFields(frontmatter: CompletionRecord): {
  artifacts: { overlays: string[]; reference_docs: string[]; decisions: string[] };
  exemptions: { overlays?: string; reference_docs?: string; system_spec?: string } | undefined;
} {
  const ap = frontmatter.artifacts_produced;
  const artifacts = {
    overlays: Array.isArray(ap?.overlays) ? ap!.overlays : [],
    reference_docs: Array.isArray(ap?.reference_docs) ? ap!.reference_docs : [],
    decisions: Array.isArray(ap?.decisions) ? ap!.decisions : [],
  };
  const exemptions = frontmatter.exemptions ? { ...frontmatter.exemptions } : undefined;
  return { artifacts, exemptions };
}

/**
 * Request a phase transition for the focused issue.
 *
 * Gathers gate data from mdbase records, validates the transition
 * via the state engine, and updates both the issue frontmatter
 * and state.json on success.
 *
 * @param input - Target phase to transition to
 * @param codaRoot - Root path of the `.coda/` directory
 * @param statePath - Path to state.json
 * @returns AdvanceResult with transition outcome
 */
export function codaAdvance(
  input: AdvanceInput,
  codaRoot: string,
  statePath: string
): AdvanceResult {
  try {
    const state = loadState(statePath);
    if (!state) {
      return { success: false, error: 'No state found — run coda forge to initialize' };
    }

    if (!state.focus_issue) {
      return { success: false, error: 'No focus issue set — focus an issue first' };
    }

    const previousPhase = state.phase;
    const targetPhase = input.target_phase as Phase;

    if (state.phase === 'review' && targetPhase === 'build' && isPhaseLoopExhausted(codaRoot, state)) {
      const exhaustedReviewResult = handleExhaustedReviewApproval(codaRoot, statePath, state);
      if (exhaustedReviewResult) {
        return exhaustedReviewResult;
      }
    }

    if (state.phase === 'verify' && targetPhase === 'unify' && isPhaseLoopExhausted(codaRoot, state)) {
      return resumeVerifyAfterExhaustion(codaRoot, statePath, state);
    }

    if (state.phase === 'review' && targetPhase === 'build') {
      const humanReviewResult = handleHumanReviewDecision(input, codaRoot, statePath, state);
      if (humanReviewResult) {
        return humanReviewResult;
      }
    }

    // Handle UNIFY review decision before unify→done transition
    if (state.phase === 'unify' && targetPhase === 'done') {
      const unifyReviewResult = handleUnifyReviewDecision(input, codaRoot, state);
      if (unifyReviewResult) {
        return unifyReviewResult;
      }
    }

    // v0.4 does not tag persisted findings with a build iteration.
    // We treat the latest persisted post-build result as current for the active build loop.
    // Gate automation: build_review mode 'auto' skips both the precondition and the gate.
    const earlyConfig = loadCodaConfig(codaRoot);
    const earlyIssueType = getIssueType(codaRoot, state.focus_issue);
    const buildReviewMode: GateMode | undefined = (state.phase === 'build' && targetPhase === 'verify' && earlyConfig)
      ? resolveGateMode('build_review', earlyIssueType, earlyConfig)
      : undefined;

    if (
      state.phase === 'build'
      && targetPhase === 'verify'
      && buildReviewMode !== 'auto'
      && hasActiveModulesForHook(codaRoot, 'post-build')
      && !hasPersistedHookResult(codaRoot, state.focus_issue, 'post-build')
    ) {
      return {
        success: false,
        previous_phase: previousPhase ?? undefined,
        gate_name: 'module-findings',
        reason: 'Post-build module findings must be reported via coda_report_findings before advancing to verify',
      };
    }

    const { gateData, issueType } = gatherGateData(codaRoot, state.focus_issue);
    // Gate automation: plan_review (review→build)
    if (state.phase === 'review' && targetPhase === 'build' && earlyConfig) {
      const planReviewMode = resolveGateMode('plan_review', issueType, earlyConfig);
      gateData.humanReviewRequired = shouldRequireHuman(planReviewMode, false);
    }
    // Gate automation: build_review (build→verify)
    if (state.phase === 'build' && targetPhase === 'verify' && earlyConfig) {
      if (buildReviewMode === 'auto') {
        gateData.moduleBlockFindings = 0;
      } else if (buildReviewMode === 'human') {
        // human mode: always block as if there are findings
        gateData.moduleBlockFindings = Math.max(gateData.moduleBlockFindings ?? 0, 1);
      }
      // auto-unless-block: use existing moduleBlockFindings as-is
    }
    // Gate automation: unify_review (unify→done)
    if (state.phase === 'unify' && targetPhase === 'done' && earlyConfig) {
      const unifyReviewMode = resolveGateMode('unify_review', issueType, earlyConfig);
      if (unifyReviewMode === 'auto') {
        // Auto-approve: mutate completion record before gate check
        const recordPath = findCompletionRecordPath(codaRoot, state.focus_issue);
        if (recordPath) {
          const record = readRecord<CompletionRecord>(recordPath);
          if (record.frontmatter.unify_review_status === 'pending') {
            updateFrontmatter<CompletionRecord>(recordPath, { unify_review_status: 'approved' });
            gateData.unifyReviewStatus = 'approved';
          }
        }
      }
    }
    const result = transition(state, targetPhase, gateData);

    if (!result.success) {
      const gateMatch = result.error?.match(/Gate "([^"]+)"/);
      return {
        success: false,
        previous_phase: previousPhase ?? undefined,
        gate_name: gateMatch?.[1],
        reason: result.error,
      };
    }

    if (result.state) {
      if (result.state.phase) {
        updateIssuePhase(codaRoot, state.focus_issue, result.state.phase);
      }
      // Write state.json last because it is the authoritative lifecycle record.
      // If a frontmatter update succeeds but state persistence fails, the workflow
      // state remains unchanged instead of claiming a completed transition.
      persistState(result.state, statePath);
    }

    return {
      success: true,
      previous_phase: previousPhase ?? undefined,
      new_phase: targetPhase,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

function handleHumanReviewDecision(
  input: AdvanceInput,
  codaRoot: string,
  statePath: string,
  state: CodaState
): AdvanceResult | null {
  if (!state.focus_issue) {
    return { success: false, error: 'No focus issue set — focus an issue first' };
  }

  if (input.human_review_decision === 'changes-requested') {
    const reviewFeedback = input.review_feedback?.trim();
    if (!reviewFeedback) {
      return {
        success: false,
        previous_phase: state.phase ?? undefined,
        reason: 'Human review feedback is required when requesting changes',
      };
    }

    const planPath = getLatestPlanPath(codaRoot, state.focus_issue);
    if (!planPath) {
      return {
        success: false,
        previous_phase: state.phase ?? undefined,
        reason: `No plan found for issue ${state.focus_issue}`,
      };
    }

    const editResult = codaEditBody({
      record: join('issues', state.focus_issue, basename(planPath)),
      op: 'replace_section',
      section: 'Human Review',
      content: `Status: changes-requested\n\nFeedback:\n${reviewFeedback}`,
    }, codaRoot);

    if (!editResult.success) {
      return {
        success: false,
        previous_phase: state.phase ?? undefined,
        reason: editResult.error ?? 'Failed to capture human review feedback',
      };
    }

    updateFrontmatter<PlanRecord>(planPath, { human_review_status: 'changes-requested' });
    updateIssuePhase(codaRoot, state.focus_issue, 'review');
    // Write state.json last because it is the authoritative lifecycle record.
    persistState({
      ...state,
      phase: 'review',
      submode: 'revise',
      loop_iteration: 0,
    }, statePath);

    return {
      success: true,
      previous_phase: state.phase ?? undefined,
      new_phase: 'review',
    };
  }

  if (input.human_review_decision === 'approved') {
    const planPath = getLatestPlanPath(codaRoot, state.focus_issue);
    if (!planPath) {
      return {
        success: false,
        previous_phase: state.phase ?? undefined,
        reason: `No plan found for issue ${state.focus_issue}`,
      };
    }

    updateFrontmatter<PlanRecord>(planPath, { human_review_status: 'approved' });
  }

  return null;
}

function handleUnifyReviewDecision(
  input: AdvanceInput,
  codaRoot: string,
  state: CodaState
): AdvanceResult | null {
  if (!state.focus_issue) {
    return { success: false, error: 'No focus issue set — focus an issue first' };
  }

  if (input.unify_review_decision === 'changes-requested') {
    const feedback = input.unify_review_feedback?.trim();
    if (!feedback) {
      return {
        success: false,
        previous_phase: state.phase ?? undefined,
        reason: 'UNIFY review feedback is required when requesting changes',
      };
    }

    const recordPath = findCompletionRecordPath(codaRoot, state.focus_issue);
    if (!recordPath) {
      return {
        success: false,
        previous_phase: state.phase ?? undefined,
        reason: `No completion record found for issue ${state.focus_issue}`,
      };
    }

    // Capture feedback on the completion record via replace_section
    const recordsDir = join(codaRoot, 'records');
    const relativeRecordPath = recordPath.startsWith(recordsDir)
      ? join('records', recordPath.slice(recordsDir.length + 1))
      : recordPath;

    const editResult = codaEditBody({
      record: relativeRecordPath,
      op: 'replace_section',
      section: 'UNIFY Review',
      content: `Status: changes-requested\n\nFeedback:\n${feedback}`,
    }, codaRoot);

    if (!editResult.success) {
      return {
        success: false,
        previous_phase: state.phase ?? undefined,
        reason: editResult.error ?? 'Failed to capture UNIFY review feedback',
      };
    }

    updateFrontmatter<CompletionRecord>(recordPath, { unify_review_status: 'changes-requested' });

    return {
      success: true,
      previous_phase: state.phase ?? undefined,
      new_phase: 'unify',
    };
  }

  if (input.unify_review_decision === 'approved') {
    const recordPath = findCompletionRecordPath(codaRoot, state.focus_issue);
    if (!recordPath) {
      return {
        success: false,
        previous_phase: state.phase ?? undefined,
        reason: `No completion record found for issue ${state.focus_issue}`,
      };
    }

    updateFrontmatter<CompletionRecord>(recordPath, { unify_review_status: 'approved' });
    // Return null to let the normal gate check proceed — it will now pass
  }

  return null;
}
function handleExhaustedReviewApproval(
  codaRoot: string,
  statePath: string,
  state: CodaState
): AdvanceResult | null {
  if (!state.focus_issue) {
    return { success: false, error: 'No focus issue set — focus an issue first' };
  }

  const planPath = getLatestPlanPath(codaRoot, state.focus_issue);
  if (!planPath) {
    return {
      success: false,
      previous_phase: state.phase ?? undefined,
      reason: `No plan found for issue ${state.focus_issue}`,
    };
  }

  updateFrontmatter<PlanRecord>(planPath, {
    status: 'approved',
    human_review_status: 'approved',
  });

  const { gateData } = gatherGateData(codaRoot, state.focus_issue);
  const transitionResult = transition(state, 'build', gateData);
  if (!transitionResult.success || !transitionResult.state) {
    return {
      success: false,
      previous_phase: state.phase ?? undefined,
      reason: transitionResult.error ?? 'Failed to advance exhausted review to build',
    };
  }

  updateIssuePhase(codaRoot, state.focus_issue, 'build');
  // Write state.json last because it is the authoritative lifecycle record.
  persistState(transitionResult.state, statePath);
  return {
    success: true,
    previous_phase: state.phase ?? undefined,
    new_phase: 'build',
  };
}

function resumeVerifyAfterExhaustion(
  codaRoot: string,
  statePath: string,
  state: CodaState
): AdvanceResult {
  if (!state.focus_issue) {
    return { success: false, error: 'No focus issue set — focus an issue first' };
  }

  const nextState: CodaState = {
    ...state,
    phase: 'verify',
    submode: 'verify',
    loop_iteration: 0,
    current_task: null,
  };

  updateIssuePhase(codaRoot, state.focus_issue, 'verify');
  // Write state.json last because it is the authoritative lifecycle record.
  persistState(nextState, statePath);
  return {
    success: true,
    previous_phase: state.phase ?? undefined,
    new_phase: 'verify',
  };
}

function hasActiveModulesForHook(codaRoot: string, hookPoint: HookPoint): boolean {
  const registry = createRegistry(loadModuleRegistryConfig(codaRoot), '');
  return registry.getModulesForHook(hookPoint).length > 0;
}

function hasPersistedHookResult(codaRoot: string, issueSlug: string, hookPoint: HookPoint): boolean {
  const findingsPath = join(codaRoot, 'issues', issueSlug, 'module-findings.json');
  if (!existsSync(findingsPath)) {
    return false;
  }

  try {
    const findingsData = JSON.parse(readFileSync(findingsPath, 'utf-8')) as {
      hookResults?: PersistedHookResult[];
    };

    return getLatestPersistedHookResults(findingsData.hookResults ?? [])
      .some((hookResult) => hookResult.hookPoint === hookPoint);
  } catch {
    return false;
  }
}

function loadModuleRegistryConfig(codaRoot: string): RegistryConfig {
  const configPath = join(codaRoot, 'coda.json');
  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as {
      modules?: Record<string, { enabled?: boolean; blockThreshold?: string }>;
    };

    if (!raw.modules) {
      return {};
    }

    const modules = Object.fromEntries(
      Object.entries(raw.modules).map(([name, cfg]) => [
        name,
        {
          enabled: cfg.enabled !== false,
          ...(cfg.blockThreshold
            ? { blockThreshold: cfg.blockThreshold as FindingSeverity | 'none' }
            : {}),
        },
      ])
    ) as RegistryConfig['modules'];
    return { modules };
  } catch {
    return {};
  }
}

function resolveLoopConfig(codaRoot: string): LoopIterationConfig {
  const configPath = join(codaRoot, 'coda.json');
  if (!existsSync(configPath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(configPath, 'utf-8')) as LoopIterationConfig;
  } catch {
    return {};
  }
}

function isPhaseLoopExhausted(codaRoot: string, state: CodaState): boolean {
  return isLoopExhausted(state, resolveLoopConfig(codaRoot));
}

function getLatestPlanPath(codaRoot: string, issueSlug: string): string | null {
  const issueDir = join(codaRoot, 'issues', issueSlug);
  if (!existsSync(issueDir)) {
    return null;
  }

  const planFiles = sortByNumericSuffix(
    readdirSync(issueDir)
      .filter((file) => file.startsWith('plan-v') && file.endsWith('.md'))
  );
  const planFile = planFiles[planFiles.length - 1];

  return planFile ? join(issueDir, planFile) : null;
}

function updateIssuePhase(codaRoot: string, issueSlug: string, targetPhase: Phase): void {
  const issuePath = join(codaRoot, 'issues', `${issueSlug}.md`);
  if (existsSync(issuePath)) {
    updateFrontmatter<IssueRecord>(issuePath, { phase: targetPhase });
  }
}

// `loadCodaConfig` is imported from `./coda-config` (shared single source of
// truth, handles legacy human_review_default migration on load). Phase 55 dedupe.

/**
 * Extract the issue type from an issue record, or 'feature' as fallback.
 */
function getIssueType(codaRoot: string, issueSlug: string): string {
  const issuePath = join(codaRoot, 'issues', `${issueSlug}.md`);
  if (!existsSync(issuePath)) {
    return 'feature';
  }

  try {
    const { frontmatter } = readRecord<IssueRecord>(issuePath);
    return frontmatter.issue_type ?? 'feature';
  } catch {
    return 'feature';
  }
}