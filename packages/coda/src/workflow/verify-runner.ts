/**
 * @module workflow/verify-runner
 * VERIFY ↔ CORRECT loop orchestration for Phase 11.
 */
import { readRecord, updateFrontmatter, writeRecord } from '@coda/core';
import type { CodaState, IssueRecord, TaskRecord } from '@coda/core';
import type { LoopIterationConfig } from '../../../core/src/state/types';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { isLoopExhausted, transitionSubmode } from '../../../core/src/state/machine';
import { loadIssue, loadTasks } from './context-builder';
import type {
  VerificationFailureArtifact,
  VerifyAcResult,
  VerifyRunnerOptions,
  VerifyRunnerOutcome,
} from './types';

/**
 * Execute one step of the verify/correct loop.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - Active issue slug
 * @param state - Current verify-phase state
 * @param options - Loop config and optional verification results
 * @returns Explicit outcome describing the next verify-loop state
 */
export function runVerifyRunner(
  codaRoot: string,
  issueSlug: string,
  state: CodaState,
  options: VerifyRunnerOptions = {}
): VerifyRunnerOutcome {
  if (state.phase !== 'verify') {
    throw new Error(`Verify runner requires verify phase, received ${String(state.phase)}`);
  }

  const config = resolveLoopConfig(codaRoot, options);
  const failureArtifacts = getFailureArtifactPaths(codaRoot, issueSlug);

  if (isLoopExhausted(state, config)) {
    return {
      outcome: 'exhausted',
      state,
      failureArtifacts,
    };
  }

  if (state.submode === 'correct') {
    return {
      outcome: 'verify-ready',
      state: {
        ...transitionSubmode(state, 'verify'),
        current_task: null,
      },
    };
  }

  if (state.submode !== 'verify') {
    throw new Error(`Verify runner requires verify or correct submode, received ${String(state.submode)}`);
  }

  const explicitAcResults = options.verificationResult?.acResults ?? [];
  const suiteEvidence = resolveSuiteEvidence(options, state);
  const acResults = normalizeAcResults(codaRoot, issueSlug, explicitAcResults, suiteEvidence.suitePassed);
  let failures = acResults.filter((result) => result.status === 'not-met').map(toFailureArtifact);
  if (explicitAcResults.length === 0 && suiteEvidence.shouldSynthesizeFailure) {
    failures = synthesizeMissingVerificationEvidence(acResults, suiteEvidence.failureDetail);
  } else if (failures.length === 0 && suiteEvidence.suitePassed === false) {
    failures = synthesizeSuiteFailure(acResults);
  }

  persistAcceptanceCriterionStatuses(codaRoot, issueSlug, acResults);

  if (failures.length === 0) {
    return {
      outcome: 'success',
      state: {
        ...state,
        current_task: null,
      },
      failureArtifacts: [],
      correctionTasks: [],
    };
  }

  const tasks = loadTasks(codaRoot, issueSlug).map((task) => task.frontmatter);
  const artifactPaths = failures.map((failure) => writeVerificationFailureArtifact(codaRoot, issueSlug, failure));
  const correctionTasks = createCorrectionTasks(issueSlug, tasks, failures);
  writeCorrectionTasks(codaRoot, issueSlug, correctionTasks);

  const nextState = transitionSubmode(state, 'correct');

  return {
    outcome: 'corrections-required',
    state: {
      ...nextState,
      current_task: correctionTasks[0]?.id ?? null,
    },
    failures,
    failureArtifacts: artifactPaths,
    correctionTasks,
  };
}

function resolveLoopConfig(
  codaRoot: string,
  options: VerifyRunnerOptions
): LoopIterationConfig {
  const configPath = join(codaRoot, 'coda.json');
  if (!existsSync(configPath)) {
    return { max_verify_iterations: options.max_verify_iterations };
  }

  try {
    const parsed = JSON.parse(readFileSync(configPath, 'utf-8')) as { max_verify_iterations?: number };
    return {
      max_verify_iterations: options.max_verify_iterations ?? parsed.max_verify_iterations,
    };
  } catch {
    return { max_verify_iterations: options.max_verify_iterations };
  }
}

function resolveSuiteEvidence(
  options: VerifyRunnerOptions,
  state: CodaState
): { suitePassed: boolean | undefined; shouldSynthesizeFailure: boolean; failureDetail: string } {
  if (typeof options.suitePassed === 'boolean') {
    return {
      suitePassed: options.suitePassed,
      shouldSynthesizeFailure: false,
      failureDetail: 'Full regression suite failed or was not run during VERIFY',
    };
  }

  if (state.last_test_exit_code === 0) {
    return {
      suitePassed: true,
      shouldSynthesizeFailure: false,
      failureDetail: 'Full regression suite failed or was not run during VERIFY',
    };
  }

  return {
    suitePassed: undefined,
    shouldSynthesizeFailure: true,
    failureDetail: 'Full regression suite failed or was not run during VERIFY',
  };
}

function normalizeAcResults(
  codaRoot: string,
  issueSlug: string,
  explicitResults: VerifyAcResult[],
  suitePassed: boolean | undefined
  ): VerifyAcResult[] {
  const issue = loadIssue(codaRoot, issueSlug);
  const tasks = loadTasks(codaRoot, issueSlug).map((task) => task.frontmatter);
  const explicitById = new Map(explicitResults.map((result) => [result.acId, result]));
  if (!issue) return explicitResults;
  return issue.frontmatter.acceptance_criteria.map((ac) => {
    const explicit = explicitById.get(ac.id);
    if (explicit) {
      return {
        ...explicit,
        failedChecks: explicit.failedChecks ?? [],
      };
    }
    const sourceTasks = tasks.filter((task) => task.covers_ac.includes(ac.id));
    const hasCoverageEvidence = sourceTasks.length > 0 && suitePassed === true;

    return {
      acId: ac.id,
      status: hasCoverageEvidence ? 'met' : 'not-met',
      failedChecks: hasCoverageEvidence
        ? []
        : [{ type: 'coverage_missing', detail: 'AC not proven — explicit verification evidence required' }],
      sourceTasks: sourceTasks.map((task) => task.id),
      relevantFiles: uniqueStrings(sourceTasks.flatMap((task) => task.files_to_modify)),
    };
  });
}

