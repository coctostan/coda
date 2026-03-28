/**
 * @module pi/tools
 * Tool registration for the CODA Pi extension.
 *
 * Registers all `coda_*` tools using Pi's real ExtensionAPI and TypeBox schemas.
 */

import { join } from 'node:path';
import { Type } from '@sinclair/typebox';
import type { ExtensionAPI } from '@mariozechner/pi-coding-agent';
import {
  codaAdvance,
  codaCreate,
  codaEditBody,
  codaRead,
  codaRunTests,
  codaStatus,
  codaUpdate,
} from '../tools';

/**
 * Register all CODA Pi tools.
 *
 * @param pi - The Pi extension API
 * @param codaRoot - Path to the `.coda/` directory
 */
export function registerTools(pi: ExtensionAPI, codaRoot: string): void {
  const statePath = join(codaRoot, 'state.json');

  const createSchema = Type.Object({
    type: Type.Union([
      Type.Literal('issue'),
      Type.Literal('plan'),
      Type.Literal('task'),
      Type.Literal('record'),
      Type.Literal('reference'),
    ]),
    fields: Type.Record(Type.String(), Type.Unknown()),
    body: Type.Optional(Type.String()),
  });

  const readSchema = Type.Object({
    record: Type.String(),
    section: Type.Optional(Type.String()),
  });

  const updateSchema = Type.Object({
    record: Type.String(),
    fields: Type.Record(Type.String(), Type.Unknown()),
  });

  const editBodySchema = Type.Object({
    record: Type.String(),
    op: Type.Union([
      Type.Literal('append_section'),
      Type.Literal('replace_section'),
      Type.Literal('append_text'),
    ]),
    section: Type.Optional(Type.String()),
    content: Type.String(),
    create_if_missing: Type.Optional(Type.Boolean()),
  });

  const advanceSchema = Type.Object({
    target_phase: Type.String(),
  });

  const statusSchema = Type.Object({});

  const runTestsSchema = Type.Object({
    mode: Type.Union([Type.Literal('tdd'), Type.Literal('suite')]),
    pattern: Type.Optional(Type.String()),
  });

  pi.registerTool({
    name: 'coda_create',
    label: 'Create Record',
    description: 'Create a new mdbase record in .coda/ (issue, plan, task, reference, record).',
    parameters: createSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return createTextToolResult(codaCreate(params, codaRoot));
    },
  });

  pi.registerTool({
    name: 'coda_read',
    label: 'Read Record',
    description: 'Read a record from .coda/ with an optional section filter.',
    parameters: readSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return createTextToolResult(codaRead(params, codaRoot));
    },
  });

  pi.registerTool({
    name: 'coda_update',
    label: 'Update Record',
    description: 'Update frontmatter fields of an existing .coda/ record.',
    parameters: updateSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return createTextToolResult(codaUpdate(params, codaRoot));
    },
  });

  pi.registerTool({
    name: 'coda_edit_body',
    label: 'Edit Record Body',
    description: 'Edit the body of a .coda/ record using section-aware operations.',
    parameters: editBodySchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return createTextToolResult(codaEditBody(params, codaRoot));
    },
  });

  pi.registerTool({
    name: 'coda_advance',
    label: 'Advance Issue',
    description: 'Advance the focused issue to the next lifecycle phase.',
    parameters: advanceSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return createTextToolResult(codaAdvance(params, codaRoot, statePath));
    },
  });

  pi.registerTool({
    name: 'coda_status',
    label: 'CODA Status',
    description: 'Get the current CODA status (phase, task, next action).',
    parameters: statusSchema,
    async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
      return createTextToolResult(codaStatus(statePath));
    },
  });

  pi.registerTool({
    name: 'coda_run_tests',
    label: 'Run Tests',
    description: 'Run tests in TDD or suite mode.',
    parameters: runTestsSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return createTextToolResult(codaRunTests(params, statePath, {}));
    },
  });
}

/** Convert a CODA tool result into Pi's text content shape. */
function createTextToolResult<TDetails>(details: TDetails): {
  content: [{ type: 'text'; text: string }];
  details: TDetails;
} {
  return {
    content: [{ type: 'text', text: JSON.stringify(details, null, 2) }],
    details,
  };
}
