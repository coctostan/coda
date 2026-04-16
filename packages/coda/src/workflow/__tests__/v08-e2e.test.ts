import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  RegisteredCommand,
} from '@mariozechner/pi-coding-agent';
import {
  createDefaultState,
  loadState,
  persistState,
  readOverlay,
  readRecord,
  writeOverlay,
  writeRecord,
} from '@coda/core';
import type {
  CodaState,
  CompletionRecord,
  IssueRecord,
  PlanRecord,
  TaskRecord,
} from '@coda/core';
import type { CodaConfig, GateConfig } from '../../forge/types';
import { getDefaultConfig } from '../../forge/scaffold';
import { registerCommands } from '../../pi/commands';
import { codaAdvance } from '../../tools/coda-advance';
import { codaStatus } from '../../tools/coda-status';
import { runReviewRunner, runVerifyRunner } from '..';


type MockCommandRegistration = {
  name: string;
  options: RegisteredCommand;
};

let projectRoot: string;
let codaRoot: string;
let statePath: string;

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'coda-v08-e2e-'));
  codaRoot = join(projectRoot, '.coda');
  statePath = join(codaRoot, 'state.json');
  mkdirSync(join(codaRoot, 'issues'), { recursive: true });
  mkdirSync(join(codaRoot, 'modules'), { recursive: true });
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

function writeConfig(transform?: (config: CodaConfig) => CodaConfig): CodaConfig {
  const nextConfig = transform ? transform(getDefaultConfig()) : getDefaultConfig();
  writeFileSync(join(codaRoot, 'coda.json'), JSON.stringify(nextConfig, null, 2));
  return nextConfig;
}

function writeLegacyHumanReviewConfig(overrides: Partial<GateConfig>): void {
  const config = getDefaultConfig();
  const legacyConfig = (config as CodaConfig & { human_review_default: GateConfig }).human_review_default;
  const merged: CodaConfig & { human_review_default: GateConfig } = {
    ...config,
    human_review_default: {
      ...legacyConfig,
      ...overrides,
    },
  };
  delete (merged as CodaConfig & { gates?: CodaConfig['gates'] }).gates;
  writeFileSync(join(codaRoot, 'coda.json'), JSON.stringify(merged, null, 2));
}

function writeState(overrides: Partial<CodaState>): CodaState {
  const state: CodaState = {
    ...createDefaultState(),
    focus_issue: 'test-issue',
    phase: 'review',
    submode: 'review',
    current_task: null,
    completed_tasks: [],
    ...overrides,
  };

  persistState(state, statePath);
  return state;
}

function writeIssue(
  slug: string,
  overrides: Partial<IssueRecord> = {},
  body = '## Description\nValidate v0.8 compounding engine behavior.\n'
): void {
  const issue: IssueRecord = {
    title: slug,
    issue_type: 'feature',
    status: 'active',
    phase: 'review',
    priority: 3,
    topics: ['workflow'],
    acceptance_criteria: [{ id: 'AC-1', text: 'Gate behavior is correct', status: 'pending' }],
    open_questions: [],
    deferred_items: [],
    human_review: true,
    ...overrides,
  };

  writeRecord(join(codaRoot, 'issues', `${slug}.md`), issue, body);
}

function writePlan(
  slug: string,
  overrides: Partial<PlanRecord> = {},
  body = '## Approach\nImplement the approved plan.\n'
): void {
  mkdirSync(join(codaRoot, 'issues', slug), { recursive: true });
  writeRecord(join(codaRoot, 'issues', slug, 'plan-v1.md'), {
    title: 'Implementation Plan',
    issue: slug,
    status: 'in-review',
    iteration: 1,
    task_count: 1,
    human_review_status: 'not-required',
    ...overrides,
  } as PlanRecord, body);
}

function writeTask(
  slug: string,
  fileName: string,
  frontmatter: TaskRecord,
  body = 'Implement the planned change.\n'
): void {
  mkdirSync(join(codaRoot, 'issues', slug, 'tasks'), { recursive: true });
  writeRecord(join(codaRoot, 'issues', slug, 'tasks', fileName), frontmatter, body);
}

function writeCompletionRecord(slug: string, overrides: Partial<CompletionRecord> = {}): void {
  mkdirSync(join(codaRoot, 'records'), { recursive: true });
  writeRecord(join(codaRoot, 'records', `${slug}-completion.md`), {
    title: 'Completion Record',
    issue: slug,
    completed_at: '2026-04-15',
    topics: ['workflow'],
    system_spec_updated: true,
    reference_docs_reviewed: true,
    milestone_updated: true,
    unify_review_status: 'pending',
    ...overrides,
  } as CompletionRecord, '## Summary\nComplete.\n');
}

