import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { listRecords } from '../directory';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'coda-directory-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('listRecords', () => {
  test('returns .md files in a directory', () => {
    writeFileSync(join(tempDir, 'issue-1.md'), '---\ntitle: One\n---\n');
    writeFileSync(join(tempDir, 'issue-2.md'), '---\ntitle: Two\n---\n');

    const result = listRecords(tempDir);

    expect(result).toHaveLength(2);
    expect(result).toContain(join(tempDir, 'issue-1.md'));
    expect(result).toContain(join(tempDir, 'issue-2.md'));
  });

  test('ignores non-.md files', () => {
    writeFileSync(join(tempDir, 'issue.md'), '---\ntitle: Issue\n---\n');
    writeFileSync(join(tempDir, 'config.json'), '{}');
    writeFileSync(join(tempDir, 'notes.txt'), 'notes');

    const result = listRecords(tempDir);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('issue.md');
  });

  test('returns empty array for empty directory', () => {
    const result = listRecords(tempDir);
    expect(result).toEqual([]);
  });

  test('handles non-existent directory gracefully', () => {
    const result = listRecords(join(tempDir, 'nonexistent'));
    expect(result).toEqual([]);
  });

  test('returns files sorted alphabetically', () => {
    writeFileSync(join(tempDir, 'charlie.md'), '---\ntitle: C\n---\n');
    writeFileSync(join(tempDir, 'alpha.md'), '---\ntitle: A\n---\n');
    writeFileSync(join(tempDir, 'bravo.md'), '---\ntitle: B\n---\n');

    const result = listRecords(tempDir);

    expect(result).toHaveLength(3);
    expect(result[0]).toContain('alpha.md');
    expect(result[1]).toContain('bravo.md');
    expect(result[2]).toContain('charlie.md');
  });

  test('does not recurse into subdirectories', () => {
    writeFileSync(join(tempDir, 'top.md'), '---\ntitle: Top\n---\n');
    mkdirSync(join(tempDir, 'subdir'));
    writeFileSync(join(tempDir, 'subdir', 'nested.md'), '---\ntitle: Nested\n---\n');

    const result = listRecords(tempDir);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('top.md');
  });
});
