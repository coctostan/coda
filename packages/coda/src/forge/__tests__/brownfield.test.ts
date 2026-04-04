import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import {
  getUniversalScanTargets,
  getSourceDirectory,
  assembleScanContext,
  UNIVERSAL_SCAN_TARGETS,
  UNIVERSAL_COMMANDS,
  assembleSynthesizeContext,
  SYNTHESIZE_REF_DOCS,
} from '../brownfield';
import { writeEvidence } from '../evidence';
import type { EvidenceFrontmatter } from '../evidence';

// Resolve the real prompts directory from the repo root
const promptsDir = resolve(__dirname, '../../../../../modules/prompts');

describe('Brownfield SCAN', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'coda-brownfield-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getUniversalScanTargets', () => {
    test('returns only files that exist', () => {
      writeFileSync(join(tempDir, 'README.md'), '# Hello');
      writeFileSync(join(tempDir, 'package.json'), '{}');

      const targets = getUniversalScanTargets(tempDir);
      expect(targets).toContain('README.md');
      expect(targets).toContain('package.json');
      expect(targets).not.toContain('Cargo.toml');
      expect(targets).not.toContain('CONTRIBUTING.md');
    });

    test('returns empty array for empty project', () => {
      const targets = getUniversalScanTargets(tempDir);
      expect(targets).toEqual([]);
    });
  });

  describe('getSourceDirectory', () => {
    test('returns src when src/ exists', () => {
      mkdirSync(join(tempDir, 'src'));
      expect(getSourceDirectory(tempDir)).toBe('src');
    });

    test('returns lib when lib/ exists but not src/', () => {
      mkdirSync(join(tempDir, 'lib'));
      expect(getSourceDirectory(tempDir)).toBe('lib');
    });

    test('returns null when no source dirs exist', () => {
      expect(getSourceDirectory(tempDir)).toBeNull();
    });

    test('prefers src over lib when both exist', () => {
      mkdirSync(join(tempDir, 'src'));
      mkdirSync(join(tempDir, 'lib'));
      expect(getSourceDirectory(tempDir)).toBe('src');
    });
  });

  describe('UNIVERSAL_SCAN_TARGETS', () => {
    test('contains expected entries', () => {
      expect(UNIVERSAL_SCAN_TARGETS).toContain('README.md');
      expect(UNIVERSAL_SCAN_TARGETS).toContain('package.json');
      expect(UNIVERSAL_SCAN_TARGETS).toContain('Cargo.toml');
      expect(UNIVERSAL_SCAN_TARGETS).toContain('go.mod');
      expect(UNIVERSAL_SCAN_TARGETS).toContain('AGENTS.md');
      expect(UNIVERSAL_SCAN_TARGETS.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('UNIVERSAL_COMMANDS', () => {
    test('contains expected base commands', () => {
      expect(UNIVERSAL_COMMANDS).toContain('git log --oneline -20');
      expect(UNIVERSAL_COMMANDS).toContain('ls -la');
    });
  });

  describe('assembleScanContext', () => {
    test('returns universalTargets, sourceDir, commands, and modulePrompts', () => {
      writeFileSync(join(tempDir, 'README.md'), '# Project');
      writeFileSync(join(tempDir, 'package.json'), '{}');
      mkdirSync(join(tempDir, 'src'));

      const ctx = assembleScanContext(tempDir, promptsDir);
      expect(ctx.universalTargets).toContain('README.md');
      expect(ctx.universalTargets).toContain('package.json');
      expect(ctx.sourceDir).toBe('src');
      expect(ctx.universalCommands.length).toBeGreaterThan(0);
      expect(typeof ctx.modulePrompts).toBe('string');
    });

    test('modulePrompts is non-empty when modules have init-scan hooks', () => {
      writeFileSync(join(tempDir, 'package.json'), '{}');

      const ctx = assembleScanContext(tempDir, promptsDir);
      expect(ctx.modulePrompts.length).toBeGreaterThan(0);
      expect(ctx.modulePrompts).toContain('init-scan');
    });

    test('universalCommands includes find command when sourceDir exists', () => {
      mkdirSync(join(tempDir, 'src'));

      const ctx = assembleScanContext(tempDir, promptsDir);
      const findCmd = ctx.universalCommands.find((c) => c.startsWith('find src'));
      expect(findCmd).toBeDefined();
      expect(findCmd).toContain('head -50');
    });

    test('universalCommands has no find command when no sourceDir', () => {
      const ctx = assembleScanContext(tempDir, promptsDir);
      expect(ctx.sourceDir).toBeNull();
      const findCmd = ctx.universalCommands.find((c) => c.startsWith('find'));
      expect(findCmd).toBeUndefined();
    });
  });
});

describe('Brownfield SYNTHESIZE', () => {
  let tempDir: string;
  let codaRoot: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'coda-synth-'));
    codaRoot = join(tempDir, '.coda');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function makeFm(module: string): EvidenceFrontmatter {
    return {
      module,
      scanned_at: '2026-04-03T10:00:00Z',
      files_read: ['src/index.ts'],
      commands_run: ['ls'],
    };
  }

  test('evidence loaded from SCAN files', () => {
    writeEvidence(codaRoot, 'security', makeFm('security'), '## Security\nAuth found.\n');
    writeEvidence(codaRoot, 'architecture', makeFm('architecture'), '## Architecture\nMVC pattern.\n');

    const ctx = assembleSynthesizeContext(codaRoot);
    expect(ctx.evidenceCount).toBe(2);
    expect(ctx.evidence).toHaveLength(2);
    expect(ctx.evidence[0]!.module).toBe('architecture'); // sorted by filename
    expect(ctx.evidence[1]!.module).toBe('security');
    expect(ctx.evidence[1]!.body).toContain('Auth found');
  });

  test('empty evidence returns zero count', () => {
    const ctx = assembleSynthesizeContext(codaRoot);
    expect(ctx.evidenceCount).toBe(0);
    expect(ctx.evidence).toEqual([]);
  });

  test('refDocs matches SYNTHESIZE_REF_DOCS', () => {
    const ctx = assembleSynthesizeContext(codaRoot);
    expect(ctx.refDocs).toBe(SYNTHESIZE_REF_DOCS);
  });

  test('SYNTHESIZE_REF_DOCS has all 4 ref docs', () => {
    const names = SYNTHESIZE_REF_DOCS.map((r) => r.name);
    expect(names).toContain('ref-system.md');
    expect(names).toContain('ref-architecture.md');
    expect(names).toContain('ref-conventions.md');
    expect(names).toContain('ref-prd.md');
    expect(SYNTHESIZE_REF_DOCS).toHaveLength(4);
  });

  test('every ref doc has non-empty sourceEvidence', () => {
    for (const doc of SYNTHESIZE_REF_DOCS) {
      expect(doc.sourceEvidence.length).toBeGreaterThan(0);
    }
  });
});