import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import { tmpdir } from 'os';
import { codaAdvance } from '../coda-advance';
import { codaCreate } from '../coda-create';
import { readRecord, persistState, createDefaultState, writeRecord, loadState } from '@coda/core';
import type { CodaState, IssueRecord, PlanRecord } from '@coda/core';

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

function setupPendingHumanReview(): string {
  codaCreate(
    {
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
        human_review: true,
      },
    },
    codaRoot
  );

  const planPath = join(codaRoot, 'issues', 'test-issue', 'plan-v1.md');
  writeRecord<PlanRecord>(planPath, {
    title: 'Implementation Plan',
    issue: 'test-issue',
    status: 'approved',
    iteration: 1,
    task_count: 0,
    human_review_status: 'pending',
  }, '## Approach\nShip the approved plan.\n');

  persistState({
    ...createDefaultState(),
    focus_issue: 'test-issue',
    phase: 'review',
    submode: 'review',
    loop_iteration: 2,
  }, statePath);

  return planPath;
}

function setupExhaustedReview(): string {
  codaCreate(
    {
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
        human_review: false,
      },
    },
    codaRoot
  );

  const planPath = join(codaRoot, 'issues', 'test-issue', 'plan-v1.md');
  writeRecord<PlanRecord>(planPath, {
    title: 'Implementation Plan',
    issue: 'test-issue',
    status: 'in-review',
    iteration: 1,
    task_count: 0,
    human_review_status: 'not-required',
  }, '## Approach\nHuman will approve after exhaustion.\n');

  persistState({
    ...createDefaultState(),
    focus_issue: 'test-issue',
    phase: 'review',
    submode: 'revise',
    loop_iteration: 3,
  }, statePath);

  return planPath;
}

function setupExhaustedVerify(): void {
  codaCreate(
    {
      type: 'issue',
      fields: {
        title: 'Test Issue',
        issue_type: 'feature',
        status: 'active',
        phase: 'verify',
        priority: 3,
        topics: [],
        acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'not-met' }],
        open_questions: [],
        deferred_items: [],
        human_review: false,
      },
    },
    codaRoot
  );

  persistState({
    ...createDefaultState(),
    focus_issue: 'test-issue',
    phase: 'verify',
    submode: 'correct',
    loop_iteration: 3,
    current_task: 4,
    completed_tasks: [1, 2, 3],
  }, statePath);
}

function setupBuildReadyIssue(): void {
  codaCreate(
    {
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
    },
    codaRoot
  );

  writeRecord<PlanRecord>(join(codaRoot, 'issues', 'test-issue', 'plan-v1.md'), {
    title: 'Implementation Plan',
    issue: 'test-issue',
    status: 'approved',
    iteration: 1,
    task_count: 1,
    human_review_status: 'not-required',
  }, '## Approach\nShip the built work.\n');

  codaCreate(
    {
      type: 'task',
      fields: {
        id: 1,
        issue: 'test-issue',
        title: 'Complete Build Task',
        status: 'complete',
        kind: 'planned',
        covers_ac: ['AC-1'],
        depends_on: [],
        files_to_modify: ['src/main.ts'],
        truths: [],
        artifacts: [],
        key_links: [],
      },
    },
    codaRoot
  );

  persistState({
    ...createDefaultState(),
    focus_issue: 'test-issue',
    phase: 'build',
    current_task: null,
    completed_tasks: [1],
  }, statePath);
}

