/**
 * @module pi/tools
 * Tool registration for the CODA Pi extension.
 *
 * Registers all 7 coda_* tools with the Pi API so the LLM can call them.
 * Each tool wraps the corresponding function from src/tools/.
 */

import type { PiAPI } from './types';
import { join } from 'path';
import {
  codaCreate,
  codaRead,
  codaUpdate,
  codaEditBody,
  codaAdvance,
  codaStatus,
  codaRunTests,
} from '../tools';

/**
 * Register all coda_* tools with the Pi API.
 *
 * Each tool gets a schema (description + parameters for the LLM)
 * and a handler that delegates to the corresponding function.
 *
 * @param pi - The Pi extension API
 * @param codaRoot - Path to the `.coda/` directory
 */
export function registerTools(pi: PiAPI, codaRoot: string): void {
  const statePath = join(codaRoot, 'state.json');

  pi.registerTool('coda_create', {
    description: 'Create a new mdbase record in .coda/ (issue, plan, task, reference, record)',
    parameters: { type: { type: 'string' }, fields: { type: 'object' }, body: { type: 'string' } },
  }, (args) => codaCreate(args as unknown as Parameters<typeof codaCreate>[0], codaRoot));

  pi.registerTool('coda_read', {
    description: 'Read a record from .coda/ with optional section filter',
    parameters: { record: { type: 'string' }, section: { type: 'string' } },
  }, (args) => codaRead(args as unknown as Parameters<typeof codaRead>[0], codaRoot));

  pi.registerTool('coda_update', {
    description: 'Update frontmatter fields of an existing .coda/ record',
    parameters: { record: { type: 'string' }, fields: { type: 'object' } },
  }, (args) => codaUpdate(args as unknown as Parameters<typeof codaUpdate>[0], codaRoot));

  pi.registerTool('coda_edit_body', {
    description: 'Edit the body of a .coda/ record (append_section, replace_section, append_text)',
    parameters: { record: { type: 'string' }, op: { type: 'string' }, content: { type: 'string' } },
  }, (args) => codaEditBody(args as unknown as Parameters<typeof codaEditBody>[0], codaRoot));

  pi.registerTool('coda_advance', {
    description: 'Advance an issue to the next lifecycle phase',
    parameters: { issue_slug: { type: 'string' }, target_phase: { type: 'string' } },
  }, (args) => codaAdvance(args as unknown as Parameters<typeof codaAdvance>[0], codaRoot, statePath));

  pi.registerTool('coda_status', {
    description: 'Get current CODA status (phase, task, next action)',
    parameters: {},
  }, () => codaStatus(codaRoot));

  pi.registerTool('coda_run_tests', {
    description: 'Run tests in TDD or suite mode',
    parameters: { mode: { type: 'string' } },
  }, (args) => codaRunTests(
    args as unknown as Parameters<typeof codaRunTests>[0],
    statePath,
    {}
  ));
}