function setupReviewFlow(
  slug: string,
  options: {
    issueType?: IssueRecord['issue_type'];
    humanReview?: boolean;
  } = {}
): void {
  writeIssue(slug, {
    issue_type: options.issueType ?? 'feature',
    phase: 'review',
    human_review: options.humanReview ?? true,
  });
  writePlan(slug);
  writeTask(slug, '01-cover-ac-1.md', {
    id: 1,
    issue: slug,
    title: 'Cover AC-1',
    status: 'pending',
    kind: 'planned',
    covers_ac: ['AC-1'],
    depends_on: [],
    files_to_modify: ['packages/coda/src/workflow/review-runner.ts'],
    truths: [],
    artifacts: [],
    key_links: [],
  });
  writeState({ focus_issue: slug, phase: 'review', submode: 'review', loop_iteration: 0 });
}

function createMockPi(): {
  pi: ExtensionAPI;
  ctx: ExtensionCommandContext;
  commands: MockCommandRegistration[];
  notifications: Array<{ message: string; level?: string }>;
} {
  const commands: MockCommandRegistration[] = [];
  const notifications: Array<{ message: string; level?: string }> = [];

  const pi = {
    registerCommand(name: string, options: RegisteredCommand) {
      commands.push({ name, options });
    },
    registerHook() {
      return undefined;
    },
    registerTool() {
      return undefined;
    },
  } as unknown as ExtensionAPI;

  const ctx = {
    ui: {
      notify(message: string, level?: string) {
        notifications.push({ message, level });
      },
    },
  } as unknown as ExtensionCommandContext;

  return { pi, ctx, commands, notifications };
}

async function runCodaCommand(args: string): Promise<void> {
  const { pi, ctx, commands } = createMockPi();
  registerCommands(pi, codaRoot, projectRoot);
  const command = commands.find((entry) => entry.name === 'coda');
  if (!command) {
    throw new Error('Expected /coda command to be registered');
  }

  await command.options.handler(args, ctx);
}

