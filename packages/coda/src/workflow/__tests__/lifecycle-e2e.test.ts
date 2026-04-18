import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  createDefaultState,
  persistState,
  readRecord,
  updateFrontmatter,
  writeRecord,
} from '@coda/core';
import type {
  CompletionRecord,
  CodaState,
  IssueRecord,
  PlanRecord,
  TaskRecord,
} from '@coda/core';
import { appendToOverlay } from '../../../../core/src/modules/overlay';
import { codaAdvance } from '../../tools/coda-advance';
import { runVerifyRunner } from '../verify-runner';

let codaRoot: string;
let statePath: string;
const issueSlug = 'lifecycle-issue';

beforeEach(() => {
  codaRoot = mkdtempSync(join(tmpdir(), 'coda-lifecycle-e2e-'));
  statePath = join(codaRoot, 'state.json');
});

afterEach(() => {
  rmSync(codaRoot, { recursive: true, force: true });
});

function setupLifecycleFixture(): CodaState {
  mkdirSync(join(codaRoot, 'issues', issueSlug, 'tasks'), { recursive: true });

  writeRecord<IssueRecord>(
    join(codaRoot, 'issues', `${issueSlug}.md`),
    {
      title: 'Lifecycle Issue',
      issue_type: 'feature',
      status: 'active',
      phase: 'verify',
      priority: 3,
      topics: ['workflow'],
      acceptance_criteria: [{ id: 'AC-1', text: 'Lifecycle reaches done honestly', status: 'pending' }],
      open_questions: [],
      deferred_items: [],
      human_review: false,
    },
    '## Description\nExercise the reachable lifecycle path.\n'
  );

  writeRecord<PlanRecord>(
    join(codaRoot, 'issues', issueSlug, 'plan-v1.md'),
    {
      title: 'Lifecycle Plan',
      issue: issueSlug,
      status: 'approved',
      iteration: 1,
      task_count: 1,
      human_review_status: 'not-required',
    },
    '## Approach\nShip the minimal lifecycle fixture.\n'
  );

  writeRecord<TaskRecord>(
    join(codaRoot, 'issues', issueSlug, 'tasks', '01-complete-lifecycle.md'),
    {
      id: 1,
      issue: issueSlug,
      title: 'Complete lifecycle',
      status: 'complete',
      kind: 'planned',
      covers_ac: ['AC-1'],
      depends_on: [],
      files_to_modify: ['src/feature.ts'],
      truths: ['AC-1 should be satisfied when verification evidence is real'],
      artifacts: [],
      key_links: [],
    },
    '## Summary\nImplemented the feature path.\n'
  );

  writeFileSync(
    join(codaRoot, 'coda.json'),
    JSON.stringify(
      {
        tdd_test_command: 'bun test',
        full_suite_command: 'bun test',
        verification_commands: ['bun test'],
      },
      null,
      2
    ) + '\n',
    'utf-8'
  );

  const verifyState: CodaState = {
    ...createDefaultState(),
    focus_issue: issueSlug,
    phase: 'verify',
    submode: 'verify',
    completed_tasks: [1],
    last_test_exit_code: null,
  };
  persistState(verifyState, statePath);
  return verifyState;
}

function writeCompletionRecord(artifactsProduced: CompletionRecord['artifacts_produced']): void {
  mkdirSync(join(codaRoot, 'records'), { recursive: true });
  writeRecord<CompletionRecord>(
    join(codaRoot, 'records', `${issueSlug}-completion.md`),
    {
      title: 'Completion',
      issue: issueSlug,
      completed_at: '2026-04-18',
      topics: ['workflow'],
      system_spec_updated: true,
      reference_docs_reviewed: true,
      milestone_updated: true,
      unify_review_status: 'approved',
      artifacts_produced: artifactsProduced,
    },
    '## Summary\nDone.\n'
  );
}

function advanceToUnifyWithHonestVerify(): void {
  const verifyState = setupLifecycleFixture();
  const verifyResult = runVerifyRunner(codaRoot, issueSlug, verifyState, {
    verificationResult: {
      acResults: [{ acId: 'AC-1', status: 'met', sourceTasks: [1], relevantFiles: ['src/feature.ts'] }],
    },
    suitePassed: true,
  });

  expect(verifyResult.outcome).toBe('success');
  if (verifyResult.outcome !== 'success') {
    throw new Error('Expected honest VERIFY success');
  }

  persistState(verifyResult.state, statePath);

  const issue = readRecord<IssueRecord>(join(codaRoot, 'issues', `${issueSlug}.md`));
  expect(issue.frontmatter.acceptance_criteria[0]?.status).toBe('met');

  const unifyResult = codaAdvance({ target_phase: 'unify' }, codaRoot, statePath);
  expect(unifyResult.success).toBe(true);
  expect(unifyResult.new_phase).toBe('unify');
}

describe('lifecycle-e2e', () => {
  test('blocks VERIFY without explicit evidence and prevents verify→unify', () => {
    const verifyState = setupLifecycleFixture();
    const verifyResult = runVerifyRunner(codaRoot, issueSlug, verifyState);

    expect(verifyResult.outcome).toBe('corrections-required');
    if (verifyResult.outcome !== 'corrections-required') {
      throw new Error('Expected corrections-required outcome');
    }

    persistState(verifyResult.state, statePath);

    const failureArtifact = join(codaRoot, 'issues', issueSlug, 'verification-failures', 'AC-1.yaml');
    expect(existsSync(failureArtifact)).toBe(true);
    expect(readFileSync(failureArtifact, 'utf-8')).toContain('type: test_failure');

    const unifyResult = codaAdvance({ target_phase: 'unify' }, codaRoot, statePath);
    expect(unifyResult.success).toBe(false);
    expect(unifyResult.reason).toContain('All acceptance criteria must be met');
  });

  test('blocks UNIFY with empty artifacts after an honest verify→unify path', () => {
    advanceToUnifyWithHonestVerify();
    writeCompletionRecord({ overlays: [], reference_docs: [], decisions: [] });

    const doneResult = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(doneResult.success).toBe(false);
    expect(doneResult.reason).toContain('no compounding artifacts produced and no exemption declared');
  });

  test('advances unify→done when a real overlay exists on disk and is declared', () => {
    advanceToUnifyWithHonestVerify();
    writeCompletionRecord({ overlays: [], reference_docs: [], decisions: [] });

    const blockedResult = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(blockedResult.success).toBe(false);
    expect(blockedResult.reason).toContain('no compounding artifacts produced and no exemption declared');

    appendToOverlay(codaRoot, 'security', 'validated_patterns', 'Validated lifecycle evidence pattern.', 'test');
    updateFrontmatter<CompletionRecord>(join(codaRoot, 'records', `${issueSlug}-completion.md`), {
      artifacts_produced: {
        overlays: ['modules/security.local.md'],
        reference_docs: [],
        decisions: [],
      },
    });

    const doneResult = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(doneResult.success).toBe(true);
    expect(doneResult.new_phase).toBe('done');

    const issue = readRecord<IssueRecord>(join(codaRoot, 'issues', `${issueSlug}.md`));
    expect(issue.frontmatter.phase).toBe('done');
    expect(JSON.parse(readFileSync(statePath, 'utf-8')).phase).toBe('done');
  });
});
