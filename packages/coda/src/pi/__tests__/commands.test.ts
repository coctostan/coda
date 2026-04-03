import { describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ExtensionAPI, RegisteredCommand, ToolDefinition } from '@mariozechner/pi-coding-agent';
import { createDefaultState, persistState, readRecord, writeRecord } from '@coda/core';
import type { CodaState, IssueRecord, PlanRecord } from '@coda/core';
import { registerCommands } from '../commands';
import { registerTools } from '../tools';

type MockHook = (event: unknown, ctx: unknown) => Promise<unknown> | unknown;

/** Mock ExtensionAPI that tracks registrations. */
function createMockPi() {
  const commands: Array<{ name: string; options: Omit<RegisteredCommand, 'name'> }> = [];
  const tools: ToolDefinition[] = [];
  const hooks: Array<{ event: string; handler: MockHook }> = [];
  const sentUserMessages: Array<{ content: string | unknown[]; options?: { deliverAs?: 'steer' | 'followUp' } }> = [];

  const pi = {
    registerCommand(name: string, options: Omit<RegisteredCommand, 'name'>) {
      commands.push({ name, options });
    },
    registerTool(tool: ToolDefinition) {
      tools.push(tool);
    },
    on(event: string, handler: MockHook) {
      hooks.push({ event, handler });
    },
    sendUserMessage(content: string | unknown[], options?: { deliverAs?: 'steer' | 'followUp' }) {
      sentUserMessages.push({ content, options });
    },
  } as unknown as ExtensionAPI;

  return { pi, commands, tools, hooks, sentUserMessages };
}

function createMockCommandContext(idle: boolean = true) {
  const notifications: Array<{ message: string; level?: string }> = [];

  return {
    ctx: {
      ui: {
        notify(message: string, level?: string) {
          notifications.push({ message, level });
        },
      },
      isIdle: () => idle,
      waitForIdle: async () => {},
      newSession: async () => ({ cancelled: false }),
      fork: async () => ({ cancelled: false }),
      navigateTree: async () => ({ cancelled: false }),
      switchSession: async () => ({ cancelled: false }),
      reload: async () => {},
    },
    notifications,
  };
}

function setupPendingHumanReviewCodaRoot(): string {
  const tempDir = mkdtempSync(join(tmpdir(), 'coda-commands-'));
  const codaRoot = join(tempDir, '.coda');

  const issueFrontmatter: IssueRecord = {
    title: 'Review Me',
    issue_type: 'feature',
    status: 'active',
    phase: 'review',
    priority: 3,
    topics: [],
    acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'pending' }],
    open_questions: [],
    deferred_items: [],
    human_review: true,
  };

  const planFrontmatter: PlanRecord = {
    title: 'Implementation Plan',
    issue: 'review-me',
    status: 'approved',
    iteration: 1,
    task_count: 0,
    human_review_status: 'pending',
  };

  writeRecord(join(codaRoot, 'issues', 'review-me.md'), issueFrontmatter, '## Description\nHuman approval required.\n');
  writeRecord(join(codaRoot, 'issues', 'review-me', 'plan-v1.md'), planFrontmatter, '## Approach\nWait for approval.\n');
  persistState({
    ...createDefaultState(),
    focus_issue: 'review-me',
    phase: 'review',
    submode: 'review',
  }, join(codaRoot, 'state.json'));

  return tempDir;
}

function setupBackAndKillCodaRoot(): string {
  const tempDir = mkdtempSync(join(tmpdir(), 'coda-commands-'));
  const codaRoot = join(tempDir, '.coda');

  writeRecord(join(codaRoot, 'issues', 'review-me.md'), {
    title: 'Review Me',
    issue_type: 'feature',
    status: 'active',
    phase: 'verify',
    priority: 3,
    topics: [],
    acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'not-met' }],
    open_questions: [],
    deferred_items: [],
    human_review: false,
  } as IssueRecord, '## Description\nReady for operator controls.\n');

  writeRecord(join(codaRoot, 'issues', 'review-me', 'plan-v1.md'), {
    title: 'Implementation Plan',
    issue: 'review-me',
    status: 'approved',
    iteration: 1,
    task_count: 0,
    human_review_status: 'approved',
  } as PlanRecord, '## Approach\nOperator controls.\n');

  persistState({
    ...createDefaultState(),
    focus_issue: 'review-me',
    phase: 'verify',
    submode: 'correct',
    loop_iteration: 2,
  }, join(codaRoot, 'state.json'));

  return tempDir;
}

