import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { readRecord, writeRecord } from '@coda/core';
import type { CodaState, IssueRecord, TaskRecord } from '@coda/core';
import { runVerifyRunner } from '../verify-runner';

function createVerifyState(overrides: Partial<CodaState> = {}): CodaState {
  return {
    version: 1,
    focus_issue: 'my-feature',
    phase: 'verify',
    submode: 'verify',
    loop_iteration: 0,
    current_task: null,
    completed_tasks: [1, 2],
    tdd_gate: 'locked',
    last_test_exit_code: null,
    task_tool_calls: 0,
    enabled: true,
    ...overrides,
  };
}

describe('Verify Runner', () => {
  let tempDir: string;
  let codaRoot: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'coda-verify-runner-'));
    codaRoot = join(tempDir, '.coda');

    mkdirSync(join(codaRoot, 'issues', 'my-feature', 'tasks'), { recursive: true });
    mkdirSync(join(codaRoot, 'issues', 'my-feature', 'verification-failures'), { recursive: true });

    const issueFrontmatter: IssueRecord = {
      title: 'My Feature',
      issue_type: 'feature',
      status: 'active',
      phase: 'verify',
      milestone: 'v0.2',
      priority: 3,
      branch: 'feature/my-feature',
      current_task: 1,
      topics: ['workflow'],
      acceptance_criteria: [
        { id: 'AC-1', text: 'The happy path works', status: 'pending' },
        { id: 'AC-2', text: 'Persistence is wired correctly', status: 'pending' },
      ],
      open_questions: [],
      deferred_items: [],
      human_review: false,
    };

    writeRecord(join(codaRoot, 'issues', 'my-feature.md'), issueFrontmatter, '## Description\nVerify the workflow.\n');

    const taskOne: TaskRecord = {
      id: 1,
      issue: 'my-feature',
      title: 'Implement workflow core',
      status: 'complete',
      kind: 'planned',
      covers_ac: ['AC-1'],
      depends_on: [],
      files_to_modify: ['src/workflow.ts'],
      truths: ['Happy path is implemented'],
      artifacts: [{ path: 'src/workflow.ts', description: 'Workflow entrypoint' }],
      key_links: [{ from: 'src/workflow.ts', to: 'src/store.ts', via: 'uses persistence layer' }],
    };

    const taskTwo: TaskRecord = {
      id: 2,
      issue: 'my-feature',
      title: 'Implement persistence integration',
      status: 'complete',
      kind: 'planned',
      covers_ac: ['AC-2'],
      depends_on: [1],
      files_to_modify: ['src/store.ts', 'tests/store.test.ts'],
      truths: ['Persistence writes are durable'],
      artifacts: [{ path: 'src/store.ts', description: 'Persistence adapter' }],
      key_links: [{ from: 'src/workflow.ts', to: 'src/store.ts', via: 'saveTodo import' }],
    };

    writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '01-implement-workflow-core.md'), taskOne, '## Summary\nWorkflow core shipped.\n');
    writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '02-implement-persistence-integration.md'), taskTwo, '## Summary\nPersistence integration shipped.\n');

    writeFileSync(join(codaRoot, 'coda.json'), JSON.stringify({ max_verify_iterations: 3 }, null, 2));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('writes per-AC failure artifacts and correction tasks when verification finds unmet criteria', () => {
    const result = runVerifyRunner(codaRoot, 'my-feature', createVerifyState(), {
      verificationResult: {
        acResults: [
          { acId: 'AC-1', status: 'met', sourceTasks: [1], relevantFiles: ['src/workflow.ts'] },
          {
            acId: 'AC-2',
            status: 'not-met',
            sourceTasks: [2],
            relevantFiles: ['src/store.ts', 'tests/store.test.ts'],
            failedChecks: [
              { type: 'artifact_missing', detail: 'src/store.ts does not export saveTodo' },
              { type: 'test_failure', detail: 'tests/store.test.ts — saveTodo test fails with function not found' },
            ],
          },
        ],
      },
    });

    expect(result.outcome).toBe('corrections-required');
    if (result.outcome !== 'corrections-required') throw new Error('Expected corrections-required outcome');

    expect(result.state.submode).toBe('correct');
    expect(result.failures).toHaveLength(1);
    expect(result.failureArtifacts).toHaveLength(1);
    expect(result.correctionTasks).toHaveLength(1);

    const artifactPath = join(codaRoot, 'issues', 'my-feature', 'verification-failures', 'AC-2.yaml');
    expect(existsSync(artifactPath)).toBe(true);
    const artifactBody = readFileSync(artifactPath, 'utf-8');
    expect(artifactBody).toContain('ac_id: AC-2');
    expect(artifactBody).toContain('status: not-met');
    expect(artifactBody).toContain('type: artifact_missing');
    expect(artifactBody).toContain('source_tasks: [2]');
    expect(artifactBody).toContain('src/store.ts');

    const correctionTask = readRecord<TaskRecord>(join(codaRoot, 'issues', 'my-feature', 'tasks', '03-fix-ac-2.md'));
    expect(correctionTask.frontmatter.id).toBe(3);
    expect(correctionTask.frontmatter.kind).toBe('correction');
    expect(correctionTask.frontmatter.fix_for_ac).toBe('AC-2');
    expect(correctionTask.frontmatter.covers_ac).toEqual(['AC-2']);
    expect(correctionTask.frontmatter.files_to_modify).toEqual(['src/store.ts', 'tests/store.test.ts']);
  });

  test('handles tasks that omit optional array fields without crashing', () => {
    // Simulate tasks created by an LLM that omit covers_ac, depends_on, files_to_modify, etc.
    const minimalTask = {
      id: 1,
      issue: 'my-feature',
      title: 'Minimal task',
      status: 'complete' as const,
      kind: 'planned' as const,
      // covers_ac, depends_on, files_to_modify, truths, artifacts, key_links intentionally omitted
    };

    writeRecord(
      join(codaRoot, 'issues', 'my-feature', 'tasks', '01-implement-workflow-core.md'),
      minimalTask,
      '## Summary\nShipped.\n'
    );
    writeRecord(
      join(codaRoot, 'issues', 'my-feature', 'tasks', '02-implement-persistence-integration.md'),
      { ...minimalTask, id: 2 },
      '## Summary\nShipped.\n'
    );

    const result = runVerifyRunner(codaRoot, 'my-feature', createVerifyState());
    // Should complete without throwing
    expect(['corrections-required', 'success', 'verify-ready', 'exhausted']).toContain(result.outcome);
  });

  test('continues correction task numbering after existing correction ids', () => {
    const existingCorrection: TaskRecord = {
      id: 3,
      issue: 'my-feature',
      title: 'Fix: AC-legacy',
      status: 'complete',
      kind: 'correction',
      fix_for_ac: 'AC-legacy',
      covers_ac: ['AC-legacy'],
      depends_on: [],
      files_to_modify: ['src/legacy.ts'],
      truths: ['Legacy correction already applied'],
      artifacts: [],
      key_links: [],
    };

    writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '03-fix-ac-legacy.md'), existingCorrection, '## Summary\nLegacy correction complete.\n');

    const result = runVerifyRunner(codaRoot, 'my-feature', createVerifyState({ completed_tasks: [1, 2, 3] }), {
      verificationResult: {
        acResults: [
          {
            acId: 'AC-1',
            status: 'not-met',
            sourceTasks: [1],
            relevantFiles: ['src/workflow.ts'],
            failedChecks: [{ type: 'test_failure', detail: 'Workflow smoke test still fails' }],
          },
          {
            acId: 'AC-2',
            status: 'not-met',
            sourceTasks: [2],
            relevantFiles: ['src/store.ts'],
            failedChecks: [{ type: 'artifact_missing', detail: 'Persistence export missing' }],
          },
        ],
      },
    });

    expect(result.outcome).toBe('corrections-required');
    if (result.outcome !== 'corrections-required') throw new Error('Expected corrections-required outcome');

    expect(result.correctionTasks.map((task) => task.id)).toEqual([4, 5]);
    expect(readRecord<TaskRecord>(join(codaRoot, 'issues', 'my-feature', 'tasks', '04-fix-ac-1.md')).frontmatter.fix_for_ac).toBe('AC-1');
    expect(readRecord<TaskRecord>(join(codaRoot, 'issues', 'my-feature', 'tasks', '05-fix-ac-2.md')).frontmatter.fix_for_ac).toBe('AC-2');
  });

  test('returns verify-ready from correct submode and increments loop iteration exactly once', () => {
    const result = runVerifyRunner(codaRoot, 'my-feature', createVerifyState({ submode: 'correct', loop_iteration: 0 }));
    expect(result.outcome).toBe('verify-ready');
    if (result.outcome !== 'verify-ready') throw new Error('Expected verify-ready outcome');

    expect(result.state.submode).toBe('verify');
    expect(result.state.loop_iteration).toBe(1);
  });

  test('returns success when all criteria are met and the regression suite passes', () => {
    const result = runVerifyRunner(codaRoot, 'my-feature', createVerifyState(), {
      verificationResult: {
        acResults: [
          { acId: 'AC-1', status: 'met', sourceTasks: [1], relevantFiles: ['src/workflow.ts'] },
          { acId: 'AC-2', status: 'met', sourceTasks: [2], relevantFiles: ['src/store.ts'] },
        ],
      },
      suitePassed: true,
    });

    expect(result.outcome).toBe('success');
    if (result.outcome !== 'success') throw new Error('Expected success outcome');

    const issue = readRecord<IssueRecord>(join(codaRoot, 'issues', 'my-feature.md'));
    expect(issue.frontmatter.acceptance_criteria.map((ac) => ac.status)).toEqual(['met', 'met']);
    expect(result.failureArtifacts).toEqual([]);
    expect(result.correctionTasks).toEqual([]);
  });

  test('fails closed when tasks cover every AC but no explicit verification evidence is provided and last_test_exit_code is null', () => {
    const result = runVerifyRunner(codaRoot, 'my-feature', createVerifyState({ last_test_exit_code: null }));

    expect(result.outcome).toBe('corrections-required');
    if (result.outcome !== 'corrections-required') throw new Error('Expected corrections-required outcome');

    expect(result.failures).toHaveLength(2);
    expect(result.failures[0]?.failedChecks).toEqual([
      { type: 'test_failure', detail: 'Full regression suite failed or was not run during VERIFY' },
    ]);
    expect(readFileSync(join(codaRoot, 'issues', 'my-feature', 'verification-failures', 'AC-1.yaml'), 'utf-8')).toContain(
      'type: test_failure'
    );
  });

  test('fails closed when tasks cover every AC but the last test run failed', () => {
    const result = runVerifyRunner(codaRoot, 'my-feature', createVerifyState({ last_test_exit_code: 1 }));

    expect(result.outcome).toBe('corrections-required');
    if (result.outcome !== 'corrections-required') throw new Error('Expected corrections-required outcome');

    expect(result.failures).toHaveLength(2);
    expect(result.failures[0]?.failedChecks).toEqual([
      { type: 'test_failure', detail: 'Full regression suite failed or was not run during VERIFY' },
    ]);
  });

  test('explicit met AC results still fail when suitePassed is explicitly false', () => {
    const result = runVerifyRunner(codaRoot, 'my-feature', createVerifyState(), {
      verificationResult: {
        acResults: [
          { acId: 'AC-1', status: 'met', sourceTasks: [1], relevantFiles: ['src/workflow.ts'] },
          { acId: 'AC-2', status: 'met', sourceTasks: [2], relevantFiles: ['src/store.ts'] },
        ],
      },
      suitePassed: false,
    });

    expect(result.outcome).toBe('corrections-required');
    if (result.outcome !== 'corrections-required') throw new Error('Expected corrections-required outcome');

    expect(result.failures).toHaveLength(2);
    expect(result.failures[0]?.failedChecks).toEqual([
      { type: 'test_failure', detail: 'Full regression suite failed after verify reported all ACs met' },
    ]);
  });

  test('returns exhausted when the verify loop has reached its configured limit', () => {
    writeFileSync(
      join(codaRoot, 'issues', 'my-feature', 'verification-failures', 'AC-2.yaml'),
      ['ac_id: AC-2', 'status: not-met', 'failed_checks:', '  - type: test_failure', '    detail: still failing'].join('\n'),
      'utf-8'
    );

    const result = runVerifyRunner(codaRoot, 'my-feature', createVerifyState({ loop_iteration: 3 }));
    expect(result.outcome).toBe('exhausted');
    if (result.outcome !== 'exhausted') throw new Error('Expected exhausted outcome');

    expect(result.state.submode).toBe('verify');
    expect(result.failureArtifacts).toEqual([
      join(codaRoot, 'issues', 'my-feature', 'verification-failures', 'AC-2.yaml'),
    ]);
  });

  test('returns exhausted verify details from persisted failure artifacts so humans can recover cleanly', () => {
    writeFileSync(
      join(codaRoot, 'issues', 'my-feature', 'verification-failures', 'AC-1.yaml'),
      [
        'ac_id: AC-1',
        'status: not-met',
        'failed_checks:',
        '  - type: test_failure',
        '    detail: happy-path regression still fails',
        'source_tasks: [1]',
        'relevant_files:',
        '  - src/workflow.ts',
      ].join('\n'),
      'utf-8'
    );

    const result = runVerifyRunner(codaRoot, 'my-feature', createVerifyState({ loop_iteration: 3 }));
    expect(result.outcome).toBe('exhausted');
    if (result.outcome !== 'exhausted') throw new Error('Expected exhausted outcome');

    expect(result.failureArtifacts).toEqual([
      join(codaRoot, 'issues', 'my-feature', 'verification-failures', 'AC-1.yaml'),
    ]);
  });
});
