import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDispatcher, exceedsThreshold, FINDINGS_OUTPUT_TEMPLATE } from '../dispatcher';
import type { HookContext } from '../dispatcher';
import { createRegistry } from '../registry';
import type { RegistryConfig } from '../registry';

// --- Test fixtures ---

let promptsDir: string;

beforeAll(() => {
  promptsDir = mkdtempSync(join(tmpdir(), 'coda-dispatcher-test-'));

  // Create security prompts
  mkdirSync(join(promptsDir, 'security'), { recursive: true });
  writeFileSync(
    join(promptsDir, 'security', 'pre-plan.md'),
    '## Security — Pre-Plan Check\nCheck for auth patterns and secrets.'
  );
  writeFileSync(
    join(promptsDir, 'security', 'post-build.md'),
    '## Security — Post-Build Review\nScan for hardcoded secrets and injection risks.'
  );

  // Create tdd prompts
  mkdirSync(join(promptsDir, 'tdd'), { recursive: true });
  writeFileSync(
    join(promptsDir, 'tdd', 'pre-build.md'),
    '## TDD — Pre-Build\nFollow RED-GREEN-REFACTOR.'
  );
  writeFileSync(
    join(promptsDir, 'tdd', 'post-task.md'),
    '## TDD — Post-Task\nVerify tests were written first.'
  );
  writeFileSync(
    join(promptsDir, 'tdd', 'post-build.md'),
    '## TDD — Post-Build Review\nRun full suite and check coverage.'
  );
});

afterAll(() => {
  rmSync(promptsDir, { recursive: true, force: true });
});

function makeContext(overrides: Partial<HookContext> = {}): HookContext {
  return {
    issueSlug: 'test-issue',
    phase: 'build',
    submode: null,
    ...overrides,
  };
}

// --- assemblePrompts tests ---

describe('assemblePrompts', () => {
  test('returns empty string when no modules at hook point', () => {
    const registry = createRegistry({}, promptsDir);
    const dispatcher = createDispatcher(registry, promptsDir);

    const result = dispatcher.assemblePrompts('pre-specify', makeContext());
    expect(result).toBe('');
  });

  test('combines prompts in priority order and appends output template', () => {
    const registry = createRegistry({}, promptsDir);
    const dispatcher = createDispatcher(registry, promptsDir);

    const result = dispatcher.assemblePrompts('post-build', makeContext({
      issueSlug: 'add-auth',
      phase: 'build',
      changedFiles: ['src/auth.ts', 'src/login.ts'],
    }));

    // Should contain context header
    expect(result).toContain('Module Analysis: post-build');
    expect(result).toContain('Issue: add-auth');
    expect(result).toContain('Changed files: src/auth.ts, src/login.ts');

    // Should contain both module prompts (security at priority 130 before tdd at 200)
    const securityIdx = result.indexOf('Security — Post-Build Review');
    const tddIdx = result.indexOf('TDD — Post-Build Review');
    expect(securityIdx).toBeGreaterThan(-1);
    expect(tddIdx).toBeGreaterThan(-1);
    expect(securityIdx).toBeLessThan(tddIdx);

    // Should end with findings template
    expect(result).toContain(FINDINGS_OUTPUT_TEMPLATE);
  });

  test('includes task ID when present', () => {
    const registry = createRegistry({}, promptsDir);
    const dispatcher = createDispatcher(registry, promptsDir);

    const result = dispatcher.assemblePrompts('post-task', makeContext({
      taskId: 3,
    }));

    expect(result).toContain('Task: 3');
  });
});

// --- parseAndCheckFindings tests ---

