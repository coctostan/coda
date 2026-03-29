import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  ExtensionAPI,
  ExtensionContext,
  RegisteredCommand,
  ToolDefinition,
} from '@mariozechner/pi-coding-agent';
import { createDefaultState, persistState, writeRecord, type CodaState } from '@coda/core';
import { registerHooks } from '../hooks';
import { codaExtension } from '../index';

type MockHook = (event: unknown, ctx: ExtensionContext) => Promise<unknown> | unknown;
type BeforeAgentStartResult = {
  systemPrompt?: string;
  message?: {
    customType?: string;
    content?: string;
    display?: boolean;
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
type ToolCallResult = {
  block?: boolean;
  reason?: string;
};

/** Create a mock ExtensionAPI that tracks registrations and captures hook handlers. */
function createMockPi() {
  const commands: Array<{ name: string; options: Omit<RegisteredCommand, 'name'> }> = [];
  const tools: ToolDefinition[] = [];
  const hooks: Map<string, MockHook> = new Map();

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

  return { pi, commands, tools, hooks };
}

/** Build a valid CodaState with optional overrides. */
function makeState(overrides: Partial<CodaState> = {}): CodaState {
  return {
    version: 1,
    focus_issue: 'my-feature',
    phase: 'build',
    submode: null,
    loop_iteration: 0,
    current_task: 1,
    completed_tasks: [],
    tdd_gate: 'locked',
    last_test_exit_code: null,
    task_tool_calls: 0,
    enabled: true,
    ...overrides,
  };
}

/** Create a temporary `.coda/` directory with an optional state file. */
function createTempCodaRoot(state: CodaState | null = null): { projectRoot: string; codaRoot: string } {
  const projectRoot = mkdtempSync(join(tmpdir(), 'coda-pi-'));
  const codaRoot = join(projectRoot, '.coda');
  mkdirSync(codaRoot, { recursive: true });

  if (state) {
    writeFileSync(join(codaRoot, 'state.json'), JSON.stringify(state, null, 2), 'utf-8');
  }

  tempRoots.push(projectRoot);
  return { projectRoot, codaRoot };
}

function setupSubmodeAwareCodaRoot(submode: 'revise' | 'correct'): { projectRoot: string; codaRoot: string } {
  const base = createTempCodaRoot();
  const { codaRoot } = base;

  writeRecord(join(codaRoot, 'issues', 'my-feature.md'), {
    title: 'My Feature',
    issue_type: 'feature',
    status: 'active',
    phase: submode === 'revise' ? 'review' : 'verify',
    priority: 3,
    topics: ['workflow'],
    acceptance_criteria: [{ id: 'AC-1', text: 'It works', status: submode === 'revise' ? 'pending' : 'not-met' }],
    open_questions: [],
    deferred_items: [],
    human_review: false,
  }, '## Description\nBuild a great feature.\n');

  writeRecord(join(codaRoot, 'issues', 'my-feature', 'plan-v1.md'), {
    title: 'Implementation Plan',
    issue: 'my-feature',
    status: 'approved',
    iteration: 1,
    task_count: 3,
    human_review_status: 'not-required',
  }, '## Approach\nStep by step.\n');

  writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '01-setup.md'), {
    id: 1,
    issue: 'my-feature',
    title: 'Setup',
    status: 'complete',
    kind: 'planned',
    covers_ac: ['AC-1'],
    depends_on: [],
    files_to_modify: [],
    truths: ['Use TypeScript'],
    artifacts: [],
    key_links: [],
  }, '## Summary\nSetup complete.\n');

  writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '02-implement.md'), {
    id: 2,
    issue: 'my-feature',
    title: 'Implement',
    status: 'complete',
    kind: 'planned',
    covers_ac: ['AC-1'],
    depends_on: [1],
    files_to_modify: ['src/main.ts'],
    truths: ['Follow TDD'],
    artifacts: [],
    key_links: [],
  }, '## Summary\nImplementation complete.\n');

  if (submode === 'revise') {
    writeFileSync(
      join(codaRoot, 'issues', 'my-feature', 'revision-instructions.md'),
      '---\niteration: 2\nissues_found: 1\n---\n## Issue 1: address review feedback\n**Fix:** tighten the task order.\n',
      'utf-8'
    );

    persistState({
      ...createDefaultState(),
      focus_issue: 'my-feature',
      phase: 'review',
      submode: 'revise',
      loop_iteration: 2,
    }, join(codaRoot, 'state.json'));

    return base;
  }

  mkdirSync(join(codaRoot, 'issues', 'my-feature', 'verification-failures'), { recursive: true });
  writeFileSync(
    join(codaRoot, 'issues', 'my-feature', 'verification-failures', 'AC-1.yaml'),
    [
      'ac_id: AC-1',
      'status: not-met',
      'failed_checks:',
      '  - type: test_failure',
      '    detail: setup path still fails verification',
      'source_tasks: [1]',
      'relevant_files:',
      '  - src/main.ts',
    ].join('\n'),
    'utf-8'
  );

  writeRecord(join(codaRoot, 'issues', 'my-feature', 'tasks', '03-fix-ac-1.md'), {
    id: 3,
    issue: 'my-feature',
    title: 'Fix AC-1',
    status: 'pending',
    kind: 'correction',
    fix_for_ac: 'AC-1',
    covers_ac: ['AC-1'],
    depends_on: [],
    files_to_modify: ['src/main.ts'],
    truths: ['AC-1 passes after correction'],
    artifacts: [],
    key_links: [],
  }, 'Repair the failing acceptance criterion.\n');

  persistState({
    ...createDefaultState(),
    focus_issue: 'my-feature',
    phase: 'verify',
    submode: 'correct',
    loop_iteration: 1,
    current_task: 3,
    completed_tasks: [1, 2],
  }, join(codaRoot, 'state.json'));

  return base;
}

