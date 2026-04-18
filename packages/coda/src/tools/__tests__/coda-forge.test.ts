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
    expect(result.next_action).toContain('coda_create');
    expect(result.next_action).toContain('coda_focus');
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
      next_action: 'Use coda_create to create the next issue, then coda_focus to begin its lifecycle.',
    });
    expect(existsSync(join(projectRoot, '.coda', 'sentinel.txt'))).toBe(true);
    expect(existsSync(join(projectRoot, '.coda', 'coda.json'))).toBe(false);
  });

  test('greenfield next_action explicitly tells the operator to configure test commands via coda_config when unset', () => {
    // Phase 58 C3: when scaffold leaves tdd_test_command / full_suite_command null,
    // the forge handoff must name coda_config as the concrete follow-up so the agent
    // does not hit a latent TDD configuration trap later.
    process.chdir(projectRoot);
    const result = codaForge({}, process.cwd());

    const config = JSON.parse(
      readFileSync(join(projectRoot, '.coda', 'coda.json'), 'utf-8')
    ) as { tdd_test_command: unknown; full_suite_command: unknown };
    expect(config.tdd_test_command).toBeNull();
    expect(config.full_suite_command).toBeNull();

    expect(result.next_action).toMatch(/coda_config/);
    expect(result.next_action).toMatch(/tdd_test_command|test command/i);
  });

  test('next_action omits the coda_config nag when scaffold could seed a safe default', () => {
    // When bun.lock is present alongside package.json, scaffold seeds `bun test`
    // for both commands. The next_action should NOT ask the agent to reconfigure
    // test commands because nothing is actually missing.
    writeFileSync(join(projectRoot, 'package.json'), JSON.stringify({ name: 'x' }), 'utf-8');
    writeFileSync(join(projectRoot, 'bun.lock'), '', 'utf-8');

    const result = codaForge({}, projectRoot);

    const config = JSON.parse(
      readFileSync(join(projectRoot, '.coda', 'coda.json'), 'utf-8')
    ) as { tdd_test_command: unknown };
    expect(config.tdd_test_command).toBe('bun test');
    expect(result.next_action).not.toMatch(/configure.*tdd_test_command|configure.*test command/i);
  });

  test('brownfield next_action also names coda_config when test commands stay null', () => {
    // Brownfield handoff uses a different wording but must still surface the
    // missing test-command configuration so TDD does not silently break.
    writeFileSync(join(projectRoot, 'package.json'), JSON.stringify({ name: 'x', scripts: {} }), 'utf-8');
    mkdirSync(join(projectRoot, 'src'), { recursive: true });

    const result = codaForge({}, projectRoot);

    const config = JSON.parse(
      readFileSync(join(projectRoot, '.coda', 'coda.json'), 'utf-8')
    ) as { tdd_test_command: unknown };
    expect(config.tdd_test_command).toBeNull();
    expect(result.next_action).toMatch(/coda_config/);
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
