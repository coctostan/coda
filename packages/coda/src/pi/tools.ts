/**
 * @module pi/tools
 * Tool registration for the CODA Pi extension.
 *
 * Registers all `coda_*` tools using Pi's real ExtensionAPI and TypeBox schemas.
 */

import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { Type } from '@sinclair/typebox';
import type { ExtensionAPI } from '@mariozechner/pi-coding-agent';
import { loadState } from '@coda/core';
import {
  codaAdvance,
  codaConfig,
  codaCreate,
  codaEditBody,
  codaFocus,
  codaForge,
  codaQuery,
  codaRead,
  codaReportFindings,
  codaRunTests,
  codaStatus,
  codaUpdate,
} from '../tools';
import { commitTask } from '../workflow';

/**
 * Register all CODA Pi tools.
 *
 * @param pi - The Pi extension API
 * @param codaRoot - Path to the `.coda/` directory
 * @param projectRoot - Absolute path to the project root (for VCS operations)
 */
export function registerTools(pi: ExtensionAPI, codaRoot: string, projectRoot: string = dirname(codaRoot)): void {
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

  const focusSchema = Type.Object({
    slug: Type.String(),
    create_branch: Type.Optional(Type.Boolean()),
  });

  const forgeSchema = Type.Object({
    project_root: Type.Optional(Type.String()),
  });

  const configSchema = Type.Object({
    action: Type.Union([Type.Literal('get'), Type.Literal('set')]),
    key: Type.Optional(Type.String()),
    value: Type.Optional(Type.Unknown()),
  });

  const runTestsSchema = Type.Object({
    mode: Type.Union([Type.Literal('tdd'), Type.Literal('suite')]),
    pattern: Type.Optional(Type.String()),
  });

  const reportFindingsSchema = Type.Object({
    hook_point: Type.String(),
    findings_json: Type.String(),
  });

  const querySchema = Type.Object({
    type: Type.Union([
      Type.Literal('issue'),
      Type.Literal('task'),
      Type.Literal('plan'),
      Type.Literal('record'),
      Type.Literal('reference'),
      Type.Literal('decision'),
    ]),
    filter: Type.Optional(Type.Object({
      issue: Type.Optional(Type.String()),
      topic: Type.Optional(Type.String()),
      status: Type.Optional(Type.String()),
    })),
  });

  pi.registerTool({
    name: 'coda_forge',
    label: 'Initialize CODA',
    description: 'Initialize CODA in the project (greenfield scaffold or brownfield onboarding). Call this before coda_create. Idempotent — returns already_initialized if .coda/ exists.',
    parameters: forgeSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return executeWithCodaErrorHandling(() => codaForge(params, projectRoot));
    },
  });

  pi.registerTool({
    name: 'coda_create',
    label: 'Create Record',
    description: 'Create a new mdbase record in .coda/ (issue, plan, task, reference, record).',
    parameters: createSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return executeWithCodaErrorHandling(() => codaCreate(params, codaRoot));
    },
  });

  pi.registerTool({
    name: 'coda_read',
    label: 'Read Record',
    description: 'Read a record from .coda/ with an optional section filter.',
    parameters: readSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return executeWithCodaErrorHandling(() => codaRead(params, codaRoot));
    },
  });

  pi.registerTool({
    name: 'coda_update',
    label: 'Update Record',
    description: 'Update frontmatter fields of an existing .coda/ record.',
    parameters: updateSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const result = await executeWithCodaErrorHandling(() => codaUpdate(params, codaRoot));
      tryCommitAfterTaskComplete(params, statePath, projectRoot);
      return result;
    },
  });

  pi.registerTool({
    name: 'coda_edit_body',
    label: 'Edit Record Body',
    description: 'Edit the body of a .coda/ record using section-aware operations.',
    parameters: editBodySchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return executeWithCodaErrorHandling(() => codaEditBody(params, codaRoot));
    },
  });

  pi.registerTool({
    name: 'coda_advance',
    label: 'Advance Issue',
    description: 'Advance the focused issue to the next lifecycle phase.',
    parameters: advanceSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return executeWithCodaErrorHandling(() => codaAdvance(params, codaRoot, statePath));
    },
  });

  pi.registerTool({
    name: 'coda_report_findings',
    label: 'Report Module Findings',
    description: 'Parse and persist module findings JSON for the focused issue.',
    parameters: reportFindingsSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return executeWithCodaErrorHandling(() => codaReportFindings(params, codaRoot, statePath));
    },
  });

  pi.registerTool({
    name: 'coda_config',
    label: 'CODA Config',
    description:
      "Read or update CODA project configuration (coda.json). Use action 'get' to read config, 'set' with key and value to update a specific setting.",
    parameters: configSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return executeWithCodaErrorHandling(() => codaConfig(params, codaRoot));
    },
  });

  pi.registerTool({
    name: 'coda_status',
    label: 'CODA Status',
    description: 'Get the current CODA status (phase, task, next action).',
    parameters: statusSchema,
    async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
      return executeWithCodaErrorHandling(() => codaStatus(statePath, codaRoot));
    },
  });

  pi.registerTool({
    name: 'coda_focus',
    label: 'Focus Issue',
    description: 'Focus an issue to begin its lifecycle. Creates a feature branch by default (set create_branch: false to skip).',
    parameters: focusSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return executeWithCodaErrorHandling(() => codaFocus(params, codaRoot, projectRoot));
    },
  });

  pi.registerTool({
    name: 'coda_run_tests',
    label: 'Run Tests',
    description: 'Run tests in TDD or suite mode.',
    parameters: runTestsSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return executeWithCodaErrorHandling(() => {
        const config = loadCodaConfig(codaRoot);
        return codaRunTests(params, statePath, config);
      });
    },
  });

  pi.registerTool({
    name: 'coda_query',
    label: 'Query Records',
    description: 'List and filter .coda/ records by type. Returns frontmatter only for compact results. Types: issue, task, plan, record, reference, decision.',
    parameters: querySchema,
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      return executeWithCodaErrorHandling(() => codaQuery(params, codaRoot));
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

async function executeWithCodaErrorHandling<TDetails>(
  operation: () => TDetails | Promise<TDetails>
): Promise<{
  content: [{ type: 'text'; text: string }];
  details: TDetails | { error: string };
}> {
  try {
    return createTextToolResult(await operation());
  } catch (err) {
    return createTextToolResult({ error: formatCodaError(err) });
  }
}

function formatCodaError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return `CODA error: ${message}`;
}

/** Load coda.json config from the .coda/ directory. */
function loadCodaConfig(codaRoot: string): {
  tdd_test_command?: string;
  full_suite_command?: string;
} {
  const configPath = join(codaRoot, 'coda.json');
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Auto-commit after a BUILD task is marked complete.
 *
 * Best-effort: VCS failures never break the coda_update operation.
 * Only triggers when: record is a task, status set to "complete", current phase is "build".
 */
function tryCommitAfterTaskComplete(
  params: { record: string; fields: Record<string, unknown> },
  statePath: string,
  projectRoot: string
): void {
  try {
    if (!params.record.includes('/tasks/') || params.fields.status !== 'complete') return;
    const state = loadState(statePath);
    if (!state || state.phase !== 'build') return;

    const taskId = extractTaskId(params.record);
    if (taskId === null) return;

    const taskTitle = typeof params.fields.title === 'string'
      ? params.fields.title
      : `task-${String(taskId)}`;

    commitTask(projectRoot, taskId, taskTitle);
  } catch {
    // Best-effort — VCS failures don't break the update
  }
}

/**
 * Extract task numeric ID from a record path like "issues/my-issue/tasks/01-setup.md".
 *
 * @param record - The record path
 * @returns The task ID number, or null if not parseable
 */
function extractTaskId(record: string): number | null {
  const match = record.match(/tasks\/(\d+)/);
  if (!match?.[1]) return null;
  const id = parseInt(match[1], 10);
  return Number.isNaN(id) ? null : id;
}