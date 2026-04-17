import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
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

  test('blocks writes through leaf symlinks and parent-directory symlinks', async () => {
    if (process.platform === 'win32') return;

    const { pi, hooks } = createMockPi();
    const { projectRoot, codaRoot } = createTempCodaRoot();
    registerHooks(pi, codaRoot);

    const toolCall = hooks.get('tool_call');
    const ctx = createMockContext(projectRoot);

    // Leaf symlink: file in project root pointing at an existing .coda/ file.
    symlinkSync(join(codaRoot, 'state.json'), join(projectRoot, 'link-to-state.json'));

    // Parent-dir symlink: directory in project root pointing at .coda/.
    // Target file under the symlinked parent does NOT exist yet.
    symlinkSync(codaRoot, join(projectRoot, 'link-dir'));

    // Negative control: symlink pointing at src/ (outside .coda/).
    mkdirSync(join(projectRoot, 'src'), { recursive: true });
    symlinkSync(join(projectRoot, 'src'), join(projectRoot, 'link-to-src'));

    const blockedCases = [
      { path: 'link-to-state.json' },
      { path: join(projectRoot, 'link-to-state.json') },
      { path: 'link-dir/state.json' },
      { path: join(projectRoot, 'link-dir', 'state.json') },
      { path: 'link-dir/new-file.md' }, // target under parent-symlink, doesn't exist yet
    ];

    for (const { path } of blockedCases) {
      const result = await toolCall?.(
        { type: 'tool_call', toolCallId: `SL-${path}`, toolName: 'write', input: { path, content: 'x' } },
        ctx
      ) as ToolCallResult;
      expect(result).toMatchObject({
        block: true,
        reason: 'Use coda_* tools to modify .coda/ files',
      });
    }

    // Negative control: symlink resolving outside .coda/ must be allowed.
    const allowedResult = await toolCall?.(
      { type: 'tool_call', toolCallId: 'NEG-1', toolName: 'write', input: { path: 'link-to-src/foo.ts', content: 'x' } },
      ctx
    ) as ToolCallResult;
    expect(allowedResult).toEqual({});
  });

  test('blocks bash compound/subshell/here-doc writes into .coda/', async () => {
    const { pi, hooks } = createMockPi();
    const { projectRoot, codaRoot } = createTempCodaRoot();
    registerHooks(pi, codaRoot);

    const toolCall = hooks.get('tool_call');
    const ctx = createMockContext(projectRoot);

    const blockedCommands = [
      "cd .coda && echo '{}' > state.json",
      "(cd .coda && printf '' > state.json)",
      "cat > .coda/state.json <<EOF\n{}\nEOF",
      "sh -c 'cd .coda && echo x > state.json'",
      "bash -c 'echo x > .coda/state.json'",
    ];

    for (const command of blockedCommands) {
      const result = await toolCall?.(
        { type: 'tool_call', toolCallId: `BASH-${command.slice(0, 10)}`, toolName: 'bash', input: { command } },
        ctx
      ) as ToolCallResult;
      expect(result).toMatchObject({
        block: true,
        reason: 'Use coda_* tools to modify .coda/ files',
      });
    }

    // Negative control: `.coda` mentioned but no write intent.
    const allowedResult = await toolCall?.(
      { type: 'tool_call', toolCallId: 'BASH-NEG', toolName: 'bash', input: { command: 'echo .coda is great' } },
      ctx
    ) as ToolCallResult;
    expect(allowedResult).toEqual({});
  });

  test('blocks custom tools whose input references .coda/; allow-lists coda_* tools', async () => {
    const { pi, hooks } = createMockPi();
    const { projectRoot, codaRoot } = createTempCodaRoot();
    registerHooks(pi, codaRoot);

    const toolCall = hooks.get('tool_call');
    const ctx = createMockContext(projectRoot);

    // Custom (non-built-in) tool mutating .coda/ — MUST block.
    const blockedResult = await toolCall?.(
      {
        type: 'tool_call',
        toolCallId: 'CT-1',
        toolName: 'third_party_mutator',
        input: { target: '.coda/state.json', content: '{}' },
      },
      ctx
    ) as ToolCallResult;
    expect(blockedResult).toMatchObject({
      block: true,
      reason: 'Use coda_* tools to modify .coda/ files',
    });

    // Conservative default-deny: non-coda_* tool with .coda/ in input is blocked
    // even in read-like shapes (operators can add allow-lists in future).
    const blockedReader = await toolCall?.(
      {
        type: 'tool_call',
        toolCallId: 'CT-2',
        toolName: 'some_analyzer',
        input: { query: 'count files in .coda/' },
      },
      ctx
    ) as ToolCallResult;
    expect(blockedReader).toMatchObject({ block: true });

    // coda_* allow-list: `coda_edit_body` with .coda/ input must pass through.
    const allowed = await toolCall?.(
      {
        type: 'tool_call',
        toolCallId: 'CT-3',
        toolName: 'coda_edit_body',
        input: { path: '.coda/reference/ref-system.md', body: 'content' },
      },
      ctx
    ) as ToolCallResult;
    expect(allowed).toEqual({});

    // Custom tool with NO .coda/ reference must also pass through.
    const unrelated = await toolCall?.(
      {
        type: 'tool_call',
        toolCallId: 'CT-4',
        toolName: 'random_linter',
        input: { path: 'src/index.ts', rules: ['no-any'] },
      },
      ctx
    ) as ToolCallResult;
    expect(unrelated).toEqual({});
  });
});
