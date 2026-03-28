import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, mkdirSync } from 'fs';
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

    test('systemPrompt references the task', () => {
      const ctx = buildTaskContext(codaRoot, 'my-feature', 2, [1]);
      expect(ctx.systemPrompt).toContain('task');
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
      // Mark all tasks as complete
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