function setupReviseCommandCodaRoot(): string {
  const tempDir = mkdtempSync(join(tmpdir(), 'coda-commands-'));
  const codaRoot = join(tempDir, '.coda');

  writeRecord(join(codaRoot, 'issues', 'review-me.md'), {
    title: 'Review Me',
    issue_type: 'feature',
    status: 'active',
    phase: 'review',
    priority: 3,
    topics: [],
    acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'pending' }],
    open_questions: [],
    deferred_items: [],
    human_review: false,
  } as IssueRecord, '## Description\nRevision required.\n');

  writeRecord(join(codaRoot, 'issues', 'review-me', 'plan-v1.md'), {
    title: 'Implementation Plan',
    issue: 'review-me',
    status: 'in-review',
    iteration: 2,
    task_count: 2,
    human_review_status: 'changes-requested',
  } as PlanRecord, '## Approach\nTighten the task order.\n');
  writeFileSync(
    join(codaRoot, 'issues', 'review-me', 'revision-instructions.md'),
    '---\niteration: 2\nissues_found: 1\n---\n## Issue 1: revise the plan\n**Fix:** update the task order.\n',
    'utf-8'
  );

  persistState({
    ...createDefaultState(),
    focus_issue: 'review-me',
    phase: 'review',
    submode: 'revise',
    loop_iteration: 2,
  }, join(codaRoot, 'state.json'));

  return tempDir;
}

function setupCorrectBuildCommandCodaRoot(): string {
  const tempDir = mkdtempSync(join(tmpdir(), 'coda-commands-'));
  const codaRoot = join(tempDir, '.coda');

  writeRecord(join(codaRoot, 'issues', 'review-me.md'), {
    title: 'Review Me',
    issue_type: 'feature',
    status: 'active',
    phase: 'verify',
    priority: 3,
    topics: [],
    acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'not-met' }],
    open_questions: [],
    deferred_items: [],
    human_review: false,
  } as IssueRecord, '## Description\nCorrection required.\n');

  writeRecord(join(codaRoot, 'issues', 'review-me', 'plan-v1.md'), {
    title: 'Implementation Plan',
    issue: 'review-me',
    status: 'approved',
    iteration: 1,
    task_count: 3,
    human_review_status: 'approved',
  } as PlanRecord, '## Approach\nCorrection flow.\n');

  mkdirSync(join(codaRoot, 'issues', 'review-me', 'verification-failures'), { recursive: true });
  writeFileSync(
    join(codaRoot, 'issues', 'review-me', 'verification-failures', 'AC-1.yaml'),
    'ac_id: AC-1\nstatus: not-met\nfailed_checks:\n  - type: test_failure\n    detail: regression still fails\nsource_tasks: [1]\nrelevant_files:\n  - src/workflow.ts\n',
    'utf-8'
  );

  writeRecord(join(codaRoot, 'issues', 'review-me', 'tasks', '01-setup.md'), {
    id: 1,
    issue: 'review-me',
    title: 'Setup',
    status: 'complete',
    kind: 'planned',
    covers_ac: ['AC-1'],
    depends_on: [],
    files_to_modify: [],
    truths: [],
    artifacts: [],
    key_links: [],
  }, '## Summary\nSetup complete.\n');

  writeRecord(join(codaRoot, 'issues', 'review-me', 'tasks', '03-fix-ac-1.md'), {
    id: 3,
    issue: 'review-me',
    title: 'Fix AC-1',
    status: 'pending',
    kind: 'correction',
    fix_for_ac: 'AC-1',
    covers_ac: ['AC-1'],
    depends_on: [1],
    files_to_modify: ['src/workflow.ts'],
    truths: ['AC-1 passes after correction'],
    artifacts: [],
    key_links: [],
  }, 'Repair the failing acceptance criterion.\n');

  persistState({
    ...createDefaultState(),
    focus_issue: 'review-me',
    phase: 'verify',
    submode: 'correct',
    loop_iteration: 1,
    current_task: 3,
    completed_tasks: [1],
  }, join(codaRoot, 'state.json'));

  return tempDir;
}

