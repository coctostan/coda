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
 * Gather gate check data from the issue's mdbase records.
 */
function gatherGateData(codaRoot: string, issueSlug: string): GateCheckData {
  const issuePath = join(codaRoot, 'issues', `${issueSlug}.md`);
  const issueDir = join(codaRoot, 'issues', issueSlug);

  const data: GateCheckData = {};

  if (existsSync(issuePath)) {
    const { frontmatter } = readRecord<IssueRecord>(issuePath);
    data.issueAcCount = frontmatter.acceptance_criteria.length;
    data.humanReviewRequired = frontmatter.human_review;
    data.allAcsMet = frontmatter.acceptance_criteria.length > 0
      && frontmatter.acceptance_criteria.every((ac) => ac.status === 'met');
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

  const recordsDir = join(codaRoot, 'records');
  if (existsSync(recordsDir)) {
    const completionFiles = readdirSync(recordsDir)
      .filter((file) => file.endsWith('.md'));
    const matchingFile = completionFiles.find((file) => file.includes(issueSlug));
    data.completionRecordExists = Boolean(matchingFile);

    if (matchingFile) {
      try {
        const record = readRecord<CompletionRecord>(join(recordsDir, matchingFile));
        data.systemSpecUpdated = record.frontmatter.system_spec_updated === true;
        data.referenceDocsReviewed = record.frontmatter.reference_docs_reviewed === true;
        data.milestoneUpdated = record.frontmatter.milestone_updated === true;
      } catch {
        data.systemSpecUpdated = false;
        data.referenceDocsReviewed = false;
        data.milestoneUpdated = false;
      }
    }
  } else {
    data.completionRecordExists = false;
  }

  return data;
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

    // v0.4 does not tag persisted findings with a build iteration.
    // We treat the latest persisted post-build result as current for the active build loop.
    if (
      state.phase === 'build'
      && targetPhase === 'verify'
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

    const gateData = gatherGateData(codaRoot, state.focus_issue);
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

  const gateData = gatherGateData(codaRoot, state.focus_issue);
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
