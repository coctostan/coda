import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { codaAdvance } from '../coda-advance';
import { codaCreate } from '../coda-create';
import { codaConfig } from '../coda-config';
import {
  createDefaultState,
  persistState,
  writeRecord,
  readRecord,
} from '@coda/core';
import type { PlanRecord, CompletionRecord } from '@coda/core';
import { getDefaultConfig } from '../../forge/scaffold';
import type { CodaConfig } from '../../forge/types';

let codaRoot: string;
let statePath: string;

beforeEach(() => {
  codaRoot = mkdtempSync(join(tmpdir(), 'coda-gate-auto-'));
  statePath = join(codaRoot, 'state.json');
});

afterEach(() => {
  rmSync(codaRoot, { recursive: true, force: true });
});

/** Write a coda.json config with gate overrides. */
function writeConfig(overrides: Partial<CodaConfig> = {}): void {
  const config = { ...getDefaultConfig(), ...overrides };
  writeFileSync(join(codaRoot, 'coda.json'), JSON.stringify(config, null, 2), 'utf-8');
}

/** Set up an issue in review phase with human_review=true and an approved plan. */
function setupReviewPhase(opts: { humanReview?: boolean } = {}): void {
  const humanReview = opts.humanReview ?? true;

  codaCreate({
    type: 'issue',
    fields: {
      title: 'Test Issue',
      issue_type: 'feature',
      status: 'active',
      phase: 'review',
      priority: 3,
      topics: [],
      acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'pending' }],
      open_questions: [],
      deferred_items: [],
      human_review: humanReview,
    },
  }, codaRoot);

  const planPath = join(codaRoot, 'issues', 'test-issue', 'plan-v1.md');
  writeRecord<PlanRecord>(planPath, {
    title: 'Implementation Plan',
    issue: 'test-issue',
    status: 'approved',
    iteration: 1,
    task_count: 0,
    human_review_status: 'pending',
  }, '## Approach\nImplement the plan.\n');

  persistState({
    ...createDefaultState(),
    focus_issue: 'test-issue',
    phase: 'review',
    submode: 'review',
    loop_iteration: 2,
  }, statePath);
}

/** Set up an issue in build phase with completed tasks. */
function setupBuildPhase(): void {
  codaCreate({
    type: 'issue',
    fields: {
      title: 'Test Issue',
      issue_type: 'feature',
      status: 'active',
      phase: 'build',
      priority: 3,
      topics: [],
      acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'pending' }],
      open_questions: [],
      deferred_items: [],
      human_review: false,
    },
  }, codaRoot);

  const planPath = join(codaRoot, 'issues', 'test-issue', 'plan-v1.md');
  writeRecord<PlanRecord>(planPath, {
    title: 'Implementation Plan',
    issue: 'test-issue',
    status: 'approved',
    iteration: 1,
    task_count: 0,
    human_review_status: 'approved',
  }, '## Approach\nDone.\n');

  persistState({
    ...createDefaultState(),
    focus_issue: 'test-issue',
    phase: 'build',
  }, statePath);
}

/** Set up an issue in unify phase with a pending completion record. */
function setupUnifyPhase(): void {
  codaCreate({
    type: 'issue',
    fields: {
      title: 'Test Issue',
      issue_type: 'feature',
      status: 'active',
      phase: 'unify',
      priority: 3,
      topics: [],
      acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'met' }],
      open_questions: [],
      deferred_items: [],
      human_review: false,
    },
  }, codaRoot);

  // Create records dir and completion record
  const recordsDir = join(codaRoot, 'records');
  mkdirSync(recordsDir, { recursive: true });
  const recordPath = join(recordsDir, 'test-issue-completion.md');
  writeRecord<CompletionRecord>(recordPath, {
    issue: 'test-issue',
    title: 'Test Issue Completion',
    completed_at: '2026-04-15T00:00:00Z',
    topics: [],
    system_spec_updated: true,
    reference_docs_reviewed: true,
    milestone_updated: true,
    unify_review_status: 'pending',
    exemptions: {
      overlays: 'no project-specific patterns emerged in this fixture',
      reference_docs: 'no system change in this fixture',
    },
  }, '## Summary\nDone.\n');

  persistState({
    ...createDefaultState(),
    focus_issue: 'test-issue',
    phase: 'unify',
  }, statePath);
}

