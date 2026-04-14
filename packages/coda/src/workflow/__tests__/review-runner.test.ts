import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { readRecord, writeRecord } from '@coda/core';
import type { CodaState, IssueRecord, PlanRecord, TaskRecord } from '@coda/core';
import { runReviewRunner } from '../review-runner';

function createReviewState(overrides: Partial<CodaState> = {}): CodaState {
  return {
    version: 1,
    focus_issue: 'my-feature',
    phase: 'review',
    submode: 'review',
    loop_iteration: 0,
    current_task: null,
    completed_tasks: [],
    tdd_gate: 'locked',
    last_test_exit_code: null,
    task_tool_calls: 0,
    enabled: true,
    ...overrides,
  };
}

describe('Review Runner', () => {
  let tempDir: string;
  let codaRoot: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'coda-review-runner-'));
    codaRoot = join(tempDir, '.coda');

    mkdirSync(join(codaRoot, 'issues', 'my-feature', 'tasks'), { recursive: true });

    const issueFrontmatter: IssueRecord = {
      title: 'My Feature',
      issue_type: 'feature',
      status: 'active',
      phase: 'review',
      milestone: 'v0.2',
      priority: 3,
      branch: 'feature/my-feature',
      current_task: 1,
      topics: ['workflow'],
      acceptance_criteria: [
        { id: 'AC-1', text: 'Plan has full AC coverage', status: 'pending' },
        { id: 'AC-2', text: 'Review loop writes revision instructions', status: 'pending' },
      ],
      open_questions: [],
      deferred_items: [],
      human_review: false,
    };

    writeRecord(join(codaRoot, 'issues', 'my-feature.md'), issueFrontmatter, '## Description\nReview the plan.\n');

    const planFrontmatter: PlanRecord = {
      title: 'Implementation Plan',
      issue: 'my-feature',
      status: 'in-review',
      iteration: 1,
      task_count: 2,
      human_review_status: 'not-required',
    };

    writeRecord(join(codaRoot, 'issues', 'my-feature', 'plan-v1.md'), planFrontmatter, '## Approach\nBuild review automation.\n');

    const taskOne: TaskRecord = {
      id: 1,
      issue: 'my-feature',
      title: 'Cover AC-1',
      status: 'pending',
      kind: 'planned',
      covers_ac: ['AC-1'],
      depends_on: [],
      files_to_modify: ['packages/coda/src/workflow/review-runner.ts'],
      truths: ['Use deterministic checks'],
      artifacts: [],
      key_links: [],
    };

    const taskTwo: TaskRecord = {
      id: 2,
      issue: 'my-feature',
      title: 'Cover AC-2',
      status: 'pending',
      kind: 'planned',
      covers_ac: ['AC-2'],
      depends_on: [1],
      files_to_modify: ['packages/coda/src/workflow/phase-runner.ts'],
      truths: ['Keep workflow scope narrow'],
      artifacts: [],
      key_links: [],
    };

    writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '01-cover-ac-1.md'), taskOne, 'Implement the first slice.\n');
    writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '02-cover-ac-2.md'), taskTwo, 'Implement the second slice.\n');

    writeFileSync(join(codaRoot, 'coda.json'), JSON.stringify({ max_review_iterations: 3 }, null, 2));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('writes revision instructions and transitions to revise when structural checks fail', () => {
    const badTask: TaskRecord = {
      id: 2,
      issue: 'my-feature',
      title: 'Broken task',
      status: 'pending',
      kind: 'planned',
      covers_ac: [],
      depends_on: [3],
      files_to_modify: ['/tmp/not-in-repo.ts'],
      truths: [],
      artifacts: [],
      key_links: [],
    };

    writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '02-cover-ac-2.md'), badTask, 'Broken plan details.\n');

    const result = runReviewRunner(codaRoot, 'my-feature', createReviewState());
    expect(result.outcome).toBe('revise-required');
    if (result.outcome !== 'revise-required') throw new Error('Expected revise-required outcome');

    expect(result.state.submode).toBe('revise');
    expect(result.issues.length).toBe(3);

    const instructionsPath = join(codaRoot, 'issues', 'my-feature', 'revision-instructions.md');
    expect(existsSync(instructionsPath)).toBe(true);

    const record = readRecord<{ iteration: number; issues_found: number }>(instructionsPath);
    expect(record.frontmatter.iteration).toBe(1);
    expect(record.frontmatter.issues_found).toBe(3);
    expect(record.body).toContain('AC-2 not covered by any task');
    expect(record.body).toContain('depends on task 3');
    expect(record.body).toContain('/tmp/not-in-repo.ts');
  });

  test('handles tasks that omit optional array fields without crashing', () => {
    // Simulate a task created by an LLM that omits depends_on, files_to_modify, etc.
    const minimalFrontmatter = {
      id: 1,
      issue: 'my-feature',
      title: 'Minimal task',
      status: 'pending' as const,
      kind: 'planned' as const,
      covers_ac: ['AC-1'],
      // depends_on, files_to_modify, truths, artifacts, key_links intentionally omitted
    };

    writeRecord(
      join(codaRoot, 'issues', 'my-feature', 'tasks', '01-cover-ac-1.md'),
      minimalFrontmatter,
      'A minimal task.\n'
    );
    writeRecord(
      join(codaRoot, 'issues', 'my-feature', 'tasks', '02-cover-ac-2.md'),
      { ...minimalFrontmatter, id: 2, covers_ac: ['AC-2'] },
      'Another minimal task.\n'
    );

    const result = runReviewRunner(codaRoot, 'my-feature', createReviewState());
    // Should complete without throwing — the exact outcome depends on structural checks
    expect(['approved', 'revise-required', 'pending-human-review']).toContain(result.outcome);
  });

  test('approves the plan immediately when human review is not required', () => {
    writeFileSync(join(codaRoot, 'coda.json'), JSON.stringify({
      gates: {
        plan_review: 'auto',
        build_review: 'auto-unless-block',
        unify_review: 'human',
      },
    }, null, 2));
    const result = runReviewRunner(codaRoot, 'my-feature', createReviewState(), {
      reviewResult: { approved: true },
    });

    expect(result.outcome).toBe('approved');
    if (result.outcome !== 'approved') throw new Error('Expected approved outcome');

    const plan = readRecord<PlanRecord>(join(codaRoot, 'issues', 'my-feature', 'plan-v1.md'));
    expect(plan.frontmatter.status).toBe('approved');
    expect(plan.frontmatter.human_review_status).toBe('not-required');
    expect(result.issues).toEqual([]);
    expect(existsSync(join(codaRoot, 'issues', 'my-feature', 'revision-instructions.md'))).toBe(false);
  });

  test('persists pending human review when autonomous review approves a required plan', () => {
    writeFileSync(join(codaRoot, 'coda.json'), JSON.stringify({
      gates: {
        plan_review: 'human',
        build_review: 'auto-unless-block',
        unify_review: 'human',
      },
    }, null, 2));
    const issue = readRecord<IssueRecord>(join(codaRoot, 'issues', 'my-feature.md'));
    writeRecord(join(codaRoot, 'issues', 'my-feature.md'), {
      ...issue.frontmatter,
      human_review: true,
    }, issue.body);

    const result = runReviewRunner(codaRoot, 'my-feature', createReviewState(), {
      reviewResult: { approved: true },
    });

    expect(result.outcome).toBe('approved');
    if (result.outcome !== 'approved') throw new Error('Expected approved outcome');

    const plan = readRecord<PlanRecord>(join(codaRoot, 'issues', 'my-feature', 'plan-v1.md'));
    expect(plan.frontmatter.status).toBe('approved');
    expect(plan.frontmatter.human_review_status).toBe('pending');
    expect(result.issues).toEqual([]);
    expect(existsSync(join(codaRoot, 'issues', 'my-feature', 'revision-instructions.md'))).toBe(false);
  });

  test('returns to review from revise and increments loop iteration exactly once', () => {
    writeFileSync(
      join(codaRoot, 'issues', 'my-feature', 'revision-instructions.md'),
      '---\niteration: 1\nissues_found: 1\n---\n## Issue 1: tighten the plan\n**Fix:** add clearer steps.\n',
      'utf-8'
    );

    const result = runReviewRunner(codaRoot, 'my-feature', createReviewState({
      submode: 'revise',
      loop_iteration: 0,
    }));

    expect(result.outcome).toBe('review-ready');
    if (result.outcome !== 'review-ready') throw new Error('Expected review-ready outcome');

    expect(result.state.submode).toBe('review');
    expect(result.state.loop_iteration).toBe(1);
  });

  test('archives prior revision instructions into history before writing a new iteration', () => {
    writeFileSync(
      join(codaRoot, 'issues', 'my-feature', 'revision-instructions.md'),
      '---\niteration: 1\nissues_found: 1\n---\n## Issue 1: old feedback\n**Fix:** keep history.\n',
      'utf-8'
    );

    const brokenTask: TaskRecord = {
      id: 1,
      issue: 'my-feature',
      title: 'Broken task',
      status: 'pending',
      kind: 'planned',
      covers_ac: [],
      depends_on: [],
      files_to_modify: ['../outside.ts'],
      truths: [],
      artifacts: [],
      key_links: [],
    };

    writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '01-cover-ac-1.md'), brokenTask, 'Needs revision.\n');

    const result = runReviewRunner(codaRoot, 'my-feature', createReviewState({ loop_iteration: 1 }));
    expect(result.outcome).toBe('revise-required');
    if (result.outcome !== 'revise-required') throw new Error('Expected revise-required outcome');

    const historyPath = join(codaRoot, 'issues', 'my-feature', 'revision-history', 'iteration-1.md');
    expect(existsSync(historyPath)).toBe(true);
    expect(readFileSync(historyPath, 'utf-8')).toContain('old feedback');

    const current = readRecord<{ iteration: number; issues_found: number }>(
      join(codaRoot, 'issues', 'my-feature', 'revision-instructions.md')
    );
    expect(current.frontmatter.iteration).toBe(2);
  });

  test('returns exhausted when loop iteration has reached the configured limit', () => {
    const instructionsPath = join(codaRoot, 'issues', 'my-feature', 'revision-instructions.md');
    writeFileSync(
      instructionsPath,
      '---\niteration: 3\nissues_found: 1\n---\n## Issue 1: unresolved\n**Fix:** human follow-up.\n',
      'utf-8'
    );

    const result = runReviewRunner(codaRoot, 'my-feature', createReviewState({
      submode: 'revise',
      loop_iteration: 3,
    }));

    expect(result.outcome).toBe('exhausted');
    if (result.outcome !== 'exhausted') throw new Error('Expected exhausted outcome');

    expect(result.state.submode).toBe('revise');
    expect(result.revisionInstructionsPath).toBe(instructionsPath);
    expect(readFileSync(instructionsPath, 'utf-8')).toContain('unresolved');
  });

  test('returns exhausted review issues from the current instructions so humans can act on them', () => {
    const instructionsPath = join(codaRoot, 'issues', 'my-feature', 'revision-instructions.md');
    writeFileSync(
      instructionsPath,
      '---\niteration: 3\nissues_found: 2\n---\n## Issue 1: unresolved coverage\nAC-2 still has no owner.\n**Fix:** assign coverage.\n\n## Issue 2: dependency order\nTask 2 still depends on a later task.\n**Fix:** reorder dependencies.\n',
      'utf-8'
    );

    const result = runReviewRunner(codaRoot, 'my-feature', createReviewState({
      submode: 'revise',
      loop_iteration: 3,
    }));

    expect(result.outcome).toBe('exhausted');
    if (result.outcome !== 'exhausted') throw new Error('Expected exhausted outcome');

    expect(result.issues).toHaveLength(2);
    expect(result.issues[0]?.title).toContain('unresolved coverage');
    expect(result.issues[1]?.details).toContain('later task');
    expect(result.revisionInstructionsPath).toBe(instructionsPath);
  });
});
