import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeRecord } from '@coda/core';
import { getPhaseContext } from '../phase-runner';

describe('Workflow Phase Runner', () => {
  let tempDir: string;
  let codaRoot: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'coda-wf-pr-'));
    codaRoot = join(tempDir, '.coda');
    mkdirSync(join(codaRoot, 'reference'), { recursive: true });
    mkdirSync(join(codaRoot, 'issues', 'my-feature', 'tasks'), { recursive: true });

    // Fixture: issue
    writeRecord(join(codaRoot, 'issues', 'my-feature.md'), {
      title: 'My Feature', issue_type: 'feature', phase: 'build', priority: 3,
      acceptance_criteria: [{ id: 'AC-1', text: 'It works', status: 'pending' }],
    }, '## Description\nBuild a great feature.\n');

    // Fixture: ref docs
    writeRecord(join(codaRoot, 'reference', 'ref-system.md'), {
      type: 'reference', title: 'System Reference',
    }, '## System\nIt manages tasks.\n');

    writeRecord(join(codaRoot, 'reference', 'ref-prd.md'), {
      type: 'reference', title: 'Product Requirements',
    }, '## Users\nDevelopers who need tracking.\n');

    // Fixture: plan
    writeRecord(join(codaRoot, 'issues', 'my-feature', 'plan-v1.md'), {
      title: 'Implementation Plan', issue: 'my-feature',
      status: 'approved', iteration: 1, task_count: 2,
    }, '## Approach\nStep by step.\n');

    // Fixture: tasks
    writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '01-setup.md'), {
      id: 1, issue: 'my-feature', title: 'Setup', status: 'complete',
      kind: 'planned', covers_ac: ['AC-1'], depends_on: [],
      files_to_modify: [], truths: ['Use TypeScript'], artifacts: [], key_links: [],
    }, '## Summary\nSetup complete.\n');

    writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '02-implement.md'), {
      id: 2, issue: 'my-feature', title: 'Implement', status: 'pending',
      kind: 'planned', covers_ac: ['AC-1'], depends_on: [1],
      files_to_modify: ['src/main.ts'], truths: ['Follow TDD'], artifacts: [], key_links: [],
    }, 'Implement the core logic.\n');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('specify context includes issue + ref-system + ref-prd', () => {
    const ctx = getPhaseContext('specify', codaRoot, 'my-feature');
    expect(ctx.systemPrompt).toContain('specif');
    expect(ctx.context).toContain('My Feature');
    expect(ctx.context).toContain('manages tasks');
    expect(ctx.context).toContain('Developers who need');
  });

  test('plan context includes issue + ref-system', () => {
    const ctx = getPhaseContext('plan', codaRoot, 'my-feature');
    expect(ctx.systemPrompt).toContain('plan');
    expect(ctx.context).toContain('My Feature');
    expect(ctx.context).toContain('manages tasks');
  });

  test('review context includes issue + plan + tasks', () => {
    const ctx = getPhaseContext('review', codaRoot, 'my-feature');
    expect(ctx.systemPrompt).toContain('review');
    expect(ctx.context).toContain('My Feature');
    expect(ctx.context).toContain('Step by step');
    expect(ctx.context).toContain('Setup');
  });

  test('build context includes current task + Todd prompt', () => {
    const ctx = getPhaseContext('build', codaRoot, 'my-feature', {
      version: 1, focus_issue: 'my-feature', phase: 'build',
      current_task: 2, completed_tasks: [1],
      tdd_gate: 'locked', last_test_exit_code: null,
      task_tool_calls: 0, enabled: true,
    });
    expect(ctx.systemPrompt).toContain('task');
    expect(ctx.context).toContain('Implement');
    expect(ctx.context).toContain('RED-GREEN');
  });

  test('verify context includes issue + task summaries', () => {
    const ctx = getPhaseContext('verify', codaRoot, 'my-feature', {
      version: 1, focus_issue: 'my-feature', phase: 'verify',
      current_task: null, completed_tasks: [1, 2],
      tdd_gate: 'locked', last_test_exit_code: null,
      task_tool_calls: 0, enabled: true,
    });
    expect(ctx.systemPrompt).toContain('verif');
    expect(ctx.context).toContain('My Feature');
    expect(ctx.context).toContain('Setup');
  });

  test('unify context includes issue + plan + summaries + ref-system', () => {
    const ctx = getPhaseContext('unify', codaRoot, 'my-feature', {
      version: 1, focus_issue: 'my-feature', phase: 'unify',
      current_task: null, completed_tasks: [1, 2],
      tdd_gate: 'locked', last_test_exit_code: null,
      task_tool_calls: 0, enabled: true,
    });
    expect(ctx.systemPrompt).toContain('clos');
    expect(ctx.context).toContain('My Feature');
    expect(ctx.context).toContain('Step by step');
    expect(ctx.context).toContain('manages tasks');
  });

  test('returns appropriate systemPrompt per phase', () => {
    const phases = ['specify', 'plan', 'review', 'verify', 'unify'] as const;
    for (const phase of phases) {
      const ctx = getPhaseContext(phase, codaRoot, 'my-feature');
      expect(ctx.systemPrompt.length).toBeGreaterThan(10);
    }
  });
});
