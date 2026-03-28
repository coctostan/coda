import { describe, expect, test } from 'bun:test';
import type { ExtensionAPI, RegisteredCommand, ToolDefinition } from '@mariozechner/pi-coding-agent';
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
