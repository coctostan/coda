import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeRecord } from '@coda/core';
import type { IssueRecord, PlanRecord, TaskRecord } from '@coda/core';
import { assembleUnifyContext, loadTopicMatchedRefDocs } from '../unify-runner';
import { getPhaseContext } from '../phase-runner';

let codaRoot: string;

beforeEach(() => {
  codaRoot = mkdtempSync(join(tmpdir(), 'coda-unify-'));
});

afterEach(() => {
  rmSync(codaRoot, { recursive: true, force: true });
});

/** Set up a basic issue with optional topics. */
function setupIssue(topics: string[] = ['state', 'gates']): void {
  const issueDir = join(codaRoot, 'issues');
  mkdirSync(issueDir, { recursive: true });

  writeRecord<IssueRecord>(join(issueDir, 'test-issue.md'), {
    title: 'Test Issue',
    issue_type: 'feature',
    status: 'active',
    phase: 'unify',
    priority: 3,
    topics,
    acceptance_criteria: [
      { id: 'AC-1', text: 'Gate enforces fields', status: 'met' },
    ],
    open_questions: [],
    deferred_items: [],
    human_review: false,
  }, '## Description\nTest issue for UNIFY.\n');
}

/** Set up a plan for the issue. */
function setupPlan(): void {
  const issueSlugDir = join(codaRoot, 'issues', 'test-issue');
  mkdirSync(issueSlugDir, { recursive: true });

  writeRecord<PlanRecord>(join(issueSlugDir, 'plan-v1.md'), {
    title: 'Test Plan',
    issue: 'test-issue',
    status: 'approved',
    iteration: 1,
    task_count: 1,
    human_review_status: 'not-required',
  }, '## Approach\nBuild the thing.\n');
}

/** Set up a completed task. */
function setupTask(): void {
  const taskDir = join(codaRoot, 'issues', 'test-issue', 'tasks');
  mkdirSync(taskDir, { recursive: true });

  writeRecord<TaskRecord>(join(taskDir, 'task-1.md'), {
    id: 1,
    issue: 'test-issue',
    title: 'Build Gate',
    status: 'complete',
    kind: 'planned',
    covers_ac: ['AC-1'],
    depends_on: [],
    files_to_modify: ['src/gates.ts'],
    truths: [],
    artifacts: [],
    key_links: [],
  }, '## Summary\nGate was built.\n');
}

/** Set up reference docs with topics. */
function setupRefDocs(topics: string[] = ['state', 'gates']): void {
  const refDir = join(codaRoot, 'reference');
  mkdirSync(refDir, { recursive: true });

  writeRecord<Record<string, unknown>>(join(refDir, 'ref-system.md'), {
    title: 'System Reference',
    topics: ['state', 'workflow'],
  }, '## Overview\nSystem overview content.\n\n## State Engine\nState engine details.\n\n## Gates\nGate definitions.\n');

  writeRecord<Record<string, unknown>>(join(refDir, 'ref-api.md'), {
    title: 'API Reference',
    topics: ['api', 'tools'],
  }, '## Overview\nAPI overview.\n\n## Tools\nTool details.\n');
}

describe('assembleUnifyContext', () => {
  test('returns context with all 5 action instructions', () => {
    setupIssue();
    setupPlan();
    setupTask();

    const result = assembleUnifyContext(codaRoot, 'test-issue', {
      version: 1,
      focus_issue: 'test-issue',
      phase: 'unify',
      submode: null,
      loop_iteration: 0,
      current_task: null,
      completed_tasks: [1],
      tdd_gate: 'locked',
      last_test_exit_code: null,
      task_tool_calls: 0,
      enabled: true,
    });

    expect(result.systemPrompt).toContain('ACTION 1:');
    expect(result.systemPrompt).toContain('ACTION 2:');
    expect(result.systemPrompt).toContain('ACTION 3:');
    expect(result.systemPrompt).toContain('ACTION 4:');
    expect(result.systemPrompt).toContain('ACTION 5:');
  });

  test('systemPrompt mentions spec delta, completion record, reference docs, knowledge, milestone', () => {
    setupIssue();
    setupPlan();

    const result = assembleUnifyContext(codaRoot, 'test-issue');

    expect(result.systemPrompt).toContain('ref-system.md');
    expect(result.systemPrompt).toContain('completion record');
    expect(result.systemPrompt).toContain('Reference Docs');
    expect(result.systemPrompt).toContain('Knowledge');
    expect(result.systemPrompt).toContain('Milestone');
  });

  test('context includes issue, plan, and task summaries', () => {
    setupIssue();
    setupPlan();
    setupTask();

    const result = assembleUnifyContext(codaRoot, 'test-issue', {
      version: 1,
      focus_issue: 'test-issue',
      phase: 'unify',
      submode: null,
      loop_iteration: 0,
      current_task: null,
      completed_tasks: [1],
      tdd_gate: 'locked',
      last_test_exit_code: null,
      task_tool_calls: 0,
      enabled: true,
    });

    expect(result.context).toContain('Test Issue');
    expect(result.context).toContain('Build the thing');
    expect(result.context).toContain('Build Gate');
  });

  test('metadata has phase unify and correct defaults', () => {
    setupIssue();

    const result = assembleUnifyContext(codaRoot, 'test-issue');

    expect(result.metadata.phase).toBe('unify');
    expect(result.metadata.submode).toBeNull();
    expect(result.metadata.loopIteration).toBe(0);
    expect(result.metadata.currentTask).toBeNull();
    expect(result.metadata.taskKind).toBeNull();
    expect(result.metadata.taskTitle).toBeNull();
  });
});

describe('loadTopicMatchedRefDocs', () => {
  test('returns matching sections when topics overlap', () => {
    setupRefDocs();

    const result = loadTopicMatchedRefDocs(codaRoot, ['state']);

    expect(result).toContain('ref-system.md');
    expect(result).toContain('State Engine');
    // Should not include API ref since topics don't overlap
    expect(result).not.toContain('ref-api.md');
  });

  test('falls back to ref-system.md when no topics match', () => {
    setupRefDocs();

    const result = loadTopicMatchedRefDocs(codaRoot, ['zzz-nonexistent']);

    expect(result).toContain('ref-system.md');
    expect(result).toContain('System overview content');
  });

  test('returns full ref-system.md when topics array is empty', () => {
    setupRefDocs();

    const result = loadTopicMatchedRefDocs(codaRoot, []);

    expect(result).toContain('ref-system.md');
    expect(result).toContain('System overview content');
  });

  test('returns empty string when reference dir does not exist', () => {
    // No ref dir created
    const result = loadTopicMatchedRefDocs(codaRoot, ['state']);
    expect(result).toBe('');
  });
});

describe('getPhaseContext unify integration', () => {
  test('getPhaseContext("unify") delegates to the UNIFY runner', () => {
    setupIssue();
    setupPlan();
    setupTask();

    const result = getPhaseContext('unify', codaRoot, 'test-issue', {
      version: 1,
      focus_issue: 'test-issue',
      phase: 'unify',
      submode: null,
      loop_iteration: 0,
      current_task: null,
      completed_tasks: [1],
      tdd_gate: 'locked',
      last_test_exit_code: null,
      task_tool_calls: 0,
      enabled: true,
    });

    // Should have UNIFY runner content, not the old one-liner
    expect(result.systemPrompt).toContain('ACTION 1:');
    expect(result.systemPrompt).toContain('ACTION 5:');
    expect(result.systemPrompt).not.toBe('You are closing the loop. Write the completion record and update reference docs.');
    expect(result.metadata.phase).toBe('unify');
  });
});
