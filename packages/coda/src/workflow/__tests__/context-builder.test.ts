import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeRecord } from '@coda/core';
import {
  loadIssue,
  loadPlan,
  loadTasks,
  loadRefDocs,
  getPreviousTaskSummaries,
  loadRevisionInstructions,
  loadRevisionHistory,
  loadVerificationFailure,
  loadVerificationFailures,
  getSourceTaskSummaries,
  loadModuleFindingsSummary,
  getCarryForwardSummaries,
} from '../context-builder';

describe('Workflow Context Builder', () => {
  let tempDir: string;
  let codaRoot: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'coda-wf-ctx-'));
    codaRoot = join(tempDir, '.coda');
    mkdirSync(codaRoot, { recursive: true });
    mkdirSync(join(codaRoot, 'reference'), { recursive: true });
    mkdirSync(join(codaRoot, 'issues'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('loadIssue', () => {
    test('returns frontmatter and body for an existing issue', () => {
      writeRecord(join(codaRoot, 'issues', 'my-feature.md'), {
        title: 'My Feature',
        issue_type: 'feature',
        status: 'active',
        phase: 'build',
        priority: 3,
        topics: [],
        acceptance_criteria: [],
        open_questions: [],
        deferred_items: [],
        human_review: false,
      }, '## Description\nA great feature.\n');

      const result = loadIssue(codaRoot, 'my-feature');
      expect(result).not.toBeNull();
      expect(result!.frontmatter.title).toBe('My Feature');
      expect(result!.body).toContain('A great feature');
    });

    test('returns null for non-existent issue', () => {
      const result = loadIssue(codaRoot, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('loadPlan', () => {
    test('returns the plan record for an issue', () => {
      mkdirSync(join(codaRoot, 'issues', 'my-feature'), { recursive: true });
      writeRecord(join(codaRoot, 'issues', 'my-feature', 'plan-v1.md'), {
        title: 'Implementation Plan',
        issue: 'my-feature',
        status: 'approved',
        iteration: 1,
        task_count: 3,
        human_review_status: 'not-required',
      }, '## Approach\nBuild it step by step.\n');

      const result = loadPlan(codaRoot, 'my-feature');
      expect(result).not.toBeNull();
      expect(result!.frontmatter.title).toBe('Implementation Plan');
      expect(result!.body).toContain('step by step');
    });

    test('returns null when no plan exists', () => {
      mkdirSync(join(codaRoot, 'issues', 'empty-issue'), { recursive: true });
      const result = loadPlan(codaRoot, 'empty-issue');
      expect(result).toBeNull();
    });
  });

  describe('loadTasks', () => {
    test('returns all task records sorted by id', () => {
      const taskDir = join(codaRoot, 'issues', 'my-feature', 'tasks');
      mkdirSync(taskDir, { recursive: true });

      writeRecord(join(taskDir, '02-second-task.md'), {
        id: 2, issue: 'my-feature', title: 'Second Task',
        status: 'pending', kind: 'planned', covers_ac: [], depends_on: [],
        files_to_modify: [], truths: [], artifacts: [], key_links: [],
      }, 'Do the second thing.\n');

      writeRecord(join(taskDir, '01-first-task.md'), {
        id: 1, issue: 'my-feature', title: 'First Task',
        status: 'complete', kind: 'planned', covers_ac: [], depends_on: [],
        files_to_modify: [], truths: [], artifacts: [], key_links: [],
      }, 'Do the first thing.\n## Summary\nDone with task 1.\n');

      const tasks = loadTasks(codaRoot, 'my-feature');
      expect(tasks.length).toBe(2);
      expect(tasks[0]!.frontmatter.id).toBe(1);
      expect(tasks[1]!.frontmatter.id).toBe(2);
    });

    test('returns empty array when no tasks exist', () => {
      mkdirSync(join(codaRoot, 'issues', 'no-tasks'), { recursive: true });
      const tasks = loadTasks(codaRoot, 'no-tasks');
      expect(tasks).toEqual([]);
    });
  });

  describe('loadRefDocs', () => {
    test('returns ref-system.md and ref-prd.md content', () => {
      writeRecord(join(codaRoot, 'reference', 'ref-system.md'), {
        type: 'reference', title: 'System Reference',
      }, '## System\nIt does things.\n');

      writeRecord(join(codaRoot, 'reference', 'ref-prd.md'), {
        type: 'reference', title: 'Product Requirements',
      }, '## Users\nDevelopers.\n');

      const refs = loadRefDocs(codaRoot);
      expect(refs.system).toContain('It does things');
      expect(refs.prd).toContain('Developers');
    });

    test('returns empty strings for missing ref docs', () => {
      const refs = loadRefDocs(codaRoot);
      expect(refs.system).toBe('');
      expect(refs.prd).toBe('');
    });
  });

  describe('getPreviousTaskSummaries', () => {
    test('returns summaries from last N completed tasks', () => {
      const taskDir = join(codaRoot, 'issues', 'my-feature', 'tasks');
      mkdirSync(taskDir, { recursive: true });

      writeRecord(join(taskDir, '01-task-one.md'), {
        id: 1, issue: 'my-feature', title: 'Task One',
        status: 'complete', kind: 'planned', covers_ac: [], depends_on: [],
        files_to_modify: [], truths: [], artifacts: [], key_links: [],
      }, '## Summary\nCompleted task one successfully.\n');

      writeRecord(join(taskDir, '02-task-two.md'), {
        id: 2, issue: 'my-feature', title: 'Task Two',
        status: 'complete', kind: 'planned', covers_ac: [], depends_on: [],
        files_to_modify: [], truths: [], artifacts: [], key_links: [],
      }, '## Summary\nCompleted task two successfully.\n');

      const summaries = getPreviousTaskSummaries(codaRoot, 'my-feature', [1, 2], 3);
      expect(summaries).toContain('Task One');
      expect(summaries).toContain('task one successfully');
      expect(summaries).toContain('Task Two');
    });

    test('returns empty string when no tasks complete', () => {
      mkdirSync(join(codaRoot, 'issues', 'fresh'), { recursive: true });
      const summaries = getPreviousTaskSummaries(codaRoot, 'fresh', [], 3);
      expect(summaries).toBe('');
    });

    test('limits to maxTasks most recent', () => {
      const taskDir = join(codaRoot, 'issues', 'my-feature', 'tasks');
      mkdirSync(taskDir, { recursive: true });

      for (let i = 1; i <= 5; i++) {
        const padded = String(i).padStart(2, '0');
        writeRecord(join(taskDir, `${padded}-task-${i}.md`), {
          id: i, issue: 'my-feature', title: `Task ${i}`,
          status: 'complete', kind: 'planned', covers_ac: [], depends_on: [],
          files_to_modify: [], truths: [], artifacts: [], key_links: [],
        }, `## Summary\nDone with task ${i}.\n`);
      }

      const summaries = getPreviousTaskSummaries(codaRoot, 'my-feature', [1, 2, 3, 4, 5], 2);
      expect(summaries).not.toContain('Task 1');
      expect(summaries).not.toContain('Task 2');
      expect(summaries).not.toContain('Task 3');
      expect(summaries).toContain('Task 4');
      expect(summaries).toContain('Task 5');
    });
  });

  describe('revision artifacts', () => {
    test('loads current revision instructions from disk', () => {
      mkdirSync(join(codaRoot, 'issues', 'my-feature'), { recursive: true });
      writeFileSync(
        join(codaRoot, 'issues', 'my-feature', 'revision-instructions.md'),
        '---\niteration: 1\nissues_found: 2\n---\n## Issue 1: tighten task scope\n**Fix:** narrow the files.\n',
        'utf-8'
      );

      const instructions = loadRevisionInstructions(codaRoot, 'my-feature');
      expect(instructions).toContain('tighten task scope');
      expect(instructions).toContain('issues_found: 2');
    });

    test('loads revision history entries in sorted order', () => {
      const historyDir = join(codaRoot, 'issues', 'my-feature', 'revision-history');
      mkdirSync(historyDir, { recursive: true });
      writeFileSync(join(historyDir, 'iteration-2.md'), '## Issue 2\nSecond revision\n', 'utf-8');
      writeFileSync(join(historyDir, 'iteration-1.md'), '## Issue 1\nFirst revision\n', 'utf-8');

      const history = loadRevisionHistory(codaRoot, 'my-feature');
      expect(history.indexOf('First revision')).toBeLessThan(history.indexOf('Second revision'));
    });

    test('returns empty strings when revision artifacts are missing', () => {
      expect(loadRevisionInstructions(codaRoot, 'my-feature')).toBe('');
      expect(loadRevisionHistory(codaRoot, 'my-feature')).toBe('');
    });


  describe('verification failure artifacts', () => {
    test('loads a single verification failure artifact by AC id', () => {
      const failureDir = join(codaRoot, 'issues', 'my-feature', 'verification-failures');
      mkdirSync(failureDir, { recursive: true });
      writeFileSync(
        join(failureDir, 'AC-2.yaml'),
        [
          'ac_id: AC-2',
          'status: not-met',
          'failed_checks:',
          '  - type: artifact_missing',
          '    detail: src/store.ts does not export saveTodo',
          'source_tasks: [2]',
          'relevant_files:',
          '  - src/store.ts',
          '  - tests/store.test.ts',
        ].join('\n'),
        'utf-8'
      );

      const failure = loadVerificationFailure(codaRoot, 'my-feature', 'AC-2');
      expect(failure).not.toBeNull();
      expect(failure!.acId).toBe('AC-2');
      expect(failure!.failedChecks[0]?.type).toBe('artifact_missing');
      expect(failure!.sourceTasks).toEqual([2]);
      expect(failure!.relevantFiles).toEqual(['src/store.ts', 'tests/store.test.ts']);
    });

    test('loads all verification failures in sorted order', () => {
      const failureDir = join(codaRoot, 'issues', 'my-feature', 'verification-failures');
      mkdirSync(failureDir, { recursive: true });
      writeFileSync(join(failureDir, 'AC-2.yaml'), 'ac_id: AC-2\nstatus: not-met\nsource_tasks: [2]\n', 'utf-8');
      writeFileSync(join(failureDir, 'AC-1.yaml'), 'ac_id: AC-1\nstatus: not-met\nsource_tasks: [1]\n', 'utf-8');

      const failures = loadVerificationFailures(codaRoot, 'my-feature');
      expect(failures.map((failure) => failure.acId)).toEqual(['AC-1', 'AC-2']);
    });

    test('returns source task summaries for correction work', () => {
      const taskDir = join(codaRoot, 'issues', 'my-feature', 'tasks');
      mkdirSync(taskDir, { recursive: true });
      writeRecord(join(taskDir, '01-task-one.md'), {
        id: 1, issue: 'my-feature', title: 'Task One',
        status: 'complete', kind: 'planned', covers_ac: [], depends_on: [],
        files_to_modify: [], truths: [], artifacts: [], key_links: [],
      }, '## Summary\nCompleted task one successfully.\n');
      writeRecord(join(taskDir, '02-task-two.md'), {
        id: 2, issue: 'my-feature', title: 'Task Two',
        status: 'complete', kind: 'planned', covers_ac: [], depends_on: [],
        files_to_modify: [], truths: [], artifacts: [], key_links: [],
      }, '## Summary\nCompleted task two successfully.\n');

      const summaries = getSourceTaskSummaries(codaRoot, 'my-feature', [2, 1]);
      expect(summaries).toContain('Task One');
      expect(summaries).toContain('Task Two');
      expect(summaries.indexOf('Task One')).toBeLessThan(summaries.indexOf('Task Two'));
    });
  });
  });

  describe('loadModuleFindingsSummary', () => {
    test('returns empty string when no findings file exists', () => {
      const summary = loadModuleFindingsSummary(codaRoot, 'no-findings');
      expect(summary).toBe('');
    });

    test('returns summary when findings exist', () => {
      const issueDir = join(codaRoot, 'issues', 'with-findings');
      mkdirSync(issueDir, { recursive: true });
      writeFileSync(join(issueDir, 'module-findings.json'), JSON.stringify({
        issue: 'with-findings',
        hookResults: [{
          hookPoint: 'post-build',
          findings: [
            { module: 'security', check: 'secrets', severity: 'critical', finding: 'API key found' },
            { module: 'security', check: 'validation', severity: 'info', finding: 'No issues' },
          ],
          blocked: true,
          blockReasons: ['SECURITY BLOCK: API key found'],
          timestamp: '2026-04-01T00:00:00Z',
        }],
      }));

      const summary = loadModuleFindingsSummary(codaRoot, 'with-findings');
      expect(summary).toContain('security:');
      expect(summary).toContain('1 critical');
      expect(summary).toContain('(BLOCKED)');
    });
  });
});

describe('getCarryForwardSummaries', () => {
  let tempDir: string;
  let codaRoot: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'coda-carry-'));
    codaRoot = join(tempDir, '.coda');
    mkdirSync(codaRoot, { recursive: true });
    mkdirSync(join(codaRoot, 'issues'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function writeTask(
    taskDir: string,
    id: number,
    opts: { status?: string; kind?: string; depends_on?: number[]; covers_ac?: string[]; fix_for_ac?: string } = {}
  ) {
    const padded = String(id).padStart(2, '0');
    writeRecord(join(taskDir, `${padded}-task-${id}.md`), {
      id,
      issue: 'test-issue',
      title: `Task ${id}`,
      status: opts.status ?? 'complete',
      kind: opts.kind ?? 'planned',
      covers_ac: opts.covers_ac ?? [],
      depends_on: opts.depends_on ?? [],
      files_to_modify: [],
      truths: [],
      artifacts: [],
      key_links: [],
      ...(opts.fix_for_ac ? { fix_for_ac: opts.fix_for_ac } : {}),
    }, `## Summary\nDone with task ${id}.\n`);
  }

  test('dependency-based: depends_on [1, 3] gets tasks 1 and 3 only', () => {
    const taskDir = join(codaRoot, 'issues', 'test-issue', 'tasks');
    mkdirSync(taskDir, { recursive: true });
    writeTask(taskDir, 1);
    writeTask(taskDir, 2);
    writeTask(taskDir, 3);
    writeTask(taskDir, 4);

    const allTasks = loadTasks(codaRoot, 'test-issue');
    const currentTask = {
      frontmatter: {
        id: 5, issue: 'test-issue', title: 'Task 5',
        status: 'active' as const, kind: 'planned' as const,
        covers_ac: [], depends_on: [1, 3],
        files_to_modify: [], truths: [], artifacts: [], key_links: [],
      },
      body: 'Current task body',
    };

    const result = getCarryForwardSummaries(codaRoot, 'test-issue', currentTask, allTasks);
    expect(result).toContain('Task 1');
    expect(result).toContain('Task 3');
    expect(result).not.toContain('Task 2');
    expect(result).not.toContain('Task 4');
  });

  test('recency fallback: empty depends_on gets last N completed tasks', () => {
    const taskDir = join(codaRoot, 'issues', 'test-issue', 'tasks');
    mkdirSync(taskDir, { recursive: true });
    for (let i = 1; i <= 5; i++) writeTask(taskDir, i);

    const allTasks = loadTasks(codaRoot, 'test-issue');
    const currentTask = {
      frontmatter: {
        id: 6, issue: 'test-issue', title: 'Task 6',
        status: 'active' as const, kind: 'planned' as const,
        covers_ac: [], depends_on: [],
        files_to_modify: [], truths: [], artifacts: [], key_links: [],
      },
      body: '',
    };

    const result = getCarryForwardSummaries(codaRoot, 'test-issue', currentTask, allTasks, 2);
    expect(result).toContain('Task 4');
    expect(result).toContain('Task 5');
    expect(result).not.toContain('Task 1');
    expect(result).not.toContain('Task 2');
    expect(result).not.toContain('Task 3');
  });

  test('correction task: gets source tasks covering AC + failure artifact', () => {
    const taskDir = join(codaRoot, 'issues', 'test-issue', 'tasks');
    mkdirSync(taskDir, { recursive: true });
    writeTask(taskDir, 1, { covers_ac: ['AC-2'] });
    writeTask(taskDir, 2, { covers_ac: ['AC-1'] });

    const failureDir = join(codaRoot, 'issues', 'test-issue', 'verification-failures');
    mkdirSync(failureDir, { recursive: true });
    writeFileSync(join(failureDir, 'AC-2.yaml'), [
      'ac_id: AC-2',
      'status: not-met',
      'failed_checks:',
      '  - type: artifact_missing',
      '    detail: src/store.ts does not export saveTodo',
      'source_tasks: [1]',
    ].join('\n'), 'utf-8');

    const allTasks = loadTasks(codaRoot, 'test-issue');
    const correctionTask = {
      frontmatter: {
        id: 3, issue: 'test-issue', title: 'Fix AC-2',
        status: 'active' as const, kind: 'correction' as const,
        fix_for_ac: 'AC-2',
        covers_ac: [], depends_on: [],
        files_to_modify: [], truths: [], artifacts: [], key_links: [],
      },
      body: '',
    };

    const result = getCarryForwardSummaries(codaRoot, 'test-issue', correctionTask, allTasks);
    expect(result).toContain('Task 1');
    expect(result).not.toContain('Task 2');
    expect(result).toContain('AC-2');
    expect(result).toContain('artifact_missing');
  });

  test('missing dependency: depends_on [1, 99] returns only task 1', () => {
    const taskDir = join(codaRoot, 'issues', 'test-issue', 'tasks');
    mkdirSync(taskDir, { recursive: true });
    writeTask(taskDir, 1);

    const allTasks = loadTasks(codaRoot, 'test-issue');
    const currentTask = {
      frontmatter: {
        id: 2, issue: 'test-issue', title: 'Task 2',
        status: 'active' as const, kind: 'planned' as const,
        covers_ac: [], depends_on: [1, 99],
        files_to_modify: [], truths: [], artifacts: [], key_links: [],
      },
      body: '',
    };

    const result = getCarryForwardSummaries(codaRoot, 'test-issue', currentTask, allTasks);
    expect(result).toContain('Task 1');
    expect(result).not.toContain('Task 99');
  });

  test('no completed tasks: returns empty string', () => {
    const taskDir = join(codaRoot, 'issues', 'test-issue', 'tasks');
    mkdirSync(taskDir, { recursive: true });
    writeTask(taskDir, 1, { status: 'pending' });

    const allTasks = loadTasks(codaRoot, 'test-issue');
    const currentTask = {
      frontmatter: {
        id: 2, issue: 'test-issue', title: 'Task 2',
        status: 'active' as const, kind: 'planned' as const,
        covers_ac: [], depends_on: [],
        files_to_modify: [], truths: [], artifacts: [], key_links: [],
      },
      body: '',
    };

    const result = getCarryForwardSummaries(codaRoot, 'test-issue', currentTask, allTasks);
    expect(result).toBe('');
  });

  test('all depends_on missing: returns empty string', () => {
    const taskDir = join(codaRoot, 'issues', 'test-issue', 'tasks');
    mkdirSync(taskDir, { recursive: true });
    writeTask(taskDir, 1);

    const allTasks = loadTasks(codaRoot, 'test-issue');
    const currentTask = {
      frontmatter: {
        id: 2, issue: 'test-issue', title: 'Task 2',
        status: 'active' as const, kind: 'planned' as const,
        covers_ac: [], depends_on: [98, 99],
        files_to_modify: [], truths: [], artifacts: [], key_links: [],
      },
      body: '',
    };

    const result = getCarryForwardSummaries(codaRoot, 'test-issue', currentTask, allTasks);
    expect(result).toBe('');
  });
});