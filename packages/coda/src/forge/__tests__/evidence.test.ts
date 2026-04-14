import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { writeEvidence, readEvidence, readAllEvidence, EVIDENCE_DIR } from '../evidence';
import type { EvidenceFrontmatter } from '../evidence';

describe('Evidence File Management', () => {
  let tempDir: string;
  let codaRoot: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'coda-evidence-'));
    codaRoot = join(tempDir, '.coda');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function makeFrontmatter(module: string): EvidenceFrontmatter {
    return {
      module,
      scanned_at: '2026-04-03T10:00:00Z',
      files_read: ['src/index.ts', 'package.json'],
      commands_run: ['find src -type f'],
    };
  }

  test('writeEvidence creates file at correct path with frontmatter', () => {
    const fm = makeFrontmatter('security');
    const body = '## Findings\nFound auth middleware in src/middleware/auth.ts.\n';
    const path = writeEvidence(codaRoot, 'security', fm, body);

    expect(path).toBe(join(codaRoot, EVIDENCE_DIR, 'EVIDENCE-security.md'));
    expect(existsSync(path)).toBe(true);
  });

  test('writeEvidence creates onboarding directory recursively', () => {
    const fm = makeFrontmatter('architecture');
    writeEvidence(codaRoot, 'architecture', fm, '## Patterns\nMVC detected.\n');

    expect(existsSync(join(codaRoot, EVIDENCE_DIR))).toBe(true);
  });

  test('readEvidence returns parsed record for existing module', () => {
    const fm = makeFrontmatter('security');
    const body = '## Findings\nAPI key exposure risk.\n';
    writeEvidence(codaRoot, 'security', fm, body);

    const result = readEvidence(codaRoot, 'security');
    expect(result).not.toBeNull();
    expect(result!.frontmatter.module).toBe('security');
    expect(result!.frontmatter.scanned_at).toBe('2026-04-03T10:00:00Z');
    expect(result!.frontmatter.files_read).toEqual(['src/index.ts', 'package.json']);
    expect(result!.body).toContain('API key exposure risk');
  });

  test('readEvidence returns null for missing module', () => {
    const result = readEvidence(codaRoot, 'nonexistent');
    expect(result).toBeNull();
  });

  test('readAllEvidence returns all evidence files sorted by filename', () => {
    writeEvidence(codaRoot, 'security', makeFrontmatter('security'), '## Security\n');
    writeEvidence(codaRoot, 'architecture', makeFrontmatter('architecture'), '## Architecture\n');
    writeEvidence(codaRoot, 'universal', makeFrontmatter('universal'), '## Universal\n');

    const results = readAllEvidence(codaRoot);
    expect(results).toHaveLength(3);
    // Sorted: EVIDENCE-architecture, EVIDENCE-security, EVIDENCE-universal
    expect(results[0]!.frontmatter.module).toBe('architecture');
    expect(results[1]!.frontmatter.module).toBe('security');
    expect(results[2]!.frontmatter.module).toBe('universal');
  });

  test('readAllEvidence returns empty array when directory does not exist', () => {
    const results = readAllEvidence(codaRoot);
    expect(results).toEqual([]);
  });
});
