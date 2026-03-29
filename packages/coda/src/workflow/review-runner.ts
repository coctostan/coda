/**
 * @module workflow/review-runner
 * REVIEW ↔ REVISE loop orchestration for Phase 10.
 */
import {
  readRecord,
  updateFrontmatter,
  writeRecord,
} from '@coda/core';
import type { CodaState, PlanRecord, TaskRecord } from '@coda/core';
import type { LoopIterationConfig } from '../../../core/src/state/types';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync } from 'fs';
import { join } from 'path';
import { isLoopExhausted, transitionSubmode } from '../../../core/src/state/machine';
import { loadIssue, loadPlan, loadTasks } from './context-builder';

/** A deterministic review issue emitted by structural checks or injected review feedback. */
export interface ReviewIssue {
  title: string;
  details: string;
  fix: string;
}

/** Optional review result from a later LLM-driven review pass. */
export interface ReviewDecision {
  approved: boolean;
  issues?: ReviewIssue[];
}

/** Options for running the review runner. */
export interface ReviewRunnerOptions {
  max_review_iterations?: number;
  reviewResult?: ReviewDecision;
}

/** Outcome when the runner approves the current plan. */
export interface ReviewApprovedOutcome {
  outcome: 'approved';
  state: CodaState;
  issues: ReviewIssue[];
}

/** Outcome when the runner writes revision instructions and enters revise mode. */
export interface ReviewReviseRequiredOutcome {
  outcome: 'revise-required';
  state: CodaState;
  issues: ReviewIssue[];
  revisionInstructionsPath: string;
}

/** Outcome when the runner finishes revise mode and returns to review. */
export interface ReviewReadyOutcome {
  outcome: 'review-ready';
  state: CodaState;
}

/** Outcome when the review loop has exhausted its configured budget. */
export interface ReviewExhaustedOutcome {
  outcome: 'exhausted';
  state: CodaState;
  issues: ReviewIssue[];
  revisionInstructionsPath: string | null;
}

/** Union of all review-runner outcomes. */
export type ReviewRunnerOutcome =
  | ReviewApprovedOutcome
  | ReviewReviseRequiredOutcome
  | ReviewReadyOutcome
  | ReviewExhaustedOutcome;

/**
 * Execute one step of the review/revise loop.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - Active issue slug
 * @param state - Current review-phase state
 * @param options - Loop config and optional review result
 * @returns Explicit outcome describing the next review-loop state
 */
export function runReviewRunner(
  codaRoot: string,
  issueSlug: string,
  state: CodaState,
  options: ReviewRunnerOptions = {}
): ReviewRunnerOutcome {
  if (state.phase !== 'review') {
    throw new Error(`Review runner requires review phase, received ${String(state.phase)}`);
  }

  const revisionInstructionsPath = getRevisionInstructionsPath(codaRoot, issueSlug);
  const config = resolveLoopConfig(codaRoot, options);

  if (isLoopExhausted(state, config)) {
    return {
      outcome: 'exhausted',
      state,
      issues: [],
      revisionInstructionsPath: existsSync(revisionInstructionsPath) ? revisionInstructionsPath : null,
    };
  }

  if (state.submode === 'revise') {
    return {
      outcome: 'review-ready',
      state: transitionSubmode(state, 'review'),
    };
  }

  if (state.submode !== 'review') {
    throw new Error(`Review runner requires review or revise submode, received ${String(state.submode)}`);
  }

  const structuralIssues = collectStructuralIssues(codaRoot, issueSlug);
  const reviewIssues = structuralIssues.length > 0
    ? structuralIssues
    : options.reviewResult?.approved === false
      ? options.reviewResult.issues ?? []
      : [];

  if (reviewIssues.length > 0) {
    archiveExistingRevisionInstructions(codaRoot, issueSlug, state.loop_iteration);
    writeRevisionInstructions(codaRoot, issueSlug, state.loop_iteration + 1, reviewIssues);
    return {
      outcome: 'revise-required',
      state: transitionSubmode(state, 'revise'),
      issues: reviewIssues,
      revisionInstructionsPath,
    };
  }

  if (options.reviewResult?.approved === false) {
    throw new Error('Rejected review results must include at least one issue.');
  }

  approvePlan(codaRoot, issueSlug);
  return {
    outcome: 'approved',
    state,
    issues: [],
  };
}

function resolveLoopConfig(
  codaRoot: string,
  options: ReviewRunnerOptions
): LoopIterationConfig {
  const configPath = join(codaRoot, 'coda.json');
  if (!existsSync(configPath)) {
    return { max_review_iterations: options.max_review_iterations };
  }

  try {
    const parsed = JSON.parse(readFileSync(configPath, 'utf-8')) as { max_review_iterations?: number };
    return {
      max_review_iterations: options.max_review_iterations ?? parsed.max_review_iterations,
    };
  } catch {
    return { max_review_iterations: options.max_review_iterations };
  }
}