describe('v0.8 compounding engine end-to-end', () => {
  test('E1: full v0.8 lifecycle with all gates auto and overlay present', () => {
    writeConfig((config) => ({
      ...config,
      gates: {
        plan_review: 'auto',
        build_review: 'auto',
        unify_review: 'auto',
      },
    }));

    writeOverlay(codaRoot, 'security', {
      frontmatter: {
        module: 'security',
        last_updated: '2026-04-15T12:00:00Z',
        updated_by: 'forge',
      },
      sections: {
        project_values: ['Overlay guidance for v0.8 lifecycle tests.'],
        validated_patterns: [],
        known_false_positives: [],
        recurring_issues: [],
      },
    });

    writeIssue('test-issue', {
      phase: 'specify',
      human_review: false,
      acceptance_criteria: [{ id: 'AC-1', text: 'Lifecycle completes cleanly', status: 'pending' }],
    });
    writeState({ focus_issue: 'test-issue', phase: 'specify', submode: null, loop_iteration: 0 });

    const overlay = readOverlay(codaRoot, 'security');
    expect(overlay?.sections.project_values).toContain('Overlay guidance for v0.8 lifecycle tests.');

    const planResult = codaAdvance({ target_phase: 'plan' }, codaRoot, statePath);
    expect(planResult.success).toBe(true);
    expect(planResult.new_phase).toBe('plan');

    writePlan('test-issue', { status: 'in-review', task_count: 1 });
    writeTask('test-issue', '01-complete-lifecycle.md', {
      id: 1,
      issue: 'test-issue',
      title: 'Complete lifecycle',
      status: 'pending',
      kind: 'planned',
      covers_ac: ['AC-1'],
      depends_on: [],
      files_to_modify: ['packages/coda/src/workflow/__tests__/v08-e2e.test.ts'],
      truths: [],
      artifacts: [],
      key_links: [],
    });

    const reviewPhaseResult = codaAdvance({ target_phase: 'review' }, codaRoot, statePath);
    expect(reviewPhaseResult.success).toBe(true);
    expect(reviewPhaseResult.new_phase).toBe('review');

    const reviewState = loadState(statePath);
    if (!reviewState) {
      throw new Error('Expected review state to exist');
    }

    const reviewResult = runReviewRunner(codaRoot, 'test-issue', reviewState, {
      reviewResult: { approved: true },
    });
    expect(reviewResult.outcome).toBe('approved');
    const approvedPlan = readRecord<PlanRecord>(join(codaRoot, 'issues', 'test-issue', 'plan-v1.md'));
    expect(approvedPlan.frontmatter.human_review_status).toBe('not-required');

    const buildResult = codaAdvance({ target_phase: 'build' }, codaRoot, statePath);
    expect(buildResult.success).toBe(true);
    expect(buildResult.new_phase).toBe('build');

    writeTask('test-issue', '01-complete-lifecycle.md', {
      id: 1,
      issue: 'test-issue',
      title: 'Complete lifecycle',
      status: 'complete',
      kind: 'planned',
      covers_ac: ['AC-1'],
      depends_on: [],
      files_to_modify: ['packages/coda/src/workflow/__tests__/v08-e2e.test.ts'],
      key_links: [],
      truths: [],
      artifacts: [],
    });

    const verifyGateResult = codaAdvance({ target_phase: 'verify' }, codaRoot, statePath);
    expect(verifyGateResult.success).toBe(true);
    expect(verifyGateResult.new_phase).toBe('verify');

    const verifyState = loadState(statePath);
    if (!verifyState) {
      throw new Error('Expected verify state to exist');
    }
    const runnableVerifyState: CodaState = {
      ...verifyState,
      completed_tasks: [1],
    };
    persistState(runnableVerifyState, statePath);

    const verifyResult = runVerifyRunner(codaRoot, 'test-issue', runnableVerifyState, {
      verificationResult: {
        acResults: [{ acId: 'AC-1', status: 'met', sourceTasks: [1], relevantFiles: ['packages/coda/src/workflow/__tests__/v08-e2e.test.ts'] }],
      },
      suitePassed: true,
    });
    expect(verifyResult.outcome).toBe('success');
    persistState(verifyResult.state, statePath);

    const unifyResult = codaAdvance({ target_phase: 'unify' }, codaRoot, statePath);
    expect(unifyResult.success).toBe(true);
    expect(unifyResult.new_phase).toBe('unify');

    writeCompletionRecord('test-issue');
    const doneResult = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(doneResult.success).toBe(true);
    expect(doneResult.new_phase).toBe('done');

    const completion = readRecord<CompletionRecord>(join(codaRoot, 'records', 'test-issue-completion.md'));
    expect(completion.frontmatter.unify_review_status).toBe('approved');

    const finalStatus = codaStatus(statePath, codaRoot);
    expect(finalStatus.phase).toBe('done');
  });

  test('E2a: bugfix override auto-approves review→build', () => {
    writeConfig((config) => ({
      ...config,
      gates: {
        plan_review: 'human',
        build_review: 'auto-unless-block',
        unify_review: 'human',
      },
      gate_overrides: {
        ...config.gate_overrides,
        bugfix: {
          plan_review: 'auto',
        },
      },
    }));
    setupReviewFlow('bugfix-issue', { issueType: 'bugfix', humanReview: true });

    const state = loadState(statePath);
    if (!state) throw new Error('Expected review state');
    const reviewResult = runReviewRunner(codaRoot, 'bugfix-issue', state, {
      reviewResult: { approved: true },
    });
    expect(reviewResult.outcome).toBe('approved');

    const plan = readRecord<PlanRecord>(join(codaRoot, 'issues', 'bugfix-issue', 'plan-v1.md'));
    expect(plan.frontmatter.human_review_status).toBe('not-required');

    const advanceResult = codaAdvance({ target_phase: 'build' }, codaRoot, statePath);
    expect(advanceResult.success).toBe(true);
    expect(advanceResult.new_phase).toBe('build');
  });

  test('E2b: feature default plan_review human blocks review→build', () => {
    writeConfig((config) => ({
      ...config,
      gates: {
        plan_review: 'human',
        build_review: 'auto-unless-block',
        unify_review: 'human',
      },
      gate_overrides: {
        ...config.gate_overrides,
        bugfix: {
          plan_review: 'auto',
        },
      },
    }));
    setupReviewFlow('feature-issue', { issueType: 'feature', humanReview: true });

    const state = loadState(statePath);
    if (!state) throw new Error('Expected review state');
    const reviewResult = runReviewRunner(codaRoot, 'feature-issue', state, {
      reviewResult: { approved: true },
    });
    expect(reviewResult.outcome).toBe('approved');

    const plan = readRecord<PlanRecord>(join(codaRoot, 'issues', 'feature-issue', 'plan-v1.md'));
    expect(plan.frontmatter.human_review_status).toBe('pending');

    const advanceResult = codaAdvance({ target_phase: 'build' }, codaRoot, statePath);
    expect(advanceResult.success).toBe(false);
    expect(advanceResult.reason ?? advanceResult.error).toContain('review pending');
  });

  test('E3a: backward compatibility keeps feature review human when gates are absent', () => {
    writeLegacyHumanReviewConfig({ feature: true, chore: false });
    setupReviewFlow('legacy-feature', { issueType: 'feature', humanReview: true });

    const state = loadState(statePath);
    if (!state) throw new Error('Expected review state');
    const reviewResult = runReviewRunner(codaRoot, 'legacy-feature', state, {
      reviewResult: { approved: true },
    });
    expect(reviewResult.outcome).toBe('approved');

    const plan = readRecord<PlanRecord>(join(codaRoot, 'issues', 'legacy-feature', 'plan-v1.md'));
    expect(plan.frontmatter.human_review_status).toBe('pending');
  });

  test('E3b: backward compatibility keeps chore review automatic when gates are absent', () => {
    writeLegacyHumanReviewConfig({ feature: true, chore: false });
    setupReviewFlow('legacy-chore', { issueType: 'chore', humanReview: false });

    const state = loadState(statePath);
    if (!state) throw new Error('Expected review state');
    const reviewResult = runReviewRunner(codaRoot, 'legacy-chore', state, {
      reviewResult: { approved: true },
    });
    expect(reviewResult.outcome).toBe('approved');

    const plan = readRecord<PlanRecord>(join(codaRoot, 'issues', 'legacy-chore', 'plan-v1.md'));
    expect(plan.frontmatter.human_review_status).toBe('not-required');
  });

  test('E4a: /coda new with plan_review auto writes human_review false', async () => {
    writeConfig((config) => ({
      ...config,
      gates: {
        plan_review: 'auto',
        build_review: 'auto-unless-block',
        unify_review: 'human',
      },
    }));

    await runCodaCommand('new feature Auto Gate Issue');

    const issue = readRecord<IssueRecord>(join(codaRoot, 'issues', 'auto-gate-issue.md'));
    expect(issue.frontmatter.human_review).toBe(false);
  });

  test('E4b: /coda new with plan_review human writes human_review true', async () => {
    writeConfig((config) => ({
      ...config,
      gates: {
        plan_review: 'human',
        build_review: 'auto-unless-block',
        unify_review: 'human',
      },
    }));

    await runCodaCommand('new feature Human Gate Issue');

    const issue = readRecord<IssueRecord>(join(codaRoot, 'issues', 'human-gate-issue.md'));
    expect(issue.frontmatter.human_review).toBe(true);
  });

  test('E4c: /coda new falls back to human_review_default when gates are absent', async () => {
    writeLegacyHumanReviewConfig({ feature: true });

    await runCodaCommand('new feature Legacy Gate Issue');

    const issue = readRecord<IssueRecord>(join(codaRoot, 'issues', 'legacy-gate-issue.md'));
    expect(issue.frontmatter.human_review).toBe(true);
  });

  test('E5a: review runner marks auto plan review as not-required', () => {
    writeConfig((config) => ({
      ...config,
      gates: {
        plan_review: 'auto',
        build_review: 'auto-unless-block',
        unify_review: 'human',
      },
    }));
    setupReviewFlow('runner-auto', { issueType: 'feature', humanReview: false });

    const state = loadState(statePath);
    if (!state) throw new Error('Expected review state');
    const result = runReviewRunner(codaRoot, 'runner-auto', state, {
      reviewResult: { approved: true },
    });
    expect(result.outcome).toBe('approved');

    const plan = readRecord<PlanRecord>(join(codaRoot, 'issues', 'runner-auto', 'plan-v1.md'));
    expect(plan.frontmatter.human_review_status).toBe('not-required');
  });

  test('E5b: review runner keeps human plan review pending', () => {
    writeConfig((config) => ({
      ...config,
      gates: {
        plan_review: 'human',
        build_review: 'auto-unless-block',
        unify_review: 'human',
      },
    }));
    setupReviewFlow('runner-human', { issueType: 'feature', humanReview: true });

    const state = loadState(statePath);
    if (!state) throw new Error('Expected review state');
    const result = runReviewRunner(codaRoot, 'runner-human', state, {
      reviewResult: { approved: true },
    });
    expect(result.outcome).toBe('approved');

    const plan = readRecord<PlanRecord>(join(codaRoot, 'issues', 'runner-human', 'plan-v1.md'));
    expect(plan.frontmatter.human_review_status).toBe('pending');
  });

  test('coda-status reports resolved gate_mode', () => {
    writeConfig((config) => ({
      ...config,
      gates: {
        plan_review: 'human',
        build_review: 'auto-unless-block',
        unify_review: 'human',
      },
      gate_overrides: {
        ...config.gate_overrides,
        bugfix: {
          plan_review: 'auto',
        },
      },
    }));
    setupReviewFlow('status-gate', { issueType: 'bugfix', humanReview: true });

    const status = codaStatus(statePath, codaRoot);
    expect(status.phase).toBe('review');
    expect(status.gate_mode).toBe('auto');
  });
});
