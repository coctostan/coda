import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeRecord } from '@coda/core';
import { buildTaskContext, getBuildSequence } from '../build-loop';

describe('Workflow Build Loop', () => {
  let tempDir: string;
  let codaRoot: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'coda-wf-bl-'));
    codaRoot = join(tempDir, '.coda');
    mkdirSync(join(codaRoot, 'issues', 'my-feature', 'tasks'), { recursive: true });

    writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '01-first.md'), {
      id: 1, issue: 'my-feature', title: 'First Task', status: 'complete',
      kind: 'planned', covers_ac: [], depends_on: [],
      files_to_modify: [], truths: ['truth-1'], artifacts: [], key_links: [],
    }, '## Summary\nFirst done.\n');

    writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '02-second.md'), {
      id: 2, issue: 'my-feature', title: 'Second Task', status: 'pending',
      kind: 'planned', covers_ac: [], depends_on: [1],
      files_to_modify: ['src/main.ts'], truths: ['truth-2'], artifacts: [], key_links: [],
    }, 'Implement the second feature.\n');

    writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '03-third.md'), {
      id: 3, issue: 'my-feature', title: 'Third Task', status: 'pending',
      kind: 'planned', covers_ac: [], depends_on: [2],
      files_to_modify: [], truths: [], artifacts: [], key_links: [],
    }, 'Implement the third feature.\n');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('buildTaskContext', () => {
    test('returns context with task record and Todd prompt', () => {
      const ctx = buildTaskContext(codaRoot, 'my-feature', 2, [1]);
      expect(ctx.taskId).toBe(2);
      expect(ctx.taskTitle).toBe('Second Task');
      expect(ctx.context).toContain('Second Task');
      expect(ctx.context).toContain('RED-GREEN');
    });

    test('includes previous task summaries (carry-forward)', () => {
      const ctx = buildTaskContext(codaRoot, 'my-feature', 2, [1]);
      expect(ctx.context).toContain('First Task');
      expect(ctx.context).toContain('First done');
    });

    test('includes task completion protocol for regular tasks', () => {
      const ctx = buildTaskContext(codaRoot, 'my-feature', 2, [1]);
      expect(ctx.context).toContain('## Task Completion Protocol');
      expect(ctx.context).toContain('1. Mark the task complete with coda_update (set status: "complete")');
      expect(ctx.context).toContain('2. Add a Summary section to the task with coda_edit_body');
      expect(ctx.context).toContain('3. Call coda_status to check for the next pending task');
      expect(ctx.context).toContain('4. If there are more pending tasks, read the next task with coda_read and begin it immediately');
      expect(ctx.context).toContain('5. If all tasks are complete, call coda_advance to move to the verify phase');
    });

    test('includes post-task module analysis for the most recently completed task', () => {
      const ctx = buildTaskContext(codaRoot, 'my-feature', 2, [1]);
      expect(ctx.context).toContain('Module Analysis: post-task');
      expect(ctx.context).toContain('Task: 1');
      expect(ctx.context).toContain('coda_report_findings');
    });

    test('includes post-build module analysis when assembling the final build task', () => {
      const ctx = buildTaskContext(codaRoot, 'my-feature', 3, [1, 2]);
      expect(ctx.context).toContain('Module Analysis: post-build');
      expect(ctx.context).toContain('Changed files: src/main.ts');
      expect(ctx.context).toContain('coda_report_findings');
    });

    test('systemPrompt references the task', () => {
      const ctx = buildTaskContext(codaRoot, 'my-feature', 2, [1]);
      expect(ctx.systemPrompt).toContain('task');
    });

    test('does not include task completion protocol for correction tasks', () => {
      writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '04-fix-ac-2.md'), {
        id: 4, issue: 'my-feature', title: 'Fix AC-2', status: 'pending',
        kind: 'correction', fix_for_ac: 'AC-2', covers_ac: ['AC-2'], depends_on: [],
        files_to_modify: ['src/store.ts'], truths: ['AC-2 passes after the fix'], artifacts: [], key_links: [],
      }, 'Narrowly fix the verification failure.\n');

      const ctx = buildTaskContext(codaRoot, 'my-feature', 4, [1]);
      expect(ctx.context).not.toContain('## Task Completion Protocol');
    });

    test('includes verification failure context and source task summaries for correction tasks', () => {
      writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '04-fix-ac-2.md'), {
        id: 4, issue: 'my-feature', title: 'Fix AC-2', status: 'pending',
        kind: 'correction', fix_for_ac: 'AC-2', covers_ac: ['AC-2'], depends_on: [],
        files_to_modify: ['src/store.ts', 'tests/store.test.ts'], truths: ['AC-2 passes after the fix'], artifacts: [], key_links: [],
      }, 'Narrowly fix the verification failure.\n');

      mkdirSync(join(codaRoot, 'issues', 'my-feature', 'verification-failures'), { recursive: true });
      writeFileSync(
        join(codaRoot, 'issues', 'my-feature', 'verification-failures', 'AC-2.yaml'),
        [
          'ac_id: AC-2',
          'status: not-met',
          'failed_checks:',
          '  - type: test_failure',
          '    detail: saveTodo test still fails',
          'source_tasks: [2]',
          'relevant_files:',
          '  - src/store.ts',
          '  - tests/store.test.ts',
        ].join('\n'),
        'utf-8'
      );

      const ctx = buildTaskContext(codaRoot, 'my-feature', 4, [1]);
      expect(ctx.taskId).toBe(4);
      expect(ctx.context).toContain('verification failure');
      expect(ctx.context).toContain('saveTodo test still fails');
      expect(ctx.context).toContain('Second Task');
      expect(ctx.systemPrompt).toContain('verification failure');
      expect(ctx.context).not.toContain('Module Analysis: post-build');
    });
  });

  describe('getBuildSequence', () => {
    test('returns tasks ordered by id ascending', () => {
      const sequence = getBuildSequence(codaRoot, 'my-feature');
      expect(sequence).toEqual([2, 3]);
    });

    test('filters to pending/active tasks only', () => {
      const sequence = getBuildSequence(codaRoot, 'my-feature');
      expect(sequence).not.toContain(1); // complete
      expect(sequence).toContain(2);     // pending
      expect(sequence).toContain(3);     // pending
    });

    test('returns empty array when all tasks complete', () => {
      writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '02-second.md'), {
        id: 2, issue: 'my-feature', title: 'Second Task', status: 'complete',
        kind: 'planned', covers_ac: [], depends_on: [1],
        files_to_modify: [], truths: [], artifacts: [], key_links: [],
      }, 'Done.\n');

      writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '03-third.md'), {
        id: 3, issue: 'my-feature', title: 'Third Task', status: 'complete',
        kind: 'planned', covers_ac: [], depends_on: [2],
        files_to_modify: [], truths: [], artifacts: [], key_links: [],
      }, 'Done.\n');

      const sequence = getBuildSequence(codaRoot, 'my-feature');
      expect(sequence).toEqual([]);
    });
  });
});
