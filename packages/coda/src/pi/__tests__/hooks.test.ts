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
import type { CodaState } from '@coda/core';
import { registerHooks } from '../hooks';
import { codaExtension } from '../index';

type MockHook = (event: unknown, ctx: ExtensionContext) => Promise<unknown> | unknown;
type BeforeAgentStartResult = {
  systemPrompt?: string;
  message?: {
    customType?: string;
    display?: boolean;
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
