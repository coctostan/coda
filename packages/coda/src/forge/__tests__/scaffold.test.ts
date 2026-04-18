import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { scaffoldCoda, detectBackdrop, getDefaultConfig } from '../scaffold';
import type { CodaConfig } from '../types';
import { createDefaultState } from '@coda/core';

describe('FORGE Scaffold', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'coda-forge-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectBackdrop', () => {
    test('returns greenfield when no .coda/ exists', () => {
      const result = detectBackdrop(tempDir);
      expect(result.type).toBe('greenfield');
    });

    test('returns existing when .coda/ exists', () => {
      const { mkdirSync } = require('fs');
      mkdirSync(join(tempDir, '.coda'));
      const result = detectBackdrop(tempDir);
      expect(result.type).toBe('existing');
    });

    test('returns brownfield when package.json exists but no .coda/', () => {
      const { writeFileSync } = require('fs');
      writeFileSync(join(tempDir, 'package.json'), '{}');
      const result = detectBackdrop(tempDir);
      expect(result.type).toBe('brownfield');
    });

    test('returns brownfield when src/ exists but no .coda/', () => {
      const { mkdirSync } = require('fs');
      mkdirSync(join(tempDir, 'src'));
      const result = detectBackdrop(tempDir);
      expect(result.type).toBe('brownfield');
    });

    test('returns existing even when code indicators present', () => {
      const { mkdirSync, writeFileSync } = require('fs');
      mkdirSync(join(tempDir, '.coda'));
      writeFileSync(join(tempDir, 'package.json'), '{}');
      const result = detectBackdrop(tempDir);
      expect(result.type).toBe('existing');
    });
  });

  describe('scaffoldCoda', () => {
    test('creates .coda/ directory', () => {
      scaffoldCoda(tempDir);
      expect(existsSync(join(tempDir, '.coda'))).toBe(true);
    });

    test('creates reference/, issues/, milestones/ subdirectories', () => {
      scaffoldCoda(tempDir);
      expect(existsSync(join(tempDir, '.coda', 'reference'))).toBe(true);
      expect(existsSync(join(tempDir, '.coda', 'issues'))).toBe(true);
      expect(existsSync(join(tempDir, '.coda', 'milestones'))).toBe(true);
    });

    test('creates coda.json with correct structure', () => {
      scaffoldCoda(tempDir);
      const configPath = join(tempDir, '.coda', 'coda.json');
      expect(existsSync(configPath)).toBe(true);
      const config: CodaConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(config).toHaveProperty('tdd_test_command');
      expect(config).toHaveProperty('full_suite_command');
      expect(config).toHaveProperty('verification_commands');
      expect(config).toHaveProperty('tdd_gate');
      expect(config).not.toHaveProperty('human_review_default');
      expect(config).toHaveProperty('gates');
      expect(config).toHaveProperty('max_review_iterations');
      expect(config).toHaveProperty('max_verify_iterations');
    });

    test('coda.json tdd_test_command and full_suite_command are null', () => {
      scaffoldCoda(tempDir);
      const config: CodaConfig = JSON.parse(
        readFileSync(join(tempDir, '.coda', 'coda.json'), 'utf-8')
      );
      expect(config.tdd_test_command).toBeNull();
      expect(config.full_suite_command).toBeNull();
    });

    test('coda.json verification_commands is empty array', () => {
      scaffoldCoda(tempDir);
      const config: CodaConfig = JSON.parse(
        readFileSync(join(tempDir, '.coda', 'coda.json'), 'utf-8')
      );
      expect(config.verification_commands).toEqual([]);
    });

    test('coda.json tdd_gate has correct boolean flags', () => {
      scaffoldCoda(tempDir);
      const config: CodaConfig = JSON.parse(
        readFileSync(join(tempDir, '.coda', 'coda.json'), 'utf-8')
      );
      expect(config.tdd_gate).toEqual({
        feature: true,
        bugfix: true,
        refactor: true,
        chore: false,
        docs: false,
      });
    });

    test('coda.json gates has correct modes', () => {
      scaffoldCoda(tempDir);
      const config: CodaConfig = JSON.parse(
        readFileSync(join(tempDir, '.coda', 'coda.json'), 'utf-8')
      );
      expect(config.gates).toEqual({
        plan_review: 'human',
        build_review: 'auto-unless-block',
        unify_review: 'human',
      });
    });

    test('coda.json loop iteration defaults are 3', () => {
      scaffoldCoda(tempDir);
      const config: CodaConfig = JSON.parse(
        readFileSync(join(tempDir, '.coda', 'coda.json'), 'utf-8')
      );
      expect(config.max_review_iterations).toBe(3);
      expect(config.max_verify_iterations).toBe(3);
    });

    test('returns codaRoot path', () => {
      const codaRoot = scaffoldCoda(tempDir);
      expect(codaRoot).toBe(join(tempDir, '.coda'));
    });

    test('creates state.json with the default CODA state', () => {
      scaffoldCoda(tempDir);
      const statePath = join(tempDir, '.coda', 'state.json');
      expect(existsSync(statePath)).toBe(true);
      const state = JSON.parse(readFileSync(statePath, 'utf-8'));
      expect(state).toEqual(createDefaultState());
    });
  });

  describe('getDefaultConfig', () => {
    test('returns a valid CodaConfig object', () => {
      const config = getDefaultConfig();
      expect(config.tdd_test_command).toBeNull();
      expect(config.full_suite_command).toBeNull();
      expect(config.verification_commands).toEqual([]);
      expect(config.tdd_gate.feature).toBe(true);
      expect(config.gates?.plan_review).toBe('human');
      expect(config.max_review_iterations).toBe(3);
      expect(config.max_verify_iterations).toBe(3);
    });
  });

  describe('conservative test-command detection (Phase 58 C3)', () => {
    test('seeds `bun test` when a bun lockfile is present alongside package.json', () => {
      const { writeFileSync } = require('fs');
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ name: 'x' }), 'utf-8');
      writeFileSync(join(tempDir, 'bun.lock'), '', 'utf-8');

      scaffoldCoda(tempDir);
      const config: CodaConfig = JSON.parse(
        readFileSync(join(tempDir, '.coda', 'coda.json'), 'utf-8')
      );
      expect(config.tdd_test_command).toBe('bun test');
      expect(config.full_suite_command).toBe('bun test');
    });

    test('seeds `bun test` when bun.lockb (binary) is present', () => {
      const { writeFileSync } = require('fs');
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ name: 'x' }), 'utf-8');
      writeFileSync(join(tempDir, 'bun.lockb'), Buffer.from([0]));

      scaffoldCoda(tempDir);
      const config: CodaConfig = JSON.parse(
        readFileSync(join(tempDir, '.coda', 'coda.json'), 'utf-8')
      );
      expect(config.tdd_test_command).toBe('bun test');
      expect(config.full_suite_command).toBe('bun test');
    });

    test('seeds `bun test` when package.json explicitly declares a bun test script', () => {
      const { writeFileSync } = require('fs');
      writeFileSync(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'x', scripts: { test: 'bun test' } }),
        'utf-8'
      );

      scaffoldCoda(tempDir);
      const config: CodaConfig = JSON.parse(
        readFileSync(join(tempDir, '.coda', 'coda.json'), 'utf-8')
      );
      expect(config.tdd_test_command).toBe('bun test');
      expect(config.full_suite_command).toBe('bun test');
    });

    test('leaves commands null for npm-style projects (runner semantics not safe)', () => {
      // npm passes patterns via `-- <pattern>`; coda_run_tests appends the
      // pattern as a positional arg, which is not compatible. Leave unset.
      const { writeFileSync } = require('fs');
      writeFileSync(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'x', scripts: { test: 'jest' } }),
        'utf-8'
      );
      writeFileSync(join(tempDir, 'package-lock.json'), '{}', 'utf-8');

      scaffoldCoda(tempDir);
      const config: CodaConfig = JSON.parse(
        readFileSync(join(tempDir, '.coda', 'coda.json'), 'utf-8')
      );
      expect(config.tdd_test_command).toBeNull();
      expect(config.full_suite_command).toBeNull();
    });

    test('leaves commands null for a greenfield project with no package.json', () => {
      scaffoldCoda(tempDir);
      const config: CodaConfig = JSON.parse(
        readFileSync(join(tempDir, '.coda', 'coda.json'), 'utf-8')
      );
      expect(config.tdd_test_command).toBeNull();
      expect(config.full_suite_command).toBeNull();
    });

    test('getDefaultConfig with no projectRoot returns nulls (conservative default)', () => {
      const config = getDefaultConfig();
      expect(config.tdd_test_command).toBeNull();
      expect(config.full_suite_command).toBeNull();
    });
  });
});
