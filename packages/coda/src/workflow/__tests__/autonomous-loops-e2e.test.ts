import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
  RegisteredCommand,
  ToolDefinition,
} from '@mariozechner/pi-coding-agent';
import {
  createDefaultState,
  persistState,
  readRecord,
  writeRecord,
  type CodaState,
  type IssueRecord,
  type PlanRecord,
  type TaskRecord,
} from '@coda/core';
import { registerCommands } from '../../pi/commands';
import { registerHooks } from '../../pi/hooks';
import { codaAdvance } from '../../tools/coda-advance';
import { codaBack } from '../../tools/coda-back';
import { codaKill } from '../../tools/coda-kill';
import { codaStatus } from '../../tools/coda-status';
import { runReviewRunner } from '../review-runner';
import { runVerifyRunner } from '../verify-runner';

type MockHook = (event: unknown, ctx: ExtensionContext) => Promise<unknown> | unknown;

type BeforeAgentStartResult = {
  systemPrompt?: string;
  message?: {
    content?: string;
    details?: {
      focusIssue?: string;
      phase?: string;
      submode?: string | null;
      loopIteration?: number;
      currentTask?: number | null;
      taskKind?: string | null;
    };
  };
};

const tempRoots: string[] = [];

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

function createMockPi(): {
  pi: ExtensionAPI;
  commands: Array<{ name: string; options: Omit<RegisteredCommand, 'name'> }>;
  hooks: Map<string, MockHook>;
} {
  const commands: Array<{ name: string; options: Omit<RegisteredCommand, 'name'> }> = [];
  const hooks: Map<string, MockHook> = new Map();
  const tools: ToolDefinition[] = [];

  const pi = {
    registerCommand(name: string, options: Omit<RegisteredCommand, 'name'>) {
      commands.push({ name, options });
    },
    registerTool(tool: ToolDefinition) {
      tools.push(tool);
    },
    on(event: string, handler: MockHook) {
      hooks.set(event, handler);
    },
  } as unknown as ExtensionAPI;

  void tools;
  return { pi, commands, hooks };
}

function createMockCommandContext(): {
  ctx: ExtensionCommandContext;
  notifications: Array<{ message: string; level?: string }>;
} {
  const notifications: Array<{ message: string; level?: string }> = [];

  return {
    ctx: {
      ui: {
        notify(message: string, level?: string) {
          notifications.push({ message, level });
        },
      },
    } as ExtensionCommandContext,
    notifications,
  };
}

function createMockExtensionContext(cwd: string): ExtensionContext {
  return {
    cwd,
    hasUI: true,
    ui: {
      notify() {},
    },
    sessionManager: {} as ExtensionContext['sessionManager'],
    modelRegistry: {} as ExtensionContext['modelRegistry'],
    model: undefined,
    isIdle: () => true,
    abort() {},
    hasPendingMessages: () => false,
    shutdown() {},
    getContextUsage: () => undefined,
    compact() {},
    getSystemPrompt: () => 'system prompt',
  } as unknown as ExtensionContext;
}

function createTempCodaProject(): { projectRoot: string; codaRoot: string; statePath: string } {
  const projectRoot = mkdtempSync(join(tmpdir(), 'coda-autonomous-loops-'));
  tempRoots.push(projectRoot);
  const codaRoot = join(projectRoot, '.coda');
  mkdirSync(join(codaRoot, 'issues'), { recursive: true });
  return { projectRoot, codaRoot, statePath: join(codaRoot, 'state.json') };
}

function writeIssue(codaRoot: string, overrides: Partial<IssueRecord> = {}): void {
  const issueFrontmatter: IssueRecord = {
    title: 'My Feature',
    issue_type: 'feature',
    status: 'active',
    phase: 'review',
    priority: 3,
    topics: ['workflow'],
    acceptance_criteria: [
      { id: 'AC-1', text: 'Review and revise flows are durable', status: 'pending' },
      { id: 'AC-2', text: 'Verify and correction flows are durable', status: 'pending' },
    ],
    open_questions: [],
    deferred_items: [],
    human_review: false,
    ...overrides,
  };

  writeRecord(join(codaRoot, 'issues', 'my-feature.md'), issueFrontmatter, '## Description\nValidate autonomous loops.\n');
}

function writePlan(codaRoot: string, overrides: Partial<PlanRecord> = {}, body = '## Approach\nValidate the lifecycle end-to-end.\n'): void {
  writeRecord(join(codaRoot, 'issues', 'my-feature', 'plan-v1.md'), {
    title: 'Implementation Plan',
    issue: 'my-feature',
    status: 'in-review',
    iteration: 1,
    task_count: 2,
    human_review_status: 'not-required',
    ...overrides,
  } as PlanRecord, body);
}

