import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { codaEditBody } from '../coda-edit-body';
import { codaCreate } from '../coda-create';
import { readRecord, getSection } from '@coda/core';

let codaRoot: string;

beforeEach(() => {
  codaRoot = mkdtempSync(join(tmpdir(), 'coda-edit-body-'));
});

afterEach(() => {
  rmSync(codaRoot, { recursive: true, force: true });
});

/** Helper to create a record with body sections. */
function createTestRecord(): string {
  const result = codaCreate(
    {
      type: 'reference',
      fields: { title: 'Edit Test', category: 'system', topics: [] },
      body: '## First\n\nFirst content.\n\n## Second\n\nSecond content.\n',
    },
    codaRoot
  );
  return result.path;
}

describe('codaEditBody', () => {
  test('append_section adds new section at end', () => {
    const path = createTestRecord();

    const result = codaEditBody(
      { record: path, op: 'append_section', section: 'Third', content: 'Third content.' },
      codaRoot
    );

    expect(result.success).toBe(true);
    expect(result.diff_summary).toContain('Third');

    const record = readRecord<Record<string, unknown>>(join(codaRoot, path));
    const section = getSection(record.body, 'Third');
    expect(section).toBe('Third content.');
  });

  test('replace_section replaces existing section content', () => {
    const path = createTestRecord();

    const result = codaEditBody(
      { record: path, op: 'replace_section', section: 'Second', content: 'Replaced content.' },
      codaRoot
    );

    expect(result.success).toBe(true);

    const record = readRecord<Record<string, unknown>>(join(codaRoot, path));
    expect(getSection(record.body, 'Second')).toBe('Replaced content.');
    // First section unchanged
    expect(getSection(record.body, 'First')).toBe('First content.');
  });

  test('replace_section on non-existent section appends it', () => {
    const path = createTestRecord();

    codaEditBody(
      { record: path, op: 'replace_section', section: 'New', content: 'New content.' },
      codaRoot
    );

    const record = readRecord<Record<string, unknown>>(join(codaRoot, path));
    expect(getSection(record.body, 'New')).toBe('New content.');
  });

  test('append_text appends raw text at end', () => {
    const path = createTestRecord();

    codaEditBody(
      { record: path, op: 'append_text', content: '\n\n---\nFooter note.' },
      codaRoot
    );

    const record = readRecord<Record<string, unknown>>(join(codaRoot, path));
    expect(record.body).toContain('Footer note.');
  });

  test('never touches frontmatter', () => {
    const path = createTestRecord();

    codaEditBody(
      { record: path, op: 'append_section', section: 'Extra', content: 'Extra stuff.' },
      codaRoot
    );

    const record = readRecord<Record<string, unknown>>(join(codaRoot, path));
    expect(record.frontmatter['title']).toBe('Edit Test');
    expect(record.frontmatter['category']).toBe('system');
  });

  test('returns error for non-existent file', () => {
    const result = codaEditBody(
      { record: 'nonexistent.md', op: 'append_text', content: 'fail' },
      codaRoot
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('returns diff_summary describing the change', () => {
    const path = createTestRecord();

    const result = codaEditBody(
      { record: path, op: 'append_section', section: 'Summary', content: 'Done.' },
      codaRoot
    );

    expect(result.success).toBe(true);
    expect(result.diff_summary.length).toBeGreaterThan(0);
  });
});