function setupReviewAdvanceTriggerCodaRoot(): string {
  const tempDir = mkdtempSync(join(tmpdir(), 'coda-commands-'));
  const codaRoot = join(tempDir, '.coda');

  writeRecord(join(codaRoot, 'issues', 'review-me.md'), {
    title: 'Review Me',
    issue_type: 'feature',
    status: 'active',
    phase: 'plan',
    priority: 3,
    topics: [],
    acceptance_criteria: [
      { id: 'AC-1', text: 'Criterion 1', status: 'pending' },
      { id: 'AC-2', text: 'Criterion 2', status: 'pending' },
    ],
    open_questions: [],
    deferred_items: [],
    human_review: false,
  } as IssueRecord, '## Description\nAdvance into review.\n');

  writeRecord(join(codaRoot, 'issues', 'review-me', 'plan-v1.md'), {
    title: 'Implementation Plan',
    issue: 'review-me',
    status: 'approved',
    iteration: 1,
    task_count: 2,
    human_review_status: 'not-required',
  } as PlanRecord, '## Approach\nReview the plan.\n');

  writeRecord(join(codaRoot, 'issues', 'review-me', 'tasks', '01-cover-ac-1.md'), {
    id: 1,
    issue: 'review-me',
    title: 'Cover AC-1',
    status: 'pending',
    kind: 'planned',
    covers_ac: ['AC-1'],
    depends_on: [],
    files_to_modify: ['src/review.ts'],
    truths: ['Keep review deterministic'],
    artifacts: [],
    key_links: [],
  }, 'Implement the first review slice.\n');

  writeRecord(join(codaRoot, 'issues', 'review-me', 'tasks', '02-broken-task.md'), {
    id: 2,
    issue: 'review-me',
    title: 'Broken Task',
    status: 'pending',
    kind: 'planned',
    covers_ac: [],
    depends_on: [3],
    files_to_modify: ['/tmp/not-in-repo.ts'],
    truths: [],
    artifacts: [],
    key_links: [],
  }, 'This task is intentionally malformed.\n');

  writeFileSync(join(codaRoot, 'coda.json'), JSON.stringify({ max_review_iterations: 3 }, null, 2));
  persistState({
    ...createDefaultState(),
    focus_issue: 'review-me',
    phase: 'plan',
    submode: null,
    current_task: null,
  }, join(codaRoot, 'state.json'));

  return tempDir;
}