describe('parseAndCheckFindings', () => {
  test('critical finding at critical threshold → blocked', () => {
    const registry = createRegistry({}, promptsDir); // security threshold = critical
    const dispatcher = createDispatcher(registry, promptsDir);

    const response = '```json\n' + JSON.stringify([
      { module: 'security', check: 'secrets scan', severity: 'critical', finding: 'API key in source' },
    ]) + '\n```';

    const result = dispatcher.parseAndCheckFindings(response, 'post-build');
    expect(result.blocked).toBe(true);
    expect(result.findings).toHaveLength(1);
    expect(result.blockReasons).toHaveLength(1);
    expect(result.blockReasons[0]).toContain('SECURITY BLOCK');
    expect(result.blockReasons[0]).toContain('API key in source');
  });

  test('high finding at critical threshold → NOT blocked', () => {
    const registry = createRegistry({}, promptsDir); // security threshold = critical
    const dispatcher = createDispatcher(registry, promptsDir);

    const response = '```json\n' + JSON.stringify([
      { module: 'security', check: 'auth check', severity: 'high', finding: 'missing validation' },
    ]) + '\n```';

    const result = dispatcher.parseAndCheckFindings(response, 'post-build');
    expect(result.blocked).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.blockReasons).toHaveLength(0);
  });

  test('high finding at high threshold → blocked', () => {
    const registry = createRegistry({}, promptsDir); // tdd threshold = high
    const dispatcher = createDispatcher(registry, promptsDir);

    const response = '```json\n' + JSON.stringify([
      { module: 'tdd', check: 'test coverage', severity: 'high', finding: 'AC-1 has no test' },
    ]) + '\n```';

    const result = dispatcher.parseAndCheckFindings(response, 'post-build');
    expect(result.blocked).toBe(true);
    expect(result.blockReasons[0]).toContain('TDD BLOCK');
  });

  test("module with 'none' threshold → never blocked", () => {
    const config: RegistryConfig = {
      modules: {
        security: { enabled: true, blockThreshold: 'none' },
      },
    };
    const registry = createRegistry(config, promptsDir);
    const dispatcher = createDispatcher(registry, promptsDir);

    const response = '```json\n' + JSON.stringify([
      { module: 'security', check: 'scan', severity: 'critical', finding: 'hardcoded secret' },
    ]) + '\n```';

    const result = dispatcher.parseAndCheckFindings(response, 'post-build');
    expect(result.blocked).toBe(false);
    expect(result.findings).toHaveLength(1);
  });

  test('no JSON in response → zero findings, not blocked (Decision #8)', () => {
    const registry = createRegistry({}, promptsDir);
    const dispatcher = createDispatcher(registry, promptsDir);

    const response = 'I reviewed the code and everything looks fine. No issues found.';

    const result = dispatcher.parseAndCheckFindings(response, 'post-build');
    expect(result.findings).toHaveLength(0);
    expect(result.blocked).toBe(false);
  });

  test('mixed valid/invalid findings → valid preserved', () => {
    const registry = createRegistry({}, promptsDir);
    const dispatcher = createDispatcher(registry, promptsDir);

    const response = '```json\n' + JSON.stringify([
      { module: 'security', check: 'check-1', severity: 'info', finding: 'all good' },
      { severity: 'high', finding: 'missing check field' }, // invalid — no check
      { module: 'tdd', check: 'check-2', severity: 'low', finding: 'minor' },
    ]) + '\n```';

    const result = dispatcher.parseAndCheckFindings(response, 'post-build');
    expect(result.findings).toHaveLength(2);
  });

  test('blockReasons includes assumption text when present', () => {
    const registry = createRegistry({}, promptsDir);
    const dispatcher = createDispatcher(registry, promptsDir);

    const response = '```json\n' + JSON.stringify([
      {
        module: 'security',
        check: 'secrets',
        severity: 'critical',
        finding: 'API key found',
        assumption: 'assumes production deployment',
      },
    ]) + '\n```';

    const result = dispatcher.parseAndCheckFindings(response, 'post-build');
    expect(result.blocked).toBe(true);
    expect(result.blockReasons[0]).toContain('(assumes: assumes production deployment)');
  });

  test('raw JSON array (no fenced block) is parsed', () => {
    const registry = createRegistry({}, promptsDir);
    const dispatcher = createDispatcher(registry, promptsDir);

    const response = 'Here are my findings:\n' + JSON.stringify([
      { module: 'security', check: 'scan', severity: 'info', finding: 'looks good' },
    ]);

    const result = dispatcher.parseAndCheckFindings(response, 'post-build');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.finding).toBe('looks good');
  });
});

// --- exceedsThreshold tests ---

describe('exceedsThreshold', () => {
  test('correct for all severity pairs', () => {
    // At or above threshold → true
    expect(exceedsThreshold('critical', 'critical')).toBe(true);
    expect(exceedsThreshold('critical', 'high')).toBe(true);
    expect(exceedsThreshold('critical', 'medium')).toBe(true);
    expect(exceedsThreshold('critical', 'low')).toBe(true);
    expect(exceedsThreshold('critical', 'info')).toBe(true);

    expect(exceedsThreshold('high', 'high')).toBe(true);
    expect(exceedsThreshold('high', 'medium')).toBe(true);
    expect(exceedsThreshold('medium', 'medium')).toBe(true);

    // Below threshold → false
    expect(exceedsThreshold('high', 'critical')).toBe(false);
    expect(exceedsThreshold('medium', 'high')).toBe(false);
    expect(exceedsThreshold('low', 'medium')).toBe(false);
    expect(exceedsThreshold('info', 'low')).toBe(false);
  });

  test("'none' threshold always returns false", () => {
    expect(exceedsThreshold('critical', 'none')).toBe(false);
    expect(exceedsThreshold('high', 'none')).toBe(false);
    expect(exceedsThreshold('medium', 'none')).toBe(false);
    expect(exceedsThreshold('low', 'none')).toBe(false);
    expect(exceedsThreshold('info', 'none')).toBe(false);
  });
});