describe('coda_advance with gate automation', () => {
  test('review→build with plan_review: auto skips human review', () => {
    writeConfig({
      gates: {
        plan_review: 'auto',
        build_review: 'auto-unless-block',
        unify_review: 'human',
      },
    });
    setupReviewPhase({ humanReview: true });

    // Even though human_review is true on the issue, gate config overrides to auto
    const result = codaAdvance({ target_phase: 'build' }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.new_phase).toBe('build');
  });

  test('review→build with plan_review: human requires human review', () => {
    writeConfig({
      gates: {
        plan_review: 'human',
        build_review: 'auto-unless-block',
        unify_review: 'human',
      },
    });
    setupReviewPhase({ humanReview: true });

    // plan_review: human + pending review → should block
    const result = codaAdvance({ target_phase: 'build' }, codaRoot, statePath);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('Human plan review pending');
  });

  test('build→verify with build_review: auto skips module findings check', () => {
    writeConfig({
      gates: {
        plan_review: 'human',
        build_review: 'auto',
        unify_review: 'human',
      },
      // Enable a module so that the precondition would normally fire
      modules: {
        security: { enabled: true, blockThreshold: 'critical' },
      },
    });
    setupBuildPhase();

    // With build_review: auto, module findings precondition is skipped
    const result = codaAdvance({ target_phase: 'verify' }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.new_phase).toBe('verify');
  });

  test('unify→done with unify_review: auto auto-approves completion record', () => {
    writeConfig({
      gates: {
        plan_review: 'human',
        build_review: 'auto-unless-block',
        unify_review: 'auto',
      },
    });
    setupUnifyPhase();

    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.new_phase).toBe('done');

    // Verify the completion record was auto-approved
    const recordPath = join(codaRoot, 'records', 'test-issue-completion.md');
    const record = readRecord<CompletionRecord>(recordPath);
    expect(record.frontmatter.unify_review_status).toBe('approved');
  });
});

describe('default scaffold gate config', () => {
  test('has correct gate defaults', () => {
    const config = getDefaultConfig();

    expect(config.gates).toBeDefined();
    expect(config.gates?.plan_review).toBe('human');
    expect(config.gates?.build_review).toBe('auto-unless-block');
    expect(config.gates?.unify_review).toBe('human');
  });
});

describe('coda_config accepts gate keys', () => {
  test('accepts gates and gate_overrides keys', () => {
    writeConfig();

    const setResult = codaConfig({
      action: 'set',
      key: 'gates',
      value: { plan_review: 'auto', build_review: 'auto', unify_review: 'auto' },
    }, codaRoot);
    expect(setResult.success).toBe(true);

    const getResult = codaConfig({
      action: 'get',
      key: 'gates',
    }, codaRoot);
    expect(getResult.success).toBe(true);
    if ('value' in getResult) {
      expect(getResult.value).toEqual({
        plan_review: 'auto',
        build_review: 'auto',
        unify_review: 'auto',
      });
    }

    const overrideResult = codaConfig({
      action: 'set',
      key: 'gate_overrides',
      value: { chore: { plan_review: 'auto' } },
    }, codaRoot);
    expect(overrideResult.success).toBe(true);
  });

  test('rejects invalid gate mode values', () => {
    writeConfig();

    const result = codaConfig({
      action: 'set',
      key: 'gates',
      value: { plan_review: 'invalid-mode' },
    }, codaRoot);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid gate mode');
      expect(result.error).toContain('invalid-mode');
    }
  });
});
