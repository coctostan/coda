import { describe, test, expect } from 'bun:test';
import { validateFinding, validateFindings } from '../finding-schema';
import { SEVERITY_ORDER } from '../types';
import type { FindingSeverity } from '../types';

describe('validateFinding', () => {
  test('finding with all fields validates correctly', () => {
    const raw = {
      module: 'security',
      hookPoint: 'post-build',
      file: 'src/auth.ts',
      check: 'hardcoded secrets scan',
      severity: 'critical',
      finding: 'API key found in source',
      assumption: 'assumes this is a real API key',
      recommendation: 'use environment variable',
      evidence: 'const API_KEY = "sk-live-..."',
    };

    const result = validateFinding(raw);
    expect(result).not.toBeNull();
    expect(result!.module).toBe('security');
    expect(result!.hookPoint).toBe('post-build');
    expect(result!.file).toBe('src/auth.ts');
    expect(result!.check).toBe('hardcoded secrets scan');
    expect(result!.severity).toBe('critical');
    expect(result!.finding).toBe('API key found in source');
    expect(result!.assumption).toBe('assumes this is a real API key');
    expect(result!.recommendation).toBe('use environment variable');
    expect(result!.evidence).toBe('const API_KEY = "sk-live-..."');
  });

  test('finding missing optional fields validates (they are optional)', () => {
    const raw = {
      module: 'security',
      check: 'auth check',
      severity: 'info',
      finding: 'No issues found',
    };

    const result = validateFinding(raw);
    expect(result).not.toBeNull();
    expect(result!.module).toBe('security');
    expect(result!.check).toBe('auth check');
    expect(result!.severity).toBe('info');
    expect(result!.finding).toBe('No issues found');
    expect(result!.file).toBeUndefined();
    expect(result!.assumption).toBeUndefined();
    expect(result!.recommendation).toBeUndefined();
    expect(result!.evidence).toBeUndefined();
    expect(result!.hookPoint).toBeUndefined();
  });

  test('finding missing required field returns null', () => {
    // Missing check
    expect(validateFinding({
      module: 'security',
      severity: 'high',
      finding: 'something',
    })).toBeNull();

    // Missing severity
    expect(validateFinding({
      module: 'security',
      check: 'auth check',
      finding: 'something',
    })).toBeNull();

    // Missing finding
    expect(validateFinding({
      module: 'security',
      check: 'auth check',
      severity: 'high',
    })).toBeNull();
  });

  test('invalid severity value returns null', () => {
    const raw = {
      module: 'security',
      check: 'auth check',
      severity: 'super-critical',
      finding: 'something bad',
    };

    expect(validateFinding(raw)).toBeNull();
  });

  test('extra fields on finding are ignored (not rejected)', () => {
    const raw = {
      module: 'security',
      check: 'auth check',
      severity: 'low',
      finding: 'minor issue',
      custom_note: 'this is extra',
      internal_id: 42,
      nested: { deep: true },
    };

    const result = validateFinding(raw);
    expect(result).not.toBeNull();
    expect(result!.module).toBe('security');
    expect(result!.severity).toBe('low');
    // Extra fields should not appear on the result
    expect((result as unknown as Record<string, unknown>)['custom_note']).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)['internal_id']).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)['nested']).toBeUndefined();
  });

  test('null, undefined, and non-object inputs return null', () => {
    expect(validateFinding(null)).toBeNull();
    expect(validateFinding(undefined)).toBeNull();
    expect(validateFinding('string')).toBeNull();
    expect(validateFinding(42)).toBeNull();
    expect(validateFinding(true)).toBeNull();
  });

  test('missing module field produces finding with empty string module', () => {
    const raw = {
      check: 'auth check',
      severity: 'info',
      finding: 'looks good',
    };

    const result = validateFinding(raw);
    expect(result).not.toBeNull();
    expect(result!.module).toBe('');
  });
});

describe('validateFindings', () => {
  test('array with mix of valid/invalid returns only valid ones', () => {
    const raw = [
      { module: 'security', check: 'check-1', severity: 'high', finding: 'found issue' },
      { module: 'security', severity: 'high', finding: 'missing check field' },  // invalid — no check
      { module: 'tdd', check: 'check-2', severity: 'info', finding: 'all good' },
    ];

    const results = validateFindings(raw);
    expect(results).toHaveLength(2);
    expect(results[0]!.check).toBe('check-1');
    expect(results[1]!.check).toBe('check-2');
  });

  test('empty array input returns empty array output', () => {
    expect(validateFindings([])).toEqual([]);
  });

  test('non-array input returns empty array', () => {
    expect(validateFindings('not an array')).toEqual([]);
    expect(validateFindings(null)).toEqual([]);
    expect(validateFindings(undefined)).toEqual([]);
    expect(validateFindings(42)).toEqual([]);
    expect(validateFindings({})).toEqual([]);
  });
});

describe('SEVERITY_ORDER', () => {
  test('critical > high > medium > low > info', () => {
    expect(SEVERITY_ORDER.critical).toBeGreaterThan(SEVERITY_ORDER.high);
    expect(SEVERITY_ORDER.high).toBeGreaterThan(SEVERITY_ORDER.medium);
    expect(SEVERITY_ORDER.medium).toBeGreaterThan(SEVERITY_ORDER.low);
    expect(SEVERITY_ORDER.low).toBeGreaterThan(SEVERITY_ORDER.info);
  });

  test('all severity values have numeric ordering', () => {
    const severities: FindingSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];
    for (const s of severities) {
      expect(typeof SEVERITY_ORDER[s]).toBe('number');
    }
  });
});
