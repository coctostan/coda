import { describe, expect, test } from 'bun:test';
import { registerCommands } from '../commands';
import { registerTools } from '../tools';
import type { PiAPI, CommandConfig, ToolSchema, ToolHandler } from '../types';

/** Mock PiAPI that tracks registrations. */
function createMockPi() {
  const commands: Array<{ name: string; config: CommandConfig }> = [];
  const tools: Array<{ name: string; schema: ToolSchema; handler: ToolHandler }> = [];
  const hooks: Array<{ event: string; handler: unknown }> = [];

  const pi: PiAPI = {
    registerCommand(name: string, config: CommandConfig) {
      commands.push({ name, config });
    },
    registerTool(name: string, schema: ToolSchema, handler: ToolHandler) {
      tools.push({ name, schema, handler });
    },
    on(event: string, handler: unknown) {
      hooks.push({ event, handler });
    },
    newSession: async () => {},
    sendUserMessage: async () => {},
  };

  return { pi, commands, tools, hooks };
}

describe('Pi Commands', () => {
  test('registerCommands registers 5 commands', () => {
    const { pi, commands } = createMockPi();
    registerCommands(pi, '/tmp/test/.coda');
    expect(commands.length).toBe(5);
  });

  test('registered commands include expected names', () => {
    const { pi, commands } = createMockPi();
    registerCommands(pi, '/tmp/test/.coda');
    const names = commands.map((c) => c.name);
    expect(names).toContain('/coda');
    expect(names).toContain('/coda forge');
    expect(names).toContain('/coda new');
    expect(names).toContain('/coda advance');
    expect(names).toContain('/coda build');
  });

  test('each command has name, description, and handler', () => {
    const { pi, commands } = createMockPi();
    registerCommands(pi, '/tmp/test/.coda');
    for (const cmd of commands) {
      expect(cmd.name.length).toBeGreaterThan(0);
      expect(cmd.config.description.length).toBeGreaterThan(0);
      expect(typeof cmd.config.handler).toBe('function');
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
    const names = tools.map((t) => t.name);
    expect(names).toContain('coda_create');
    expect(names).toContain('coda_read');
    expect(names).toContain('coda_update');
    expect(names).toContain('coda_edit_body');
    expect(names).toContain('coda_advance');
    expect(names).toContain('coda_status');
    expect(names).toContain('coda_run_tests');
  });

  test('each tool has schema with description and handler', () => {
    const { pi, tools } = createMockPi();
    registerTools(pi, '/tmp/test/.coda');
    for (const tool of tools) {
      expect(tool.schema.description.length).toBeGreaterThan(0);
      expect(typeof tool.handler).toBe('function');
    }
  });
});
