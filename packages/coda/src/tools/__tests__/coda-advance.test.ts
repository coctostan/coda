import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { codaAdvance } from '../coda-advance';
import { codaCreate } from '../coda-create';
import { readRecord, persistState, createDefaultState } from '@coda/core';
import type { CodaState } from '@coda/core';

let codaRoot: string;
let statePath: string;

beforeEach(() => {
  codaRoot = mkdtempSync(join(tmpdir(), 'coda-advance-'));
  statePath = join(codaRoot, 'state.json');
});

afterEach(() => {
  rmSync(codaRoot, { recursive: true, force: true });
});

/** Helper to create a focused issue with ACs and set up state. */
function setupIssue(acCount: number = 2): string {
  const acs = Array.from({ length: acCount }, (_, i) => ({
    id: `AC-${String(i + 1)}`,
    text: `Criterion ${String(i + 1)}`,
    status: 'pending',
  }));

  const result = codaCreate(
    {
      type: 'issue',
      fields: {
        title: 'Test Issue',
        issue_type: 'feature',
        status: 'proposed',
        phase: 'specify',
        priority: 3,
        topics: [],
        acceptance_criteria: acs,
        open_questions: [],
        deferred_items: [],
        human_review: false,
      },
    },
    codaRoot
  );

  const state: CodaState = {
    ...createDefaultState(),
    focus_issue: 'test-issue',
    phase: 'specify',
  };
  persistState(state, statePath);

  return result.path;
}

describe('codaAdvance', () => {
  test('advance specify→plan with ACs succeeds', () => {
    setupIssue(2);

    const result = codaAdvance({ target_phase: 'plan' }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.previous_phase).toBe('specify');
    expect(result.new_phase).toBe('plan');
  });

  test('updates issue phase in mdbase after successful advance', () => {
    const issuePath = setupIssue(2);

    codaAdvance({ target_phase: 'plan' }, codaRoot, statePath);

    const record = readRecord<Record<string, unknown>>(join(codaRoot, issuePath));
    expect(record.frontmatter['phase']).toBe('plan');
  });

  test('advance specify→plan without ACs fails with gate reason', () => {
    setupIssue(0);

    const result = codaAdvance({ target_phase: 'plan' }, codaRoot, statePath);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('acceptance criterion');
  });

  test('does not modify data on failed advance', () => {
    const issuePath = setupIssue(0);

    codaAdvance({ target_phase: 'plan' }, codaRoot, statePath);

    const record = readRecord<Record<string, unknown>>(join(codaRoot, issuePath));
    expect(record.frontmatter['phase']).toBe('specify');
  });

  test('fails with invalid target phase', () => {
    setupIssue(2);

    const result = codaAdvance({ target_phase: 'build' }, codaRoot, statePath);

    expect(result.success).toBe(false);
    expect(result.reason).toBeDefined();
  });

  test('fails when no issue is focused', () => {
    persistState(createDefaultState(), statePath);

    const result = codaAdvance({ target_phase: 'specify' }, codaRoot, statePath);

    expect(result.success).toBe(false);
    expect(result.error).toContain('focus');
  });
});
