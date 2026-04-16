import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExtensionAPI, ExtensionContext } from '@mariozechner/pi-coding-agent';
import { createDefaultState, persistState } from '@coda/core';
import { registerHooks } from '../hooks';

type MockHook = (event: unknown, ctx: ExtensionContext) => Promise<unknown> | unknown;
type ToolCallResult = {
  block?: boolean;
  reason?: string;
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

function createMockPi(): { pi: ExtensionAPI; hooks: Map<string, MockHook> } {
  const hooks = new Map<string, MockHook>();
  const pi = {
    on(event: string, handler: MockHook) {
      hooks.set(event, handler);
    },
  } as unknown as ExtensionAPI;

  return { pi, hooks };
}

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

function createTempCodaRoot(): { projectRoot: string; codaRoot: string } {
  const projectRoot = mkdtempSync(join(tmpdir(), 'coda-write-gate-'));
  const codaRoot = join(projectRoot, '.coda');

  mkdirSync(codaRoot, { recursive: true });
  persistState(
    {
      ...createDefaultState(),
      tdd_gate: 'unlocked',
    },
    join(codaRoot, 'state.json')
  );

  tempRoots.push(projectRoot);
  return { projectRoot, codaRoot };
}

describe('write gate integration', () => {
  test('registerHooks blocks Pi-dispatched .coda/ writes and allows non-.coda writes', async () => {
    const { pi, hooks } = createMockPi();
    const { projectRoot, codaRoot } = createTempCodaRoot();
    registerHooks(pi, codaRoot);

    const toolCall = hooks.get('tool_call');
    const ctx = createMockContext(projectRoot);

    const blockedCases = [
      {
        event: {
          type: 'tool_call',
          toolCallId: 'T1',
          toolName: 'write',
          input: { path: '.coda/state.json', content: '{"version":1}' },
        },
        operation: 'write',
        path: '.coda/state.json',
      },
      {
        event: {
          type: 'tool_call',
          toolCallId: 'T2',
          toolName: 'edit',
          input: { path: '.coda/state.json', new_text: '{}' },
        },
        operation: 'edit',
        path: '.coda/state.json',
      },
      {
        event: {
          type: 'tool_call',
          toolCallId: 'T3',
          toolName: 'write',
          input: { path: './.coda/state.json', content: '{"version":2}' },
        },
        operation: 'write',
        path: './.coda/state.json',
      },
      {
        event: {
          type: 'tool_call',
          toolCallId: 'T4',
          toolName: 'write',
          input: { path: join(projectRoot, '.coda/state.json'), content: '{"version":3}' },
        },
        operation: 'write',
        path: join(projectRoot, '.coda/state.json'),
      },
      {
        event: {
          type: 'tool_call',
          toolCallId: 'T5',
          toolName: 'edit',
          input: { path: '.coda/modules/x.local.md', new_text: 'mutate nested file' },
        },
        operation: 'edit',
        path: '.coda/modules/x.local.md',
      },
    ] as const;

    for (const testCase of blockedCases) {
      const result = await toolCall?.(testCase.event, ctx) as ToolCallResult;

      expect(result).toMatchObject({
        block: true,
        reason: 'Use coda_* tools to modify .coda/ files',
      });
    }

    const allowedResult = await toolCall?.(
      {
        type: 'tool_call',
        toolCallId: 'T6',
        toolName: 'write',
        input: { path: 'src/foo.ts', content: 'export const foo = 1;' },
      },
      ctx
    ) as ToolCallResult;

    expect(allowedResult).toEqual({});
  });
});
