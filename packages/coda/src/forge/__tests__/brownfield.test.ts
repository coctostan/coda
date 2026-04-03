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
} from '../brownfield';

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