function writeModuleFindings(hookResults: Array<{ hookPoint: string; blocked: boolean; blockReasons: string[] }>): void {
  writeFileSync(
    join(codaRoot, 'issues', 'test-issue', 'module-findings.json'),
    JSON.stringify({
      issue: 'test-issue',
      hookResults: hookResults.map((hookResult, index) => ({
        ...hookResult,
        findings: [],
        timestamp: `2026-04-02T00:00:0${String(index)}Z`,
      })),
    }, null, 2),
    'utf-8'
  );
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

  test('does not crash when issue frontmatter omits acceptance_criteria', () => {
    const issuePath = join(codaRoot, 'issues', 'test-issue.md');
    writeRecord<Partial<IssueRecord>>(issuePath, {
      title: 'Sparse Issue',
      issue_type: 'feature',
      status: 'proposed',
      phase: 'specify',
      priority: 3,
      topics: [],
      // acceptance_criteria, open_questions, human_review intentionally omitted
    } as IssueRecord, '## Description\n\nSparse frontmatter test.\n');

    persistState({
      ...createDefaultState(),
      focus_issue: 'test-issue',
      phase: 'specify',
    }, statePath);

    const result = codaAdvance({ target_phase: 'plan' }, codaRoot, statePath);

    // Must not throw nor leak a JS runtime TypeError. Phase 57 live crash was
    // "Cannot read properties of undefined (reading 'length')" on acceptance_criteria.
    expect(result.success).toBe(false);
    const errText = `${result.error ?? ''} ${result.reason ?? ''}`;
    expect(errText).not.toMatch(/Cannot read propert(y|ies) of undefined/);
    expect(errText).not.toMatch(/undefined is not an object/);
    expect(errText).not.toMatch(/acceptance_criteria\./);
    // Should be a real gate failure, not a runtime error.
    expect(result.reason ?? '').toMatch(/acceptance criterion|gate|plan/i);

    // Issue phase and state must not mutate on a failed advance.
    const issue = readRecord<Record<string, unknown>>(issuePath);
    expect(issue.frontmatter['phase']).toBe('specify');
    expect(loadState(statePath)?.phase).toBe('specify');
  });

  test('does not crash when issue frontmatter omits optional fields entirely', () => {
    const issuePath = join(codaRoot, 'issues', 'test-issue.md');
    writeRecord<Partial<IssueRecord>>(issuePath, {
      title: 'Minimal Issue',
      issue_type: 'feature',
      status: 'proposed',
      phase: 'specify',
      priority: 3,
      // topics, acceptance_criteria, open_questions, deferred_items, human_review all missing
    } as IssueRecord, '## Description\n\nMinimal frontmatter test.\n');

    persistState({
      ...createDefaultState(),
      focus_issue: 'test-issue',
      phase: 'specify',
    }, statePath);

    const result = codaAdvance({ target_phase: 'plan' }, codaRoot, statePath);

    expect(result.success).toBe(false);
    const errText = `${result.error ?? ''} ${result.reason ?? ''}`;
    expect(errText).not.toMatch(/Cannot read propert(y|ies) of undefined/);
    expect(errText).not.toMatch(/undefined is not an object/);
    expect(errText).not.toMatch(/acceptance_criteria\.|open_questions\.|human_review\./);
    expect(loadState(statePath)?.phase).toBe('specify');
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

  test('blocks review→build while human review is still pending', () => {
    setupPendingHumanReview();

    const result = codaAdvance({ target_phase: 'build' }, codaRoot, statePath);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('Human plan review pending');
  });

  test('approves pending human review before advancing to build', () => {
    const planPath = setupPendingHumanReview();

    const result = codaAdvance({
      target_phase: 'build',
      human_review_decision: 'approved',
    }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.previous_phase).toBe('review');
    expect(result.new_phase).toBe('build');

    const plan = readRecord<PlanRecord>(planPath);
    expect(plan.frontmatter.human_review_status).toBe('approved');

    const issue = readRecord<IssueRecord>(join(codaRoot, 'issues', 'test-issue.md'));
    expect(issue.frontmatter.phase).toBe('build');

    const state = loadState(statePath);
    expect(state?.phase).toBe('build');
    expect(state?.submode).toBeNull();
    expect(state?.loop_iteration).toBe(0);
  });

  test('records requested changes and returns the workflow to revise', () => {
    const planPath = setupPendingHumanReview();
    const reviewFeedback = 'Add a test scenario for approval rollback and tighten task scope.';

    const result = codaAdvance({
      target_phase: 'build',
      human_review_decision: 'changes-requested',
      review_feedback: reviewFeedback,
    }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.previous_phase).toBe('review');
    expect(result.new_phase).toBe('review');

    const plan = readRecord<PlanRecord>(planPath);
    expect(plan.frontmatter.human_review_status).toBe('changes-requested');
    expect(plan.body).toContain('## Human Review');
    expect(plan.body).toContain(reviewFeedback);

    const state = loadState(statePath);
    expect(state?.phase).toBe('review');
    expect(state?.submode).toBe('revise');
    expect(state?.loop_iteration).toBe(0);

    expect(basename(planPath)).toBe('plan-v1.md');
  });


  test('manually approves an exhausted review loop into build', () => {
    const planPath = setupExhaustedReview();

    const result = codaAdvance({ target_phase: 'build' }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.previous_phase).toBe('review');
    expect(result.new_phase).toBe('build');

    const plan = readRecord<PlanRecord>(planPath);
    expect(plan.frontmatter.status).toBe('approved');
    expect(plan.frontmatter.human_review_status).toBe('approved');

    const state = loadState(statePath);
    expect(state?.phase).toBe('build');
    expect(state?.submode).toBeNull();
    expect(state?.loop_iteration).toBe(0);
  });

  test('re-enters verify with loop reset when advance is used after verify exhaustion', () => {
    setupExhaustedVerify();

    const result = codaAdvance({ target_phase: 'unify' }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.previous_phase).toBe('verify');
    expect(result.new_phase).toBe('verify');

    const issue = readRecord<IssueRecord>(join(codaRoot, 'issues', 'test-issue.md'));
    expect(issue.frontmatter.phase).toBe('verify');

    const state = loadState(statePath);
    expect(state?.phase).toBe('verify');
    expect(state?.submode).toBe('verify');
    expect(state?.loop_iteration).toBe(0);
    expect(state?.current_task).toBeNull();
    expect(state?.completed_tasks).toEqual([1, 2, 3]);
  });

  test('build→verify ignores older blocked findings when the latest post-build result is clean', () => {
    setupBuildReadyIssue();
    writeModuleFindings([
      {
        hookPoint: 'post-build',
        blocked: true,
        blockReasons: ['SECURITY BLOCK: stale finding'],
      },
      {
        hookPoint: 'post-build',
        blocked: false,
        blockReasons: [],
      },
    ]);

    const result = codaAdvance({ target_phase: 'verify' }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.new_phase).toBe('verify');
    expect(loadState(statePath)?.phase).toBe('verify');
  });

  test('build→verify still blocks when the latest post-build result has block reasons', () => {
    setupBuildReadyIssue();
    writeModuleFindings([
      {
        hookPoint: 'post-build',
        blocked: false,
        blockReasons: [],
      },
      {
        hookPoint: 'post-build',
        blocked: true,
        blockReasons: ['SECURITY BLOCK: current finding'],
      },
    ]);

    const result = codaAdvance({ target_phase: 'verify' }, codaRoot, statePath);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('Module findings require attention');
  });
});

describe('codaAdvance unify→done gate with completion record fields', () => {
  function setupUnifyReadyIssue(): void {
    codaCreate(
      {
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
      },
      codaRoot
    );

    writeRecord<PlanRecord>(join(codaRoot, 'issues', 'test-issue', 'plan-v1.md'), {
      title: 'Implementation Plan',
      issue: 'test-issue',
      status: 'approved',
      iteration: 1,
      task_count: 0,
      human_review_status: 'not-required',
    }, '## Approach\nShip the work.\n');

    persistState({
      ...createDefaultState(),
      focus_issue: 'test-issue',
      phase: 'unify',
    }, statePath);
  }

  function writeCompletionRecord(fields: {
    system_spec_updated: boolean;
    reference_docs_reviewed: boolean;
    milestone_updated: boolean;
    unify_review_status?: 'pending' | 'approved' | 'changes-requested';
    artifacts_produced?: { overlays: string[]; reference_docs: string[]; decisions: string[] };
    exemptions?: { overlays?: string; reference_docs?: string; system_spec?: string };
  }): void {
    const recordsDir = join(codaRoot, 'records');
    const { mkdirSync } = require('fs');
    mkdirSync(recordsDir, { recursive: true });
    writeRecord<Record<string, unknown>>(join(recordsDir, 'test-issue-completion.md'), {
      title: 'Completion Record',
      issue: 'test-issue',
      completed_at: '2026-04-14',
      topics: [],
      ...fields,
    }, '## Summary\nDone.\n');
  }

  test('gatherGateData reads completion record frontmatter fields including unifyReviewStatus', () => {
    setupUnifyReadyIssue();
    writeCompletionRecord({
      system_spec_updated: true,
      reference_docs_reviewed: true,
      milestone_updated: true,
      unify_review_status: 'approved',
      exemptions: { overlays: 'no patterns emerged', reference_docs: 'no system change' },
    });
    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(true);
    expect(result.new_phase).toBe('done');
  });

  test('missing completion record defaults the 3 fields appropriately', () => {
    setupUnifyReadyIssue();
    // No completion record created

    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Completion record');
  });

  test('completion record with all fields true (including approved review) passes the unify→done gate', () => {
    setupUnifyReadyIssue();
    writeCompletionRecord({
      system_spec_updated: true,
      reference_docs_reviewed: true,
      milestone_updated: true,
      unify_review_status: 'approved',
      exemptions: { overlays: 'no patterns emerged', reference_docs: 'no system change' },
    });

    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(true);
  });
  test('completion record with system_spec_updated false fails the gate', () => {
    setupUnifyReadyIssue();
    writeCompletionRecord({
      system_spec_updated: false,
      reference_docs_reviewed: true,
      milestone_updated: true,
      unify_review_status: 'approved',
    });

    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Spec delta');
  });

  test('completion record with unify_review_status pending blocks the unify→done gate', () => {
    setupUnifyReadyIssue();
    writeCompletionRecord({
      system_spec_updated: true,
      reference_docs_reviewed: true,
      milestone_updated: true,
      unify_review_status: 'pending',
    });

    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('UNIFY review pending');
  });

  test('completion record without unify_review_status blocks the unify→done gate', () => {
    setupUnifyReadyIssue();
    writeCompletionRecord({
      system_spec_updated: true,
      reference_docs_reviewed: true,
      milestone_updated: true,
    });

    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('UNIFY review pending');
  });

  test('approving UNIFY review updates completion record and allows advance to done', () => {
    setupUnifyReadyIssue();
    writeCompletionRecord({
      system_spec_updated: true,
      reference_docs_reviewed: true,
      milestone_updated: true,
      unify_review_status: 'pending',
      exemptions: { overlays: 'no patterns emerged', reference_docs: 'no system change' },
    });

    const result = codaAdvance({
      target_phase: 'done',
      unify_review_decision: 'approved',
    }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.new_phase).toBe('done');

    // Verify the completion record was updated
    const record = readRecord<Record<string, unknown>>(join(codaRoot, 'records', 'test-issue-completion.md'));
    expect(record.frontmatter['unify_review_status']).toBe('approved');
  });

  test('requesting UNIFY review changes captures feedback and stays in unify', () => {
    setupUnifyReadyIssue();
    writeCompletionRecord({
      system_spec_updated: true,
      reference_docs_reviewed: true,
      milestone_updated: true,
      unify_review_status: 'pending',
    });

    const feedback = 'The completion record is missing pattern documentation for the new gate.';
    const result = codaAdvance({
      target_phase: 'done',
      unify_review_decision: 'changes-requested',
      unify_review_feedback: feedback,
    }, codaRoot, statePath);

    expect(result.success).toBe(true);
    expect(result.previous_phase).toBe('unify');
    expect(result.new_phase).toBe('unify');

    // Verify the completion record was updated
    const record = readRecord<Record<string, unknown>>(join(codaRoot, 'records', 'test-issue-completion.md'));
    expect(record.frontmatter['unify_review_status']).toBe('changes-requested');
    expect(record.body).toContain('## UNIFY Review');
    expect(record.body).toContain(feedback);
  });

  test('requesting UNIFY review changes without feedback fails', () => {
    setupUnifyReadyIssue();
    writeCompletionRecord({
      system_spec_updated: true,
      reference_docs_reviewed: true,
      milestone_updated: true,
      unify_review_status: 'pending',
    });

    const result = codaAdvance({
      target_phase: 'done',
      unify_review_decision: 'changes-requested',
    }, codaRoot, statePath);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('feedback is required');
  });

  test('gatherGateData populates artifactsProduced from completion record frontmatter when present', () => {
    setupUnifyReadyIssue();
    // Write an overlay file so declared path exists & has content.
    const { mkdirSync } = require('fs');
    mkdirSync(join(codaRoot, 'modules'), { recursive: true });
    writeFileSync(
      join(codaRoot, 'modules', 'security.local.md'),
      `---\nmodule: security\nlast_updated: 2026-04-16\nupdated_by: test\n---\n\n## Validated Patterns\n- Example pattern captured during this issue.\n`,
      'utf-8'
    );
    writeCompletionRecord({
      system_spec_updated: true,
      reference_docs_reviewed: true,
      milestone_updated: true,
      unify_review_status: 'approved',
      artifacts_produced: {
        overlays: ['modules/security.local.md'],
        reference_docs: [],
        decisions: [],
      },
    });
    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(true);
    expect(result.new_phase).toBe('done');
  });

  test('gatherGateData populates artifactExemptions from completion record frontmatter when present', () => {
    setupUnifyReadyIssue();
    writeCompletionRecord({
      system_spec_updated: true,
      reference_docs_reviewed: true,
      milestone_updated: true,
      unify_review_status: 'approved',
      exemptions: {
        overlays: 'no project-specific patterns emerged',
        reference_docs: 'no system change',
      },
    });
    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(true);
    expect(result.new_phase).toBe('done');
  });

  test('gatherGateData treats completion record with no artifacts_produced as empty (backward compat) and blocks feature issue', () => {
    setupUnifyReadyIssue();
    // Feature issue is issueType default; no artifacts_produced field at all.
    writeCompletionRecord({
      system_spec_updated: true,
      reference_docs_reviewed: true,
      milestone_updated: true,
      unify_review_status: 'approved',
    });
    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('no compounding artifacts produced');
  });

  test('gatherGateData derives artifactEvidenceRequired from ceremony.unifyFull: refactor issue relaxes evidence check', () => {
    // Set up refactor issue at unify
    codaCreate(
      {
        type: 'issue',
        fields: {
          title: 'Refactor Issue',
          issue_type: 'refactor',
          status: 'active',
          phase: 'unify',
          priority: 3,
          topics: [],
          acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'met' }],
          open_questions: [],
          deferred_items: [],
          human_review: false,
        },
      },
      codaRoot
    );
    writeRecord<PlanRecord>(join(codaRoot, 'issues', 'refactor-issue', 'plan-v1.md'), {
      title: 'Plan', issue: 'refactor-issue', status: 'approved', iteration: 1, task_count: 0,
      human_review_status: 'not-required',
    }, '## Approach\nRefactor.\n');
    persistState({
      ...createDefaultState(),
      focus_issue: 'refactor-issue',
      phase: 'unify',
    }, statePath);
    // Completion record with empty artifacts, no exemptions, but approved review
    const { mkdirSync } = require('fs');
    const recordsDir = join(codaRoot, 'records');
    mkdirSync(recordsDir, { recursive: true });
    writeRecord<Record<string, unknown>>(join(recordsDir, 'refactor-issue-completion.md'), {
      title: 'Completion Record',
      issue: 'refactor-issue',
      completed_at: '2026-04-16',
      topics: [],
      system_spec_updated: true,
      reference_docs_reviewed: true,
      milestone_updated: true,
      unify_review_status: 'approved',
    }, '## Summary\nDone.\n');
    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(true);
    expect(result.new_phase).toBe('done');
  });

  test('gatherGateData derives specDeltaPresent from issue.spec_delta and blocks refactor when ref-system.md not updated', () => {
    codaCreate(
      {
        type: 'issue',
        fields: {
          title: 'Refactor With Spec Delta',
          issue_type: 'refactor',
          status: 'active',
          phase: 'unify',
          priority: 3,
          topics: [],
          acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'met' }],
          open_questions: [],
          deferred_items: [],
          human_review: false,
          spec_delta: {
            added: ['new-behavior'],
            modified: [],
            removed: [],
            delta_summary: 'Adds a new behavior needing ref update',
          },
        },
      },
      codaRoot
    );
    writeRecord<PlanRecord>(join(codaRoot, 'issues', 'refactor-with-spec-delta', 'plan-v1.md'), {
      title: 'Plan', issue: 'refactor-with-spec-delta', status: 'approved', iteration: 1, task_count: 0,
      human_review_status: 'not-required',
    }, '## Approach\nRefactor.\n');
    persistState({
      ...createDefaultState(),
      focus_issue: 'refactor-with-spec-delta',
      phase: 'unify',
    }, statePath);
    const { mkdirSync } = require('fs');
    const recordsDir = join(codaRoot, 'records');
    mkdirSync(recordsDir, { recursive: true });
    writeRecord<Record<string, unknown>>(join(recordsDir, 'refactor-with-spec-delta-completion.md'), {
      title: 'Completion Record',
      issue: 'refactor-with-spec-delta',
      completed_at: '2026-04-16',
      topics: [],
      system_spec_updated: true,
      reference_docs_reviewed: true,
      milestone_updated: true,
      unify_review_status: 'approved',
    }, '## Summary\nDone.\n');
    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('spec_delta declared but ref-system.md not updated');
  });
});