function writeTask(codaRoot: string, fileName: string, frontmatter: TaskRecord, body: string): void {
  writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', fileName), frontmatter, body);
}

function writeState(statePath: string, overrides: Partial<CodaState>): CodaState {
  const state: CodaState = {
    ...createDefaultState(),
    focus_issue: 'my-feature',
    phase: 'review',
    submode: 'review',
    completed_tasks: [],
    ...overrides,
  };
  persistState(state, statePath);
  return state;
}

describe('Autonomous loops end-to-end', () => {
  test('review → revise stays durable across runner, status, command, and hook surfaces', async () => {
    const { projectRoot, codaRoot, statePath } = createTempCodaProject();
    mkdirSync(join(codaRoot, 'issues', 'my-feature', 'tasks'), { recursive: true });
    writeIssue(codaRoot, { phase: 'review' });
    writePlan(codaRoot);
    writeTask(codaRoot, '01-cover-ac-1.md', {
      id: 1,
      issue: 'my-feature',
      title: 'Cover AC-1',
      status: 'pending',
      kind: 'planned',
      covers_ac: ['AC-1'],
      depends_on: [],
      files_to_modify: ['packages/coda/src/workflow/review-runner.ts'],
      truths: ['Keep the review loop deterministic'],
      artifacts: [],
      key_links: [],
    }, 'Implement the first review slice.\n');
    writeTask(codaRoot, '02-cover-ac-2.md', {
      id: 2,
      issue: 'my-feature',
      title: 'Broken review task',
      status: 'pending',
      kind: 'planned',
      covers_ac: [],
      depends_on: [3],
      files_to_modify: ['/tmp/not-in-repo.ts'],
      truths: [],
      artifacts: [],
      key_links: [],
    }, 'This task is intentionally malformed to force revise mode.\n');
    writeFileSync(join(codaRoot, 'coda.json'), JSON.stringify({ max_review_iterations: 3 }, null, 2));

    const reviewState = writeState(statePath, { phase: 'review', submode: 'review', loop_iteration: 0 });
    const reviewResult = runReviewRunner(codaRoot, 'my-feature', reviewState);
    expect(reviewResult.outcome).toBe('revise-required');
    if (reviewResult.outcome !== 'revise-required') throw new Error('Expected revise-required outcome');
    persistState(reviewResult.state, statePath);

    const status = codaStatus(statePath, codaRoot);
    expect(status.submode).toBe('revise');
    expect(status.loop_iteration).toBe(0);
    expect(status.next_action.toLowerCase()).toContain('revision');

    const instructions = readRecord<{ iteration: number; issues_found: number }>(
      join(codaRoot, 'issues', 'my-feature', 'revision-instructions.md')
    );
    expect(instructions.frontmatter.iteration).toBe(1);
    expect(instructions.body).toContain('AC-2 not covered by any task');
    expect(instructions.body).toContain('/tmp/not-in-repo.ts');

    const { pi, commands, hooks } = createMockPi();
    registerCommands(pi, codaRoot);
    registerHooks(pi, codaRoot);

    const { ctx, notifications } = createMockCommandContext();
    await commands[0]?.options.handler('status', ctx);
    expect(notifications[0]?.message.toLowerCase()).toContain('revise loop 0');
    expect(notifications[0]?.message.toLowerCase()).toContain('revision loop active');

    const beforeAgentStart = hooks.get('before_agent_start');
    const hookResult = await beforeAgentStart?.(
      { type: 'before_agent_start', prompt: 'help', systemPrompt: 'base prompt' },
      createMockExtensionContext(projectRoot)
    ) as BeforeAgentStartResult;
    expect(hookResult.systemPrompt).toContain('revising a development plan');
    expect(hookResult.message?.content).toContain('## Revision Instructions');
    expect(hookResult.message?.details).toMatchObject({
      focusIssue: 'my-feature',
      phase: 'review',
      submode: 'revise',
      loopIteration: 0,
    });
  });

  test('verify → correct exposes failure lineage across runner, status, and hook context', async () => {
    const { projectRoot, codaRoot, statePath } = createTempCodaProject();
    mkdirSync(join(codaRoot, 'issues', 'my-feature', 'tasks'), { recursive: true });
    mkdirSync(join(codaRoot, 'issues', 'my-feature', 'verification-failures'), { recursive: true });
    writeIssue(codaRoot, {
      phase: 'verify',
      acceptance_criteria: [
        { id: 'AC-1', text: 'Review and revise flows are durable', status: 'met' },
        { id: 'AC-2', text: 'Verify and correction flows are durable', status: 'pending' },
      ],
    });
    writePlan(codaRoot, { status: 'approved', human_review_status: 'approved' });
    writeTask(codaRoot, '01-implement-review-flow.md', {
      id: 1,
      issue: 'my-feature',
      title: 'Implement review flow',
      status: 'complete',
      kind: 'planned',
      covers_ac: ['AC-1'],
      depends_on: [],
      files_to_modify: ['src/review.ts'],
      truths: ['Review loop is durable'],
      artifacts: [],
      key_links: [],
    }, '## Summary\nReview flow shipped.\n');
    writeTask(codaRoot, '02-implement-verify-flow.md', {
      id: 2,
      issue: 'my-feature',
      title: 'Implement verify flow',
      status: 'complete',
      kind: 'planned',
      covers_ac: ['AC-2'],
      depends_on: [1],
      files_to_modify: ['src/verify.ts', 'tests/verify.test.ts'],
      truths: ['Verification failures remain inspectable'],
      artifacts: [],
      key_links: [],
    }, '## Summary\nVerify flow shipped.\n');
    writeFileSync(join(codaRoot, 'coda.json'), JSON.stringify({ max_verify_iterations: 3 }, null, 2));

    const verifyState = writeState(statePath, {
      phase: 'verify',
      submode: 'verify',
      loop_iteration: 0,
      completed_tasks: [1, 2],
    });
    const verifyResult = runVerifyRunner(codaRoot, 'my-feature', verifyState, {
      verificationResult: {
        acResults: [
          { acId: 'AC-1', status: 'met', sourceTasks: [1], relevantFiles: ['src/review.ts'] },
          {
            acId: 'AC-2',
            status: 'not-met',
            sourceTasks: [2],
            relevantFiles: ['src/verify.ts', 'tests/verify.test.ts'],
            failedChecks: [
              { type: 'test_failure', detail: 'tests/verify.test.ts still fails for correction routing' },
            ],
          },
        ],
      },
    });
    expect(verifyResult.outcome).toBe('corrections-required');
    if (verifyResult.outcome !== 'corrections-required') throw new Error('Expected corrections-required outcome');
    persistState(verifyResult.state, statePath);

    const status = codaStatus(statePath, codaRoot);
    expect(status.submode).toBe('correct');
    expect(status.current_task).toBe(3);
    expect(status.task_kind).toBe('correction');
    expect(status.next_action.toLowerCase()).toContain('correction');
    expect(status.next_action.toLowerCase()).toContain('verify');

    const failureBody = readFileSync(
      join(codaRoot, 'issues', 'my-feature', 'verification-failures', 'AC-2.yaml'),
      'utf-8'
    );
    expect(failureBody).toContain('ac_id: AC-2');

    const correctionTask = readRecord<TaskRecord>(join(codaRoot, 'issues', 'my-feature', 'tasks', '03-fix-ac-2.md'));
    expect(correctionTask.frontmatter.kind).toBe('correction');
    expect(correctionTask.frontmatter.fix_for_ac).toBe('AC-2');
    expect(correctionTask.frontmatter.files_to_modify).toEqual(['src/verify.ts', 'tests/verify.test.ts']);

    const { pi, hooks } = createMockPi();
    registerHooks(pi, codaRoot);
    const beforeAgentStart = hooks.get('before_agent_start');
    const hookResult = await beforeAgentStart?.(
      { type: 'before_agent_start', prompt: 'help', systemPrompt: 'base prompt' },
      createMockExtensionContext(projectRoot)
    ) as BeforeAgentStartResult;
    expect(hookResult.systemPrompt).toContain('fixing a verification failure');
    expect(hookResult.message?.content).toContain('## Verification Failure: AC-2');
    expect(hookResult.message?.content).toContain('## Source Task Summaries');
    expect(hookResult.message?.details).toMatchObject({
      phase: 'verify',
      submode: 'correct',
      currentTask: 3,
      taskKind: 'correction',
    });
  });

  test('pending human review blocks build until a human decision is recorded', async () => {
    const { codaRoot, statePath } = createTempCodaProject();
    mkdirSync(join(codaRoot, 'issues', 'my-feature', 'tasks'), { recursive: true });
    writeIssue(codaRoot, {
      phase: 'review',
      human_review: true,
      acceptance_criteria: [{ id: 'AC-1', text: 'Human approval is required', status: 'pending' }],
    });
    writePlan(codaRoot, { status: 'approved', human_review_status: 'pending', task_count: 0 });
    writeState(statePath, { phase: 'review', submode: 'review', loop_iteration: 2 });

    const status = codaStatus(statePath, codaRoot);
    expect(status.human_review_required).toBe(true);
    expect(status.human_review_status).toBe('pending');
    expect(status.next_action.toLowerCase()).toContain('approve');
    expect(status.next_action.toLowerCase()).toContain('feedback');

    const blockedAdvance = codaAdvance({ target_phase: 'build' }, codaRoot, statePath);
    expect(blockedAdvance.success).toBe(false);
    expect(blockedAdvance.reason).toContain('Human plan review pending');

    const { pi, commands } = createMockPi();
    registerCommands(pi, codaRoot);
    const { ctx, notifications } = createMockCommandContext();
    await commands[0]?.options.handler('status', ctx);
    expect(notifications[0]?.message.toLowerCase()).toContain('approve the plan');

    const approvedAdvance = codaAdvance({
      target_phase: 'build',
      human_review_decision: 'approved',
    }, codaRoot, statePath);
    expect(approvedAdvance.success).toBe(true);
    expect(approvedAdvance.new_phase).toBe('build');

    const plan = readRecord<PlanRecord>(join(codaRoot, 'issues', 'my-feature', 'plan-v1.md'));
    expect(plan.frontmatter.human_review_status).toBe('approved');

    const postApprovalStatus = codaStatus(statePath, codaRoot);
    expect(postApprovalStatus.phase).toBe('build');
    expect(postApprovalStatus.submode).toBeNull();
  });

  test('exhausted-loop recovery preserves evidence and routes operators through advance, back, and kill', async () => {
    const { codaRoot, statePath } = createTempCodaProject();
    mkdirSync(join(codaRoot, 'issues', 'my-feature', 'tasks'), { recursive: true });
    mkdirSync(join(codaRoot, 'issues', 'my-feature', 'verification-failures'), { recursive: true });
    writeIssue(codaRoot, {
      phase: 'verify',
      acceptance_criteria: [{ id: 'AC-1', text: 'Human recovery remains inspectable', status: 'not-met' }],
    });
    writePlan(codaRoot, { status: 'approved', human_review_status: 'approved', task_count: 1 });
    writeTask(codaRoot, '04-fix-ac-1.md', {
      id: 4,
      issue: 'my-feature',
      title: 'Fix AC-1',
      status: 'pending',
      kind: 'correction',
      fix_for_ac: 'AC-1',
      covers_ac: ['AC-1'],
      depends_on: [],
      files_to_modify: ['src/workflow.ts'],
      truths: ['Correction remains narrow'],
      artifacts: [],
      key_links: [],
    }, 'Repair the failing acceptance criterion.\n');
    writeFileSync(
      join(codaRoot, 'issues', 'my-feature', 'verification-failures', 'AC-1.yaml'),
      [
        'ac_id: AC-1',
        'status: not-met',
        'failed_checks:',
        '  - type: test_failure',
        '    detail: correction regression still fails',
        'source_tasks: [2]',
        'relevant_files:',
        '  - src/workflow.ts',
      ].join('\n'),
      'utf-8'
    );
    writeFileSync(join(codaRoot, 'coda.json'), JSON.stringify({ max_verify_iterations: 3 }, null, 2));
    writeState(statePath, {
      phase: 'verify',
      submode: 'correct',
      loop_iteration: 3,
      current_task: 4,
      completed_tasks: [1, 2, 3],
    });

    const status = codaStatus(statePath, codaRoot);
    expect(status.next_action.toLowerCase()).toContain('manual');
    expect(status.next_action.toLowerCase()).toContain('back');
    expect(status.next_action.toLowerCase()).toContain('kill');

    const resumeVerify = codaAdvance({ target_phase: 'unify' }, codaRoot, statePath);
    expect(resumeVerify.success).toBe(true);
    expect(resumeVerify.new_phase).toBe('verify');
    let resumedStatus = codaStatus(statePath, codaRoot);
    expect(resumedStatus.phase).toBe('verify');
    expect(resumedStatus.submode).toBe('verify');
    expect(resumedStatus.loop_iteration).toBe(0);

    writeState(statePath, {
      phase: 'verify',
      submode: 'correct',
      loop_iteration: 3,
      current_task: 4,
      completed_tasks: [1, 2, 3],
    });
    const rewind = codaBack({ target_phase: 'review' }, codaRoot, statePath);
    expect(rewind.success).toBe(true);
    expect(rewind.new_phase).toBe('review');
    resumedStatus = codaStatus(statePath, codaRoot);
    expect(resumedStatus.phase).toBe('review');
    expect(resumedStatus.submode).toBe('review');

    writeState(statePath, {
      phase: 'verify',
      submode: 'correct',
      loop_iteration: 3,
      current_task: 4,
      completed_tasks: [1, 2, 3],
    });
    const kill = codaKill(codaRoot, statePath);
    expect(kill.success).toBe(true);
    expect(kill.new_phase).toBe('done');

    const issue = readRecord<IssueRecord>(join(codaRoot, 'issues', 'my-feature.md'));
    expect(issue.frontmatter.status).toBe('wont-fix');
    expect(readFileSync(
      join(codaRoot, 'issues', 'my-feature', 'verification-failures', 'AC-1.yaml'),
      'utf-8'
    )).toContain('ac_id: AC-1');
  });
});
