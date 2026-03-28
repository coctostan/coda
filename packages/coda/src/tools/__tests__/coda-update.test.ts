import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { codaUpdate } from '../coda-update';
import { codaCreate } from '../coda-create';
import { readRecord } from '@coda/core';

let codaRoot: string;

beforeEach(() => {
  codaRoot = mkdtempSync(join(tmpdir(), 'coda-update-'));
});

afterEach(() => {
  rmSync(codaRoot, { recursive: true, force: true });
});

describe('codaUpdate', () => {
  test('updates specified frontmatter fields', () => {
    codaCreate(
      {
        type: 'issue',
        fields: {
          title: 'Update Test',
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
        body: '## Description\n\nOriginal body.\n',
      },
      codaRoot
    );

    const result = codaUpdate(
      {
        record: 'issues/update-test.md',
        fields: { status: 'active', phase: 'plan' },
      },
      codaRoot
    );

    expect(result.success).toBe(true);
    expect(result.updated_fields).toContain('status');
    expect(result.updated_fields).toContain('phase');
    expect(result.updated_fields).toHaveLength(2);
  });

  test('body remains unchanged after update', () => {
    codaCreate(
      {
        type: 'reference',
        fields: { title: 'Body Check', category: 'system', topics: [] },
        body: '## Content\n\nImportant content here.\n',
      },
      codaRoot
    );

    codaUpdate(
      {
        record: 'reference/ref-body-check.md',
        fields: { category: 'architecture' },
      },
      codaRoot
    );

    const record = readRecord<Record<string, unknown>>(join(codaRoot, 'reference/ref-body-check.md'));
    expect(record.body).toContain('Important content here.');
  });

  test('unspecified fields remain unchanged', () => {
    codaCreate(
      {
        type: 'issue',
        fields: {
          title: 'Field Check',
          issue_type: 'bugfix',
          status: 'proposed',
          phase: 'specify',
          priority: 1,
          topics: ['original'],
          acceptance_criteria: [],
          open_questions: [],
          deferred_items: [],
          human_review: true,
        },
      },
      codaRoot
    );

    codaUpdate(
      {
        record: 'issues/field-check.md',
        fields: { status: 'active' },
      },
      codaRoot
    );

    const record = readRecord<Record<string, unknown>>(join(codaRoot, 'issues/field-check.md'));
    expect(record.frontmatter['issue_type']).toBe('bugfix');
    expect(record.frontmatter['priority']).toBe(1);
    expect(record.frontmatter['human_review']).toBe(true);
  });

  test('returns error for non-existent file', () => {
    const result = codaUpdate(
      {
        record: 'nonexistent.md',
        fields: { status: 'active' },
      },
      codaRoot
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
