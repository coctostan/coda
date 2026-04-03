import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeRecord } from '@coda/core';
import type { IssueRecord, TaskRecord, PlanRecord } from '@coda/core';
import { codaQuery } from '../coda-query';

let codaRoot: string;
let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'coda-query-test-'));
  codaRoot = join(tempDir, '.coda');
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function createIssue(slug: string, overrides: Partial<IssueRecord> = {}): void {
  writeRecord(join(codaRoot, 'issues', `${slug}.md`), {
    title: slug,
    issue_type: 'feature',
    status: 'proposed',
    phase: 'specify',
    priority: 3,
    topics: [],
    acceptance_criteria: [],
    open_questions: [],
    deferred_items: [],
    human_review: false,
    ...overrides,
  } as IssueRecord, `## ${slug}\nDescription.\n`);
}

function createTask(issueSlug: string, id: number, overrides: Partial<TaskRecord> = {}): void {
  const padded = String(id).padStart(2, '0');
  writeRecord(join(codaRoot, 'issues', issueSlug, 'tasks', `${padded}-task.md`), {
    id,
    issue: issueSlug,
    title: `Task ${id}`,
    status: 'pending',
    kind: 'planned',
    covers_ac: [],
    depends_on: [],
    files_to_modify: [],
    truths: [],
    artifacts: [],
    key_links: [],
    ...overrides,
  } as TaskRecord, `Task ${id} body.\n`);
}

function createPlan(issueSlug: string, version: number = 1, overrides: Partial<PlanRecord> = {}): void {
  writeRecord(join(codaRoot, 'issues', issueSlug, `plan-v${version}.md`), {
    title: `Plan v${version}`,
    issue: issueSlug,
    status: 'approved',
    iteration: version,
    task_count: 2,
    ...overrides,
  } as PlanRecord, `## Plan v${version}\nApproach.\n`);
}

describe('codaQuery', () => {
  describe('issue queries', () => {
    test('returns all issues', () => {
      createIssue('auth-flow');
      createIssue('dashboard');
      const result = codaQuery({ type: 'issue' }, codaRoot);
      expect(result.success).toBe(true);
      expect(result.records).toHaveLength(2);
      expect(result.records[0]?.frontmatter.title).toBe('auth-flow');
      expect(result.records[1]?.frontmatter.title).toBe('dashboard');
    });

    test('filters by status', () => {
      createIssue('active-issue', { status: 'active' });
      createIssue('proposed-issue', { status: 'proposed' });
      const result = codaQuery({ type: 'issue', filter: { status: 'active' } }, codaRoot);
      expect(result.records).toHaveLength(1);
      expect(result.records[0]?.frontmatter.title).toBe('active-issue');
    });

    test('filters by topic', () => {
      createIssue('tagged-issue', { topics: ['auth', 'security'] });
      createIssue('untagged-issue', { topics: [] });
      const result = codaQuery({ type: 'issue', filter: { topic: 'auth' } }, codaRoot);
      expect(result.records).toHaveLength(1);
      expect(result.records[0]?.frontmatter.title).toBe('tagged-issue');
    });

    test('returns empty for no issues', () => {
      const result = codaQuery({ type: 'issue' }, codaRoot);
      expect(result.success).toBe(true);
      expect(result.records).toHaveLength(0);
    });

    test('returns frontmatter only (no body)', () => {
      createIssue('my-issue');
      const result = codaQuery({ type: 'issue' }, codaRoot);
      expect(result.records[0]?.frontmatter).toBeTruthy();
      // The record should not have a 'body' property
      expect('body' in (result.records[0] ?? {})).toBe(false);
    });
  });

  describe('task queries', () => {
    test('returns tasks for an issue', () => {
      createIssue('my-issue');
      createTask('my-issue', 1);
      createTask('my-issue', 2, { status: 'complete' });
      const result = codaQuery({ type: 'task', filter: { issue: 'my-issue' } }, codaRoot);
      expect(result.success).toBe(true);
      expect(result.records).toHaveLength(2);
    });

    test('filters tasks by status', () => {
      createIssue('my-issue');
      createTask('my-issue', 1, { status: 'pending' });
      createTask('my-issue', 2, { status: 'complete' });
      const result = codaQuery({ type: 'task', filter: { issue: 'my-issue', status: 'complete' } }, codaRoot);
      expect(result.records).toHaveLength(1);
      expect(result.records[0]?.frontmatter.id).toBe(2);
    });

    test('requires issue filter', () => {
      const result = codaQuery({ type: 'task' }, codaRoot);
      expect(result.success).toBe(false);
      expect(result.error).toContain('filter.issue is required');
    });
  });

  describe('plan queries', () => {
    test('returns plans for an issue', () => {
      createIssue('my-issue');
      createPlan('my-issue', 1);
      createPlan('my-issue', 2);
      const result = codaQuery({ type: 'plan', filter: { issue: 'my-issue' } }, codaRoot);
      expect(result.success).toBe(true);
      expect(result.records).toHaveLength(2);
    });

    test('requires issue filter', () => {
      const result = codaQuery({ type: 'plan' }, codaRoot);
      expect(result.success).toBe(false);
      expect(result.error).toContain('filter.issue is required');
    });
  });

  describe('record queries', () => {
    test('returns empty when no records directory', () => {
      const result = codaQuery({ type: 'record' }, codaRoot);
      expect(result.success).toBe(true);
      expect(result.records).toHaveLength(0);
    });
  });

  describe('reference queries', () => {
    test('returns empty when no reference directory', () => {
      const result = codaQuery({ type: 'reference' }, codaRoot);
      expect(result.success).toBe(true);
      expect(result.records).toHaveLength(0);
    });
  });

  describe('decision queries', () => {
    test('returns empty when no decisions directory', () => {
      const result = codaQuery({ type: 'decision' }, codaRoot);
      expect(result.success).toBe(true);
      expect(result.records).toHaveLength(0);
    });
  });
});