describe('Pi Commands', () => {
  test('registerCommands registers the coda command', () => {
    const { pi, commands } = createMockPi();
    registerCommands(pi, '/tmp/test/.coda');
    expect(commands.length).toBe(1);
  });

  test('registered command uses the real Pi command shape', () => {
    const { pi, commands } = createMockPi();
    registerCommands(pi, '/tmp/test/.coda');

    expect(commands[0]?.name).toBe('coda');
    expect(commands[0]?.options.description).toBeTruthy();
    expect(typeof commands[0]?.options.handler).toBe('function');
  });

  test('forge scaffolds a new .coda directory for greenfield projects', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'coda-forge-command-'));
    const codaRoot = join(projectRoot, '.coda');
    const { pi, commands } = createMockPi();
    const { ctx, notifications } = createMockCommandContext();

    try {
      registerCommands(pi, codaRoot, projectRoot);
      await commands[0]?.options.handler('forge', ctx as never);

      expect(existsSync(join(codaRoot, 'coda.json'))).toBe(true);
      const config = JSON.parse(readFileSync(join(codaRoot, 'coda.json'), 'utf-8')) as {
        modules?: {
          security?: { enabled?: boolean };
          tdd?: { enabled?: boolean };
        };
      };
      expect(config.modules?.security?.enabled).toBe(true);
      expect(config.modules?.tdd?.enabled).toBe(true);
      expect(notifications[notifications.length - 1]?.message).toContain('Project scaffolded');
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test('forge reports when CODA is already initialized', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'coda-forge-command-'));
    const codaRoot = join(projectRoot, '.coda');
    const { pi, commands } = createMockPi();
    const { ctx, notifications } = createMockCommandContext();

    try {
      mkdirSync(codaRoot, { recursive: true });
      registerCommands(pi, codaRoot, projectRoot);
      await commands[0]?.options.handler('forge', ctx as never);

      expect(notifications[notifications.length - 1]?.message).toBe(
        'CODA is already initialized in this project. Use `/coda status` to see current state.'
      );
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test('advance auto-approves pending human review before moving to build', async () => {
    const tempDir = setupPendingHumanReviewCodaRoot();
    const codaRoot = join(tempDir, '.coda');
    const { pi, commands } = createMockPi();
    const { ctx, notifications } = createMockCommandContext();

    try {
      registerCommands(pi, codaRoot);
      await commands[0]?.options.handler('advance', ctx as never);

      const plan = readRecord<PlanRecord>(join(codaRoot, 'issues', 'review-me', 'plan-v1.md'));
      expect(plan.frontmatter.human_review_status).toBe('approved');
      expect(notifications[notifications.length - 1]?.message).toContain('to build');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('advance into review runs autonomous review and queues the revise follow-up', async () => {
    const tempDir = setupReviewAdvanceTriggerCodaRoot();
    const codaRoot = join(tempDir, '.coda');
    const { pi, commands, sentUserMessages } = createMockPi();
    const { ctx, notifications } = createMockCommandContext();

    try {
      registerCommands(pi, codaRoot);
      await commands[0]?.options.handler('advance', ctx as never);

      const state = JSON.parse(readFileSync(join(codaRoot, 'state.json'), 'utf-8')) as CodaState;
      expect(state.phase).toBe('review');
      expect(state.submode).toBe('revise');
      expect(existsSync(join(codaRoot, 'issues', 'review-me', 'revision-instructions.md'))).toBe(true);
      expect(sentUserMessages).toHaveLength(1);
      expect(String(sentUserMessages[0]?.content).toLowerCase()).toContain('revise loop');
      expect(notifications[notifications.length - 1]?.message).toContain('Autonomous review ran');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('status includes active submode and loop iteration for revise flows', async () => {
    const tempDir = setupReviseCommandCodaRoot();
    const codaRoot = join(tempDir, '.coda');
    const { pi, commands } = createMockPi();
    const { ctx, notifications } = createMockCommandContext();

    try {
      registerCommands(pi, codaRoot);
      await commands[0]?.options.handler('status', ctx as never);

      const message = notifications[notifications.length - 1]?.message ?? '';
      expect(message.toLowerCase()).toContain('revise');
      expect(message.toLowerCase()).toContain('loop');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('build reflects correction submode instead of generic build messaging', async () => {
    const tempDir = setupCorrectBuildCommandCodaRoot();
    const codaRoot = join(tempDir, '.coda');
    const { pi, commands } = createMockPi();
    const { ctx, notifications } = createMockCommandContext();

    try {
      registerCommands(pi, codaRoot);
      await commands[0]?.options.handler('build', ctx as never);

      const message = notifications[notifications.length - 1]?.message ?? '';
      expect(message.toLowerCase()).toContain('correct');
      expect(message).not.toContain('BUILD loop ready');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('back rewinds to the requested prior phase', async () => {
    const tempDir = setupBackAndKillCodaRoot();
    const codaRoot = join(tempDir, '.coda');
    const { pi, commands } = createMockPi();
    const { ctx, notifications } = createMockCommandContext();

    try {
      registerCommands(pi, codaRoot);
      await commands[0]?.options.handler('back review', ctx as never);

      const plan = readRecord<PlanRecord>(join(codaRoot, 'issues', 'review-me', 'plan-v1.md'));
      expect(plan.frontmatter.status).toBe('draft');
      expect(notifications[notifications.length - 1]?.message.toLowerCase()).toContain('rewound');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('kill terminates the focused issue', async () => {
    const tempDir = setupBackAndKillCodaRoot();
    const codaRoot = join(tempDir, '.coda');
    const { pi, commands } = createMockPi();
    const { ctx, notifications } = createMockCommandContext();

    try {
      registerCommands(pi, codaRoot);
      await commands[0]?.options.handler('kill', ctx as never);

      const issue = readRecord<IssueRecord>(join(codaRoot, 'issues', 'review-me.md'));
      expect(issue.frontmatter.status).toBe('wont-fix');
      expect(notifications[notifications.length - 1]?.message.toLowerCase()).toContain('terminated');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('activate sets focus_issue and phase from existing issue', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'coda-activate-'));
    const codaRoot = join(tempDir, '.coda');
    const { pi, commands } = createMockPi();
    const { ctx, notifications } = createMockCommandContext();

    try {
      writeRecord(join(codaRoot, 'issues', 'my-feature.md'), {
        title: 'My Feature',
        issue_type: 'feature',
        status: 'proposed',
        phase: 'specify',
        priority: 3,
        topics: [],
        acceptance_criteria: [],
        open_questions: [],
        deferred_items: [],
        human_review: false,
      } as IssueRecord, '## Description\nA test feature.\n');
      persistState(createDefaultState(), join(codaRoot, 'state.json'));

      registerCommands(pi, codaRoot, tempDir);
      await commands[0]?.options.handler('activate my-feature', ctx as never);

      const state = JSON.parse(readFileSync(join(codaRoot, 'state.json'), 'utf-8')) as CodaState;
      expect(state.focus_issue).toBe('my-feature');
      expect(state.phase).toBe('specify');
      expect(notifications[notifications.length - 1]?.message).toContain('Activated');
      expect(notifications[notifications.length - 1]?.message).toContain('specify');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('activate without slug shows usage warning', async () => {
    const { pi, commands } = createMockPi();
    const { ctx, notifications } = createMockCommandContext();
    registerCommands(pi, '/tmp/test/.coda');
    await commands[0]?.options.handler('activate', ctx as never);
    expect(notifications[notifications.length - 1]?.message).toContain('Usage');
    expect(notifications[notifications.length - 1]?.level).toBe('warning');
  });

  test('activate nonexistent issue shows error', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'coda-activate-'));
    const codaRoot = join(tempDir, '.coda');
    const { pi, commands } = createMockPi();
    const { ctx, notifications } = createMockCommandContext();

    try {
      mkdirSync(join(codaRoot, 'issues'), { recursive: true });
      registerCommands(pi, codaRoot, tempDir);
      await commands[0]?.options.handler('activate no-such-issue', ctx as never);
      expect(notifications[notifications.length - 1]?.message).toContain('not found');
      expect(notifications[notifications.length - 1]?.level).toBe('error');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('activate already-focused issue shows warning', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'coda-activate-'));
    const codaRoot = join(tempDir, '.coda');
    const { pi, commands } = createMockPi();
    const { ctx, notifications } = createMockCommandContext();

    try {
      writeRecord(join(codaRoot, 'issues', 'my-feature.md'), {
        title: 'My Feature',
        issue_type: 'feature',
        status: 'active',
        phase: 'build',
        priority: 3,
        topics: [],
        acceptance_criteria: [],
        open_questions: [],
        deferred_items: [],
        human_review: false,
      } as IssueRecord, '## Description\nAlready focused.\n');
      persistState({
        ...createDefaultState(),
        focus_issue: 'my-feature',
        phase: 'build',
      }, join(codaRoot, 'state.json'));

      registerCommands(pi, codaRoot, tempDir);
      await commands[0]?.options.handler('activate my-feature', ctx as never);
      expect(notifications[notifications.length - 1]?.message).toContain('already focused');
      expect(notifications[notifications.length - 1]?.level).toBe('warning');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('Pi Tools', () => {
  test('registerTools registers 9 tools', () => {
    const { pi, tools } = createMockPi();
    registerTools(pi, '/tmp/test/.coda');
    expect(tools.length).toBe(9);
  });

  test('registered tools include all coda_* tool names', () => {
    const { pi, tools } = createMockPi();
    registerTools(pi, '/tmp/test/.coda');

    const names = tools.map((tool) => tool.name);
    expect(names).toContain('coda_create');
    expect(names).toContain('coda_read');
    expect(names).toContain('coda_update');
    expect(names).toContain('coda_edit_body');
    expect(names).toContain('coda_advance');
    expect(names).toContain('coda_status');
    expect(names).toContain('coda_run_tests');
  });

  test('each tool has label, description, parameters, and execute function', () => {
    const { pi, tools } = createMockPi();
    registerTools(pi, '/tmp/test/.coda');

    for (const tool of tools) {
      expect(tool.label.length).toBeGreaterThan(0);
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.parameters).toBeTruthy();
      expect(typeof tool.execute).toBe('function');
    }
  });
});
