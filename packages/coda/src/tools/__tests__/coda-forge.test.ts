import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { codaForge } from '../coda-forge';

describe('codaForge', () => {
  let projectRoot: string;
  let originalCwd: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'coda-forge-'));
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(projectRoot, { recursive: true, force: true });
  });

  test('scaffolds a greenfield workspace and returns a next action', () => {
    process.chdir(projectRoot);
    const cwd = process.cwd();

    const result = codaForge({}, cwd);

    expect(result).toMatchObject({
      status: 'scaffolded',
      backdrop: 'greenfield',
      coda_root: join(cwd, '.coda'),
    });
    expect(result.next_action.length).toBeGreaterThan(0);
    expect(existsSync(join(projectRoot, '.coda'))).toBe(true);

    const config = JSON.parse(readFileSync(join(projectRoot, '.coda', 'coda.json'), 'utf-8')) as {
      modules?: {
        security?: { enabled?: boolean };
        tdd?: { enabled?: boolean };
      };
    };
    expect(config.modules?.security?.enabled).toBe(true);
    expect(config.modules?.tdd?.enabled).toBe(true);
  });

  test('scaffolds a brownfield workspace and returns scan context', () => {
    writeFileSync(join(projectRoot, 'package.json'), '{}', 'utf-8');
    mkdirSync(join(projectRoot, 'src'), { recursive: true });

    const result = codaForge({}, projectRoot);

    expect(result).toMatchObject({
      status: 'scaffolded',
      backdrop: 'brownfield',
      coda_root: join(projectRoot, '.coda'),
    });
    if (result.backdrop !== 'brownfield') {
      throw new Error(`Expected brownfield result, received ${result.backdrop}`);
    }
    if (!result.scan_context) {
      throw new Error('Expected brownfield result to include scan_context');
    }
    expect(result.scan_context.universalTargets).toContain('package.json');
    expect(result.scan_context.universalTargets.length).toBeGreaterThan(0);
    expect(result.scan_context.sourceDir).toBe('src');
    expect(existsSync(join(projectRoot, '.coda', 'coda.json'))).toBe(true);
  });

  test('returns already_initialized without mutating an existing .coda directory', () => {
    mkdirSync(join(projectRoot, '.coda'), { recursive: true });
    writeFileSync(join(projectRoot, '.coda', 'sentinel.txt'), 'keep me', 'utf-8');

    const result = codaForge({}, projectRoot);

    expect(result).toEqual({
      status: 'already_initialized',
      backdrop: 'existing',
      coda_root: join(projectRoot, '.coda'),
      next_action: 'Use coda_status to see current state',
    });
    expect(existsSync(join(projectRoot, '.coda', 'sentinel.txt'))).toBe(true);
    expect(existsSync(join(projectRoot, '.coda', 'coda.json'))).toBe(false);
  });

  test('honors project_root explicitly and otherwise uses the provided default project root', () => {
    const explicitRoot = mkdtempSync(join(tmpdir(), 'coda-forge-explicit-'));

    try {
      const explicitResult = codaForge({ project_root: explicitRoot }, projectRoot);
      const defaultResult = codaForge({}, projectRoot);

      expect(explicitResult.coda_root).toBe(join(explicitRoot, '.coda'));
      expect(existsSync(join(explicitRoot, '.coda', 'coda.json'))).toBe(true);
      expect(defaultResult.coda_root).toBe(join(projectRoot, '.coda'));
      expect(existsSync(join(projectRoot, '.coda', 'coda.json'))).toBe(true);
    } finally {
      rmSync(explicitRoot, { recursive: true, force: true });
    }
  });
});
