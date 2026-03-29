import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { scaffoldCoda, detectBackdrop, getDefaultConfig } from '../scaffold';
import type { CodaConfig } from '../types';

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
      expect(config).toHaveProperty('human_review_default');
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

    test('coda.json human_review_default has correct boolean flags', () => {
      scaffoldCoda(tempDir);
      const config: CodaConfig = JSON.parse(
        readFileSync(join(tempDir, '.coda', 'coda.json'), 'utf-8')
      );
      expect(config.human_review_default).toEqual({
        feature: true,
        bugfix: true,
        refactor: false,
        chore: false,
        docs: false,
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
  });

  describe('getDefaultConfig', () => {
    test('returns a valid CodaConfig object', () => {
      const config = getDefaultConfig();
      expect(config.tdd_test_command).toBeNull();
      expect(config.full_suite_command).toBeNull();
      expect(config.verification_commands).toEqual([]);
      expect(config.tdd_gate.feature).toBe(true);
      expect(config.human_review_default.refactor).toBe(false);
      expect(config.max_review_iterations).toBe(3);
      expect(config.max_verify_iterations).toBe(3);
    });
  });
});
