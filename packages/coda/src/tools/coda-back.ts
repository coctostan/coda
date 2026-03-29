import { loadState, persistState, readRecord, updateFrontmatter } from '@coda/core';
import type { CodaState, IssueRecord, Phase, PlanRecord } from '@coda/core';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import type { AdvanceResult, BackInput } from './types';

const PHASE_ORDER: Phase[] = ['specify', 'plan', 'review', 'build', 'verify', 'unify', 'done'];

export function codaBack(input: BackInput, codaRoot: string, statePath: string): AdvanceResult {
  const state = loadState(statePath);
  if (!state) {
    return { success: false, error: 'No state found — run coda forge to initialize' };
  }

  if (!state.focus_issue || !state.phase) {
    return { success: false, error: 'No focus issue set — focus an issue first' };
  }

  const targetPhase = input.target_phase as Phase;
  if (!isPriorPhase(targetPhase, state.phase)) {
    return {
      success: false,
      previous_phase: state.phase,
      reason: `Target phase must be a prior phase. Current: ${state.phase}, requested: ${targetPhase}`,
    };
  }

  const planPath = getLatestPlanPath(codaRoot, state.focus_issue);
  if (planPath) {
    if (targetPhase === 'specify' || targetPhase === 'plan') {
      updateFrontmatter<PlanRecord>(planPath, { status: 'superseded' });
    } else if (targetPhase === 'review') {
      updateFrontmatter<PlanRecord>(planPath, { status: 'draft' });
    }
  }

  updateIssueForBack(codaRoot, state.focus_issue, targetPhase);
  const nextState = buildRewoundState(state, targetPhase);
  persistState(nextState, statePath);

  return {
    success: true,
    previous_phase: state.phase,
    new_phase: targetPhase,
  };
}

function buildRewoundState(state: CodaState, targetPhase: Phase): CodaState {
  if (targetPhase === 'review') {
    return {
      ...state,
      phase: 'review',
      submode: 'review',
      loop_iteration: 0,
      current_task: null,
    };
  }

  if (targetPhase === 'build') {
    return {
      ...state,
      phase: 'build',
      submode: null,
      loop_iteration: 0,
      current_task: 1,
      completed_tasks: [],
    };
  }

  if (targetPhase === 'verify') {
    return {
      ...state,
      phase: 'verify',
      submode: 'verify',
      loop_iteration: 0,
      current_task: null,
    };
  }

  return {
    ...state,
    phase: targetPhase,
    submode: null,
    loop_iteration: 0,
    current_task: null,
  };
}

function updateIssueForBack(codaRoot: string, issueSlug: string, targetPhase: Phase): void {
  const issuePath = join(codaRoot, 'issues', `${issueSlug}.md`);
  if (!existsSync(issuePath)) {
    return;
  }

  const issue = readRecord<IssueRecord>(issuePath);
  const acceptanceCriteria = targetPhase === 'specify'
    ? issue.frontmatter.acceptance_criteria.map((ac) => ({ ...ac, status: 'pending' as const }))
    : targetPhase === 'verify'
      ? issue.frontmatter.acceptance_criteria.map((ac) => ({ ...ac, status: 'pending' as const }))
      : issue.frontmatter.acceptance_criteria;

  updateFrontmatter<IssueRecord>(issuePath, {
    phase: targetPhase,
    acceptance_criteria: acceptanceCriteria,
  });
}

function isPriorPhase(targetPhase: Phase, currentPhase: Phase): boolean {
  return PHASE_ORDER.indexOf(targetPhase) >= 0 && PHASE_ORDER.indexOf(targetPhase) < PHASE_ORDER.indexOf(currentPhase);
}

function getLatestPlanPath(codaRoot: string, issueSlug: string): string | null {
  const issueDir = join(codaRoot, 'issues', issueSlug);
  if (!existsSync(issueDir)) {
    return null;
  }

  const planFiles = readdirSync(issueDir)
    .filter((file) => file.startsWith('plan-v') && file.endsWith('.md'))
    .sort();
  const planFile = planFiles[planFiles.length - 1];
  return planFile ? join(issueDir, planFile) : null;
}