function collectStructuralIssues(codaRoot: string, issueSlug: string): ReviewIssue[] {
  const issue = loadIssue(codaRoot, issueSlug);
  const tasks = loadTasks(codaRoot, issueSlug);
  const issues: ReviewIssue[] = [];

  if (issue) {
    const coveredAcs = new Set(tasks.flatMap((task) => task.frontmatter.covers_ac));
    for (const ac of issue.frontmatter.acceptance_criteria) {
      if (!coveredAcs.has(ac.id)) {
        issues.push({
          title: `${ac.id} not covered by any task`,
          details: `${ac.id} (\"${ac.text}\") is not in any task's covers_ac.`,
          fix: `Add covers_ac: [\"${ac.id}\"] to an existing task or create a new task that covers it.`,
        });
      }
    }
  }

  const taskIds = new Set(tasks.map((task) => task.frontmatter.id));
  for (const task of tasks) {
    issues.push(...collectDependencyIssues(task.frontmatter, taskIds));
    issues.push(...collectFileScopeIssues(task.frontmatter));
  }

  return issues;
}

function collectDependencyIssues(task: TaskRecord, taskIds: Set<number>): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  for (const dependencyId of task.depends_on) {
    if (!taskIds.has(dependencyId)) {
      issues.push({
        title: `Task ${String(task.id)} depends on task ${String(dependencyId)}, which does not exist`,
        details: `Task ${String(task.id)} (${task.title}) depends on task ${String(dependencyId)}, but no task with that id exists.`,
        fix: `Remove depends_on: [${String(dependencyId)}] or add the missing prerequisite task before task ${String(task.id)}.`,
      });
      continue;
    }

    if (dependencyId >= task.id) {
      issues.push({
        title: `Task ${String(task.id)} depends on task ${String(dependencyId)} out of order`,
        details: `Task ${String(task.id)} (${task.title}) depends on task ${String(dependencyId)}, which is not earlier in the plan.`,
        fix: `Restrict depends_on to earlier task ids so task ${String(task.id)} only depends on completed prerequisites.`,
      });
    }
  }

  return issues;
}

function collectFileScopeIssues(task: TaskRecord): ReviewIssue[] {
  return task.files_to_modify
    .filter((path) => isUnreasonableFileTarget(path))
    .map((path) => ({
      title: `Task ${String(task.id)} targets an unreasonable file path`,
      details: `Task ${String(task.id)} (${task.title}) includes file target \"${path}\", which is outside normal repo workflow scope.`,
      fix: 'Replace the file path with a repo-relative implementation target inside the intended package scope.',
    }));
}

function isUnreasonableFileTarget(path: string): boolean {
  return path.trim() === '' || path.startsWith('/') || path.startsWith('..') || path.includes('/../') || path.startsWith('.coda/');
}

function approvePlan(codaRoot: string, issueSlug: string): void {
  const planPath = getPlanPath(codaRoot, issueSlug);
  if (!planPath) {
    throw new Error(`No plan found for issue ${issueSlug}`);
  }

  updateFrontmatter<PlanRecord>(planPath, { status: 'approved' });
}

function getPlanPath(codaRoot: string, issueSlug: string): string | null {
  const issueDir = join(codaRoot, 'issues', issueSlug);
  if (!existsSync(issueDir)) return null;

  const latestPlan = loadPlan(codaRoot, issueSlug);
  if (!latestPlan) return null;

  const candidates = readdirSync(issueDir)
    .filter((file) => file.startsWith('plan-v') && file.endsWith('.md'))
    .sort();

  for (const candidate of candidates) {
    const path = join(issueDir, candidate);
    const record = readRecord<PlanRecord>(path);
    if (record.frontmatter.iteration === latestPlan.frontmatter.iteration) {
      return path;
    }
  }

  return null;
}

function archiveExistingRevisionInstructions(codaRoot: string, issueSlug: string, loopIteration: number): void {
  const revisionInstructionsPath = getRevisionInstructionsPath(codaRoot, issueSlug);
  if (!existsSync(revisionInstructionsPath)) return;

  const historyDir = join(codaRoot, 'issues', issueSlug, 'revision-history');
  mkdirSync(historyDir, { recursive: true });
  const historyPath = join(historyDir, `iteration-${String(loopIteration)}.md`);
  renameSync(revisionInstructionsPath, historyPath);
}

function writeRevisionInstructions(
  codaRoot: string,
  issueSlug: string,
  iteration: number,
  issues: ReviewIssue[]
): void {
  const revisionInstructionsPath = getRevisionInstructionsPath(codaRoot, issueSlug);
  const body = issues.map((issue, index) => {
    return [
      `## Issue ${String(index + 1)}: ${issue.title}`,
      issue.details,
      `**Fix:** ${issue.fix}`,
    ].join('\n');
  }).join('\n\n');

  writeRecord(revisionInstructionsPath, {
    iteration,
    issues_found: issues.length,
  }, `${body}\n`);
}

function getRevisionInstructionsPath(codaRoot: string, issueSlug: string): string {
  return join(codaRoot, 'issues', issueSlug, 'revision-instructions.md');
}
