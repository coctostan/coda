import { describe, expect, test } from 'bun:test';
import { registerHooks } from '../hooks';
import { initializeCoda } from '../index';
import type { PiAPI, CommandConfig, ToolSchema, ToolHandler, HookHandler, HookContext, HookResult, StateProvider } from '../types';
import type { CodaState } from '@coda/core';

/** Create a mock PiAPI that tracks registrations and captures hook handlers. */
function createMockPi() {
  const commands: Array<{ name: string; config: CommandConfig }> = [];
  const tools: Array<{ name: string; schema: ToolSchema; handler: ToolHandler }> = [];
  const hooks: Map<string, HookHandler> = new Map();

  const pi: PiAPI = {
    registerCommand(name: string, config: CommandConfig) {
      commands.push({ name, config });
    },
    registerTool(name: string, schema: ToolSchema, handler: ToolHandler) {
      tools.push({ name, schema, handler });
    },
    on(event: string, handler: HookHandler) {
      hooks.set(event, handler);
    },
    newSession: async () => {},
    sendUserMessage: async () => {},
  };

  return { pi, commands, tools, hooks };
}

function makeState(overrides: Partial<CodaState> = {}): CodaState {
  return {
    version: 1,
    focus_issue: 'my-feature',
    phase: 'build',
    current_task: 1,
    completed_tasks: [],
    tdd_gate: 'locked',
    last_test_exit_code: null,
    task_tool_calls: 0,
    enabled: true,
    ...overrides,
  };
}

describe('Pi Hooks', () => {
  test('registerHooks registers 3 hooks', () => {
    const { pi, hooks } = createMockPi();
    const provider: StateProvider = { getState: () => null };
    registerHooks(pi, '/tmp/.coda', provider);
    expect(hooks.size).toBe(3);
    expect(hooks.has('before_agent_start')).toBe(true);
    expect(hooks.has('tool_call')).toBe(true);
    expect(hooks.has('agent_end')).toBe(true);
  });

  test('before_agent_start returns context when issue is focused', () => {
    const { pi, hooks } = createMockPi();
    const provider: StateProvider = { getState: () => makeState({ phase: 'specify' }) };
    registerHooks(pi, '/tmp/.coda', provider);

    const handler = hooks.get('before_agent_start')!;
    const result = handler({});
    // Should return systemPrompt and message (even if .coda/ doesn't exist, graceful)
    expect(result).toHaveProperty('systemPrompt');
    expect(result).toHaveProperty('message');
  });

  test('before_agent_start returns empty when no issue focused', () => {
    const { pi, hooks } = createMockPi();
    const provider: StateProvider = { getState: () => makeState({ focus_issue: null }) };
    registerHooks(pi, '/tmp/.coda', provider);

    const handler = hooks.get('before_agent_start')!;
    const result = handler({});
    expect(result).toEqual({});
  });

  test('tool_call blocks writes to .coda/ paths', () => {
    const { pi, hooks } = createMockPi();
    const provider: StateProvider = { getState: () => makeState({ tdd_gate: 'unlocked' }) };
    registerHooks(pi, '/tmp/.coda', provider);

    const handler = hooks.get('tool_call')!;
    const ctx: HookContext = { tool: { name: 'write', args: { path: '.coda/issues/test.md' } } };
    const result = handler(ctx);
    expect(result).toHaveProperty('block', true);
    expect(result).toHaveProperty('reason');
  });

  test('tool_call blocks non-test writes when tdd_gate locked', () => {
    const { pi, hooks } = createMockPi();
    const provider: StateProvider = { getState: () => makeState({ tdd_gate: 'locked' }) };
    registerHooks(pi, '/tmp/.coda', provider);

    const handler = hooks.get('tool_call')!;
    const ctx: HookContext = { tool: { name: 'write', args: { path: 'src/main.ts' } } };
    const result = handler(ctx);
    expect(result).toHaveProperty('block', true);
  });

  test('tool_call allows test file writes when tdd_gate locked', () => {
    const { pi, hooks } = createMockPi();
    const provider: StateProvider = { getState: () => makeState({ tdd_gate: 'locked' }) };
    registerHooks(pi, '/tmp/.coda', provider);

    const handler = hooks.get('tool_call')!;
    const ctx: HookContext = { tool: { name: 'write', args: { path: 'src/__tests__/main.test.ts' } } };
    const result = handler(ctx);
    expect((result as HookResult).block).not.toBe(true);
  });

  test('tool_call allows all writes when tdd_gate unlocked', () => {
    const { pi, hooks } = createMockPi();
    const provider: StateProvider = { getState: () => makeState({ tdd_gate: 'unlocked' }) };
    registerHooks(pi, '/tmp/.coda', provider);

    const handler = hooks.get('tool_call')!;
    const ctx: HookContext = { tool: { name: 'write', args: { path: 'src/main.ts' } } };
    const result = handler(ctx);
    expect((result as HookResult).block).not.toBe(true);
  });
});

describe('Pi Extension Entry Point', () => {
  test('initializeCoda calls registerCommands, registerTools, registerHooks', () => {
    const { pi, commands, tools, hooks } = createMockPi();
    initializeCoda(pi, '/tmp/.coda');
    expect(commands.length).toBe(5);
    expect(tools.length).toBe(7);
    expect(hooks.size).toBe(3);
  });
});
