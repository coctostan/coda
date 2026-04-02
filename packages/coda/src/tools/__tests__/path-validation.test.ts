import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { validateRecordPath } from '../path-validation';

let codaRoot: string;
let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'coda-path-validation-'));
  codaRoot = join(tempDir, '.coda');
  mkdirSync(codaRoot, { recursive: true });
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('validateRecordPath', () => {
  test('allows valid record paths inside .coda', () => {
    expect(validateRecordPath(codaRoot, 'issues/my-issue.md')).toBe(
      resolve(codaRoot, 'issues/my-issue.md')
    );
    expect(validateRecordPath(codaRoot, 'issues/my-issue/plan-v1.md')).toBe(
      resolve(codaRoot, 'issues/my-issue/plan-v1.md')
    );
    expect(validateRecordPath(codaRoot, 'reference/ref-system.md')).toBe(
      resolve(codaRoot, 'reference/ref-system.md')
    );
  });

  test('rejects ../ traversal', () => {
    expect(() => validateRecordPath(codaRoot, '../outside.md')).toThrow(
      'Record path must be within .coda/ directory'
    );
  });

  test('rejects deep traversal attempts', () => {
    expect(() => validateRecordPath(codaRoot, '../../etc/passwd')).toThrow(
      'Record path must be within .coda/ directory'
    );
  });

  test('rejects absolute paths', () => {
    expect(() => validateRecordPath(codaRoot, '/etc/passwd')).toThrow(
      'Record path must be within .coda/ directory'
    );
  });
});
