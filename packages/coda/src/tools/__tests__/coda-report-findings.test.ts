import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDefaultState, persistState } from '@coda/core';
import { codaReportFindings } from '../coda-report-findings';

let codaRoot: string;
let statePath: string;

beforeEach(() => {
  codaRoot = mkdtempSync(join(tmpdir(), 'coda-report-findings-'));
  statePath = join(codaRoot, 'state.json');
});

afterEach(() => {
  rmSync(codaRoot, { recursive: true, force: true });
});

describe('codaReportFindings', () => {
  test('parses and persists module findings for the focused issue', () => {
    persistState({
      ...createDefaultState(),
      focus_issue: 'my-feature',
      phase: 'build',
    }, statePath);

    const result = codaReportFindings({
      hook_point: 'post-build',
      findings_json: JSON.stringify([
        {
          module: 'security',
          check: 'secrets scan',
          severity: 'critical',
          finding: 'Hardcoded API key in src/auth.ts',
          assumption: 'the credential is real',
        },
      ]),
    }, codaRoot, statePath);

    const findingsPath = join(codaRoot, 'issues', 'my-feature', 'module-findings.json');
    expect(result).toMatchObject({
      success: true,
      issue: 'my-feature',
      hook_point: 'post-build',
      finding_count: 1,
      blocked: true,
    });
    expect(result.block_reasons?.[0]).toContain('SECURITY BLOCK');
    expect(existsSync(findingsPath)).toBe(true);

    const persisted = JSON.parse(readFileSync(findingsPath, 'utf-8')) as {
      issue: string;
      hookResults: Array<{ hookPoint: string; blocked: boolean; findings: unknown[] }>;
    };
    expect(persisted.issue).toBe('my-feature');
    expect(persisted.hookResults).toHaveLength(1);
    expect(persisted.hookResults[0]).toMatchObject({
      hookPoint: 'post-build',
      blocked: true,
    });
    expect(persisted.hookResults[0]?.findings).toHaveLength(1);
  });

  test('fails when no focus issue is set', () => {
    persistState(createDefaultState(), statePath);

    const result = codaReportFindings({
      hook_point: 'post-build',
      findings_json: '[]',
    }, codaRoot, statePath);

    expect(result.success).toBe(false);
    expect(result.error).toContain('focus issue');
  });

  test('fails for an invalid hook point', () => {
    persistState({
      ...createDefaultState(),
      focus_issue: 'my-feature',
      phase: 'build',
    }, statePath);

    const result = codaReportFindings({
      hook_point: 'after-agent-turn',
      findings_json: '[]',
    }, codaRoot, statePath);

    expect(result).toMatchObject({
      success: false,
      error: 'Invalid hook point: after-agent-turn',
    });
  });
});
