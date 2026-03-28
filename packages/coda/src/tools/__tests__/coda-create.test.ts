import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { codaCreate } from '../coda-create';
import { readRecord } from '@coda/core';

let codaRoot: string;

beforeEach(() => {
  codaRoot = mkdtempSync(join(tmpdir(), 'coda-create-'));
});

afterEach(() => {
  rmSync(codaRoot, { recursive: true, force: true });
});

describe('codaCreate', () => {
  test('creates an issue at the correct path', () => {
    const result = codaCreate(
      {
        type: 'issue',
        fields: {
          title: 'My First Issue',
          issue_type: 'feature',
          status: 'proposed',
          phase: 'specify',
          priority: 3,
          topics: [],
          acceptance_criteria: [],
          open_questions: [],
          deferred_items: [],
          human_review: false,
        },
      },
      codaRoot
    );

    expect(result.success).toBe(true);
    expect(result.path).toContain('issues/my-first-issue.md');
    expect(existsSync(join(codaRoot, result.path))).toBe(true);

    const record = readRecord<Record<string, unknown>>(join(codaRoot, result.path));
    expect(record.frontmatter).toHaveProperty('title', 'My First Issue');
    expect(record.frontmatter).toHaveProperty('issue_type', 'feature');
  });

  test('generates sequential AC IDs for issues', () => {
    const result = codaCreate(
      {
        type: 'issue',
        fields: {
          title: 'AC Test',
          issue_type: 'feature',
          status: 'proposed',
          phase: 'specify',
          priority: 3,
          topics: [],
          acceptance_criteria: [
            { id: 'AC-1', text: 'First criterion', status: 'pending' },
            { id: 'AC-2', text: 'Second criterion', status: 'pending' },
          ],
          open_questions: [],
          deferred_items: [],
          human_review: false,
        },
      },
      codaRoot
    );

    expect(result.success).toBe(true);
    const record = readRecord<Record<string, unknown>>(join(codaRoot, result.path));
    const acs = record.frontmatter['acceptance_criteria'] as Array<{ id: string }>;
    expect(acs).toHaveLength(2);
    expect(acs[0]?.id).toBe('AC-1');
    expect(acs[1]?.id).toBe('AC-2');
  });

  test('creates a plan at the correct path', () => {
    const result = codaCreate(
      {
        type: 'plan',
        fields: {
          title: 'Implementation Plan',
          issue: 'my-issue',
          status: 'draft',
          iteration: 1,
          task_count: 3,
          human_review_status: 'not-required',
        },
      },
      codaRoot
    );

    expect(result.success).toBe(true);
    expect(result.path).toContain('issues/my-issue/plan-v1.md');
    expect(existsSync(join(codaRoot, result.path))).toBe(true);
  });

  test('creates a task at the correct path', () => {
    const result = codaCreate(
      {
        type: 'task',
        fields: {
          id: 1,
          issue: 'my-issue',
          title: 'First Task',
          status: 'pending',
          kind: 'planned',
          covers_ac: ['AC-1'],
          depends_on: [],
          files_to_modify: [],
          truths: [],
          artifacts: [],
          key_links: [],
        },
      },
      codaRoot
    );

    expect(result.success).toBe(true);
    expect(result.path).toContain('issues/my-issue/tasks/01-first-task.md');
    expect(existsSync(join(codaRoot, result.path))).toBe(true);
  });

  test('creates a reference at the correct path', () => {
    const result = codaCreate(
      {
        type: 'reference',
        fields: {
          title: 'System Architecture',
          category: 'architecture',
          topics: ['design'],
        },
        body: '## Overview\n\nArchitecture description.',
      },
      codaRoot
    );

    expect(result.success).toBe(true);
    expect(result.path).toContain('reference/ref-system-architecture.md');
    expect(existsSync(join(codaRoot, result.path))).toBe(true);

    const record = readRecord<Record<string, unknown>>(join(codaRoot, result.path));
    expect(record.body).toContain('Architecture description.');
  });

  test('creates directory structure if missing', () => {
    const result = codaCreate(
      {
        type: 'task',
        fields: {
          id: 5,
          issue: 'new-issue',
          title: 'Deep Task',
          status: 'pending',
          kind: 'planned',
          covers_ac: [],
          depends_on: [],
          files_to_modify: [],
          truths: [],
          artifacts: [],
          key_links: [],
        },
      },
      codaRoot
    );

    expect(result.success).toBe(true);
    expect(existsSync(join(codaRoot, result.path))).toBe(true);
  });

  test('returns error for missing required title field', () => {
    const result = codaCreate(
      {
        type: 'issue',
        fields: { issue_type: 'feature' },
      },
      codaRoot
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('creates a record at the correct path', () => {
    const result = codaCreate(
      {
        type: 'record',
        fields: { title: 'Completion Note' },
        body: 'Done.',
      },
      codaRoot
    );

    expect(result.success).toBe(true);
    expect(result.path).toContain('records/completion-note.md');
  });
});
