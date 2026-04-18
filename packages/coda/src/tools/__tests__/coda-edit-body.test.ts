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

  test('replace_section on non-existent section returns an error (no silent append)', () => {
    const path = createTestRecord();

    const result = codaEditBody(
      { record: path, op: 'replace_section', section: 'New', content: 'New content.' },
      codaRoot
    );

    // Contract (coda-spec-v7.md, Phase 58 C2): replace_section on a missing
    // heading without create_if_missing must be an explicit error, not a
    // silent append that corrupts downstream reads.
    expect(result.success).toBe(false);
    expect(result.error ?? '').toMatch(/section|heading|not found/i);

    const record = readRecord<Record<string, unknown>>(join(codaRoot, path));
    expect(getSection(record.body, 'New')).toBeNull();
  });

  test('replace_section with create_if_missing:true appends a new section', () => {
    const path = createTestRecord();

    const result = codaEditBody(
      { record: path, op: 'replace_section', section: 'New', content: 'New content.', create_if_missing: true },
      codaRoot
    );

    expect(result.success).toBe(true);
    const record = readRecord<Record<string, unknown>>(join(codaRoot, path));
    expect(getSection(record.body, 'New')).toBe('New content.');
  });

  test('replace_section matches an existing heading with trivial formatting differences', () => {
    const path = createTestRecord();

    // Canonical body has "## Second" — replace_section with "Second:" (trailing colon)
    // must update the existing section, not append a duplicate heading.
    const result = codaEditBody(
      { record: path, op: 'replace_section', section: 'Second:', content: 'Replaced content.' },
      codaRoot
    );

    expect(result.success).toBe(true);
    const record = readRecord<Record<string, unknown>>(join(codaRoot, path));
    expect(getSection(record.body, 'Second')).toBe('Replaced content.');
    // No duplicate heading should have been appended.
    const bodyStr = record.body as string;
    const occurrences = bodyStr.split('\n').filter((l) => l.trim().replace(/:\s*$/, '').toLowerCase() === '## second').length;
    expect(occurrences).toBe(1);
  });

  test('replace_section returns an explicit error when heading appears multiple times', () => {
    // Simulate the Phase 57 live regression: duplicated headings already on disk.
    // The tool must refuse to guess and return an ambiguity error.
    const path = createTestRecord();
    const fullPath = join(codaRoot, path);

    // Force-append a duplicate Second heading to mimic prior-corrupted state.
    codaEditBody(
      { record: path, op: 'append_section', section: 'Second', content: 'Duplicate block.' },
      codaRoot
    );

    const result = codaEditBody(
      { record: path, op: 'replace_section', section: 'Second', content: 'Attempted replacement.' },
      codaRoot
    );

    expect(result.success).toBe(false);
    expect(result.error ?? '').toMatch(/duplicate|ambiguous|multiple/i);

    // Both duplicate headings remain unchanged (no silent mutation on ambiguity).
    const record = readRecord<Record<string, unknown>>(fullPath);
    const headingCount = (record.body as string).split('\n').filter((l) => l.trim() === '## Second').length;
    expect(headingCount).toBe(2);
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

  test('create_if_missing creates a new record with the provided body', () => {
    const result = codaEditBody(
      {
        record: 'issues/new-issue/notes.md',
        op: 'append_text',
        content: '## Notes\n\nCreated on demand.\n',
        create_if_missing: true,
      },
      codaRoot
    );

    expect(result.success).toBe(true);
    expect(result.diff_summary).toContain('Created record');

    const record = readRecord<Record<string, unknown>>(join(codaRoot, 'issues', 'new-issue', 'notes.md'));
    expect(record.frontmatter).toEqual({});
    expect(record.body).toBe('## Notes\n\nCreated on demand.\n');
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
