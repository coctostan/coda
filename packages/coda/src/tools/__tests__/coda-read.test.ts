import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { codaRead } from '../coda-read';
import { codaCreate } from '../coda-create';

let codaRoot: string;

beforeEach(() => {
  codaRoot = mkdtempSync(join(tmpdir(), 'coda-read-'));
});

afterEach(() => {
  rmSync(codaRoot, { recursive: true, force: true });
});

describe('codaRead', () => {
  test('reads full record — returns frontmatter and body', () => {
    // Create a record first
    const created = codaCreate(
      {
        type: 'reference',
        fields: { title: 'Test Doc', category: 'system', topics: ['test'] },
        body: '## Overview\n\nThis is the overview.\n\n## Details\n\nSome details here.\n',
      },
      codaRoot
    );
    expect(created.success).toBe(true);

    const result = codaRead({ record: created.path }, codaRoot);

    expect(result.success).toBe(true);
    expect(result.frontmatter['title']).toBe('Test Doc');
    expect(result.frontmatter['category']).toBe('system');
    expect(result.body).toContain('## Overview');
    expect(result.body).toContain('This is the overview.');
    expect(result.body).toContain('## Details');
  });

  test('reads with section filter — returns only that section', () => {
    const created = codaCreate(
      {
        type: 'reference',
        fields: { title: 'Sections Doc', category: 'system', topics: [] },
        body: '## First\n\nFirst content.\n\n## Second\n\nSecond content.\n',
      },
      codaRoot
    );

    const result = codaRead({ record: created.path, section: 'Second' }, codaRoot);

    expect(result.success).toBe(true);
    expect(result.body).toBe('Second content.');
    expect(result.body).not.toContain('First content');
  });

  test('reads with non-existent section — returns empty body', () => {
    const created = codaCreate(
      {
        type: 'reference',
        fields: { title: 'No Match', category: 'system', topics: [] },
        body: '## Existing\n\nSome content.\n',
      },
      codaRoot
    );

    const result = codaRead({ record: created.path, section: 'Missing' }, codaRoot);

    expect(result.success).toBe(true);
    expect(result.body).toBe('');
  });

  test('returns error for non-existent file', () => {
    const result = codaRead({ record: 'nonexistent/file.md' }, codaRoot);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