/** Create a minimal ExtensionContext for hook execution. */
function createMockContext(cwd: string): ExtensionContext {
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

const tempRoots: string[] = [];

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

describe('Pi Hooks', () => {
  test('registerHooks registers session_start, before_agent_start, and tool_call hooks', () => {
    const { pi, hooks } = createMockPi();
    registerHooks(pi, '/tmp/.coda');

    expect(hooks.size).toBe(3);
    expect(hooks.has('session_start')).toBe(true);
    expect(hooks.has('before_agent_start')).toBe(true);
    expect(hooks.has('tool_call')).toBe(true);
  });

  test('before_agent_start returns Pi message context when an issue is focused', async () => {
    const { pi, hooks } = createMockPi();
    const { projectRoot, codaRoot } = createTempCodaRoot(makeState({ phase: 'specify' }));
    registerHooks(pi, codaRoot);

    const sessionStart = hooks.get('session_start');
    const beforeAgentStart = hooks.get('before_agent_start');
    const ctx = createMockContext(projectRoot);

    await sessionStart?.({ type: 'session_start' }, ctx);
    const result = await beforeAgentStart?.(
      { type: 'before_agent_start', prompt: 'help', systemPrompt: 'base prompt' },
      ctx
    ) as BeforeAgentStartResult;

    expect(result.systemPrompt).toBeTruthy();
    expect(result.message).toMatchObject({
      customType: 'coda-context',
      display: true,
    });
  });

  test('before_agent_start returns revise-specific context metadata', async () => {
    const { pi, hooks } = createMockPi();
    const { projectRoot, codaRoot } = setupSubmodeAwareCodaRoot('revise');
    registerHooks(pi, codaRoot);

    const beforeAgentStart = hooks.get('before_agent_start');
    const result = await beforeAgentStart?.(
      { type: 'before_agent_start', prompt: 'help', systemPrompt: 'base prompt' },
      createMockContext(projectRoot)
    ) as BeforeAgentStartResult;

    expect(result.systemPrompt).toContain('revis');
    expect(result.message?.content).toContain('## Revision Instructions');
    expect(result.message?.details).toMatchObject({
      focusIssue: 'my-feature',
      phase: 'review',
      submode: 'revise',
      loopIteration: 2,
      currentTask: null,
    });
  });

  test('before_agent_start returns correct-specific context metadata with task details', async () => {
    const { pi, hooks } = createMockPi();
    const { projectRoot, codaRoot } = setupSubmodeAwareCodaRoot('correct');
    registerHooks(pi, codaRoot);

    const beforeAgentStart = hooks.get('before_agent_start');
    const result = await beforeAgentStart?.(
      { type: 'before_agent_start', prompt: 'help', systemPrompt: 'base prompt' },
      createMockContext(projectRoot)
    ) as BeforeAgentStartResult;

    expect(result.systemPrompt).toContain('fixing a verification failure');
    expect(result.message?.content).toContain('## Verification Failure: AC-1');
    expect(result.message?.content).toContain('## Source Task Summaries');
    expect(result.message?.details).toMatchObject({
      focusIssue: 'my-feature',
      phase: 'verify',
      submode: 'correct',
      loopIteration: 1,
      currentTask: 3,
      taskKind: 'correction',
    });
  });

  test('before_agent_start returns empty when no issue is focused', async () => {
    const { pi, hooks } = createMockPi();
    const { projectRoot, codaRoot } = createTempCodaRoot(makeState({ focus_issue: null }));
    registerHooks(pi, codaRoot);

    const beforeAgentStart = hooks.get('before_agent_start');
    const result = await beforeAgentStart?.(
      { type: 'before_agent_start', prompt: 'help', systemPrompt: 'base prompt' },
      createMockContext(projectRoot)
    ) as BeforeAgentStartResult;

    expect(result).toEqual({});
  });

  test('tool_call blocks writes to .coda/ paths', async () => {
    const { pi, hooks } = createMockPi();
    const { projectRoot, codaRoot } = createTempCodaRoot(makeState({ tdd_gate: 'unlocked' }));
    registerHooks(pi, codaRoot);

    const toolCall = hooks.get('tool_call');
    const result = await toolCall?.(
      { type: 'tool_call', toolCallId: '1', toolName: 'write', input: { path: '.coda/issues/test.md', content: '' } },
      createMockContext(projectRoot)
    ) as ToolCallResult;

    expect(result).toMatchObject({
      block: true,
      reason: 'Use coda_* tools to modify .coda/ files',
    });
  });

  test('tool_call blocks non-test writes when tdd_gate is locked', async () => {
    const { pi, hooks } = createMockPi();
    const { projectRoot, codaRoot } = createTempCodaRoot(makeState({ tdd_gate: 'locked' }));
    registerHooks(pi, codaRoot);

    const toolCall = hooks.get('tool_call');
    const result = await toolCall?.(
      { type: 'tool_call', toolCallId: '1', toolName: 'write', input: { path: 'src/main.ts', content: '' } },
      createMockContext(projectRoot)
    ) as ToolCallResult;

    expect(result.block).toBe(true);
    expect(result.reason).toBeTruthy();
  });

  test('tool_call allows test file writes when tdd_gate is locked', async () => {
    const { pi, hooks } = createMockPi();
    const { projectRoot, codaRoot } = createTempCodaRoot(makeState({ tdd_gate: 'locked' }));
    registerHooks(pi, codaRoot);

    const toolCall = hooks.get('tool_call');
    const result = await toolCall?.(
      {
        type: 'tool_call',
        toolCallId: '1',
        toolName: 'write',
        input: { path: 'src/__tests__/main.test.ts', content: '' },
      },
      createMockContext(projectRoot)
    ) as ToolCallResult;

    expect(result.block).not.toBe(true);
  });

  test('tool_call allows all writes when tdd_gate is unlocked', async () => {
    const { pi, hooks } = createMockPi();
    const { projectRoot, codaRoot } = createTempCodaRoot(makeState({ tdd_gate: 'unlocked' }));
    registerHooks(pi, codaRoot);

    const toolCall = hooks.get('tool_call');
    const result = await toolCall?.(
      { type: 'tool_call', toolCallId: '1', toolName: 'write', input: { path: 'src/main.ts', content: '' } },
      createMockContext(projectRoot)
    ) as ToolCallResult;

    expect(result.block).not.toBe(true);
  });

  test('tool_call blocks bash commands that write to .coda/', async () => {
    const { pi, hooks } = createMockPi();
    const { projectRoot, codaRoot } = createTempCodaRoot(makeState({ tdd_gate: 'unlocked' }));
    registerHooks(pi, codaRoot);

    const toolCall = hooks.get('tool_call');

    // printf redirect
    const r1 = await toolCall?.(
      { type: 'tool_call', toolCallId: '1', toolName: 'bash', input: { command: "printf '%s' 'HACKED' > .coda/test.md" } },
      createMockContext(projectRoot)
    ) as ToolCallResult;
    expect(r1.block).toBe(true);

    // echo redirect
    const r2 = await toolCall?.(
      { type: 'tool_call', toolCallId: '2', toolName: 'bash', input: { command: 'echo hello >> .coda/issues/x.md' } },
      createMockContext(projectRoot)
    ) as ToolCallResult;
    expect(r2.block).toBe(true);

    // cp to .coda/
    const r3 = await toolCall?.(
      { type: 'tool_call', toolCallId: '3', toolName: 'bash', input: { command: 'cp /tmp/x .coda/issues/y.md' } },
      createMockContext(projectRoot)
    ) as ToolCallResult;
    expect(r3.block).toBe(true);

    // rm inside .coda/
    const r4 = await toolCall?.(
      { type: 'tool_call', toolCallId: '4', toolName: 'bash', input: { command: 'rm .coda/state.json' } },
      createMockContext(projectRoot)
    ) as ToolCallResult;
    expect(r4.block).toBe(true);
  });

  test('tool_call allows bash commands that do not write to .coda/', async () => {
    const { pi, hooks } = createMockPi();
    const { projectRoot, codaRoot } = createTempCodaRoot(makeState({ tdd_gate: 'unlocked' }));
    registerHooks(pi, codaRoot);

    const toolCall = hooks.get('tool_call');
    const result = await toolCall?.(
      { type: 'tool_call', toolCallId: '1', toolName: 'bash', input: { command: 'cat .coda/state.json' } },
      createMockContext(projectRoot)
    ) as ToolCallResult;
    expect(result.block).not.toBe(true);
  });
});

describe('Pi Extension Entry Point', () => {
  test('codaExtension registers commands, tools, and hooks', () => {
    const { pi, commands, tools, hooks } = createMockPi();
    codaExtension(pi);

    expect(commands.length).toBe(1);
    expect(tools.length).toBe(7);
    expect(hooks.size).toBe(3);
  });
});