function persistAcceptanceCriterionStatuses(
  codaRoot: string,
  issueSlug: string,
  acResults: VerifyAcResult[]
): void {
  const issuePath = join(codaRoot, 'issues', `${issueSlug}.md`);
  if (!existsSync(issuePath)) return;

  const issue = readRecord<IssueRecord>(issuePath);
  const resultById = new Map(acResults.map((result) => [result.acId, result.status]));
  const acceptanceCriteria = issue.frontmatter.acceptance_criteria.map((ac) => ({
    ...ac,
    status: resultById.get(ac.id) ?? ac.status,
  }));

  updateFrontmatter<IssueRecord>(issuePath, { acceptance_criteria: acceptanceCriteria });
}

function toFailureArtifact(result: VerifyAcResult): VerificationFailureArtifact {
  return {
    acId: result.acId,
    status: 'not-met',
    failedChecks: result.failedChecks ?? [],
    sourceTasks: result.sourceTasks,
    relevantFiles: result.relevantFiles,
  };
}

function synthesizeSuiteFailure(results: VerifyAcResult[]): VerificationFailureArtifact[] {
  if (results.length === 0) return [];
  return results.map((result) => ({
    acId: result.acId,
    status: 'not-met',
    failedChecks: [{ type: 'test_failure', detail: 'Full regression suite failed after verify reported all ACs met' }],
    sourceTasks: result.sourceTasks,
    relevantFiles: result.relevantFiles,
  }));
}

function synthesizeMissingVerificationEvidence(
  results: VerifyAcResult[],
  detail: string
): VerificationFailureArtifact[] {
  if (results.length === 0) return [];
  return results.map((result) => ({
    acId: result.acId,
    status: 'not-met',
    failedChecks: [{ type: 'test_failure', detail }],
    sourceTasks: result.sourceTasks,
    relevantFiles: result.relevantFiles,
  }));
}

function writeVerificationFailureArtifact(
  codaRoot: string,
  issueSlug: string,
  failure: VerificationFailureArtifact
): string {
  const dir = join(codaRoot, 'issues', issueSlug, 'verification-failures');
  mkdirSync(dir, { recursive: true });

  const path = join(dir, `${failure.acId}.yaml`);
  const lines: string[] = [
    `ac_id: ${failure.acId}`,
    `status: ${failure.status}`,
    'failed_checks:',
  ];

  for (const check of failure.failedChecks) {
    lines.push(`  - type: ${check.type}`);
    lines.push(`    detail: ${quoteIfNeeded(check.detail)}`);
  }

  lines.push(`source_tasks: [${failure.sourceTasks.join(', ')}]`);
  lines.push('relevant_files:');
  for (const file of failure.relevantFiles) {
    lines.push(`  - ${file}`);
  }

  writeFileSync(path, `${lines.join('\n')}\n`, 'utf-8');
  return path;
}

function createCorrectionTasks(
  issueSlug: string,
  existingTasks: TaskRecord[],
  failures: VerificationFailureArtifact[]
): TaskRecord[] {
  const nextIdStart = existingTasks.reduce((max, task) => Math.max(max, task.id), 0) + 1;

  return failures.map((failure, index) => {
    const id = nextIdStart + index;
    const sourceTasks = existingTasks.filter((task) => failure.sourceTasks.includes(task.id));

    return {
      id,
      issue: issueSlug,
      title: `Fix ${failure.acId}`,
      status: 'pending',
      kind: 'correction',
      fix_for_ac: failure.acId,
      covers_ac: [failure.acId],
      depends_on: [],
      files_to_modify: uniqueStrings(failure.relevantFiles),
      truths: uniqueStrings([
        `${failure.acId} criterion is satisfied after this fix`,
        ...sourceTasks.flatMap((task) => task.truths),
      ]),
      artifacts: sourceTasks.flatMap((task) => task.artifacts),
      key_links: sourceTasks.flatMap((task) => task.key_links),
    };
  });
}

function writeCorrectionTasks(codaRoot: string, issueSlug: string, tasks: TaskRecord[]): void {
  const taskDir = join(codaRoot, 'issues', issueSlug, 'tasks');
  mkdirSync(taskDir, { recursive: true });

  for (const task of tasks) {
    const path = join(taskDir, `${String(task.id).padStart(2, '0')}-${slugify(task.title)}.md`);
    const body = [
      `Repair ${task.fix_for_ac ?? 'the unmet acceptance criterion'}.`,
      '',
      'Use the verification failure artifact and source task summaries to scope the fix narrowly.',
    ].join('\n');
    writeRecord(path, task, `${body}\n`);
  }
}

function getFailureArtifactPaths(codaRoot: string, issueSlug: string): string[] {
  const dir = join(codaRoot, 'issues', issueSlug, 'verification-failures');
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((file) => file.endsWith('.yaml'))
    .sort()
    .map((file) => join(dir, file));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function quoteIfNeeded(value: string): string {
  return value.includes(':') || value.includes('—') ? JSON.stringify(value) : value;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
