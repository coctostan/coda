import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ExtensionAPI, RegisteredCommand, ToolDefinition } from '@mariozechner/pi-coding-agent';
import { createDefaultState, persistState, readRecord, writeRecord } from '@coda/core';
import type { IssueRecord, PlanRecord } from '@coda/core';
import { registerCommands } from '../commands';
import { registerTools } from '../tools';

type MockHook = (event: unknown, ctx: unknown) => Promise<unknown> | unknown;

/** Mock ExtensionAPI that tracks registrations. */
function createMockPi() {
  const commands: Array<{ name: string; options: Omit<RegisteredCommand, 'name'> }> = [];
  const tools: ToolDefinition[] = [];
  const hooks: Array<{ event: string; handler: MockHook }> = [];

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
  } as unknown as ExtensionAPI;

  return { pi, commands, tools, hooks };
}

function createMockCommandContext() {
  const notifications: Array<{ message: string; level?: string }> = [];

  return {
    ctx: {
      ui: {
        notify(message: string, level?: string) {
          notifications.push({ message, level });
        },
      },
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
});

describe('Pi Tools', () => {
  test('registerTools registers 7 tools', () => {
    const { pi, tools } = createMockPi();
    registerTools(pi, '/tmp/test/.coda');
    expect(tools.length).toBe(7);
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
