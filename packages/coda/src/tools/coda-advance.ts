/**
 * @module tools/coda-advance
 * Request a phase transition for the focused issue.
 *
 * Gathers gate data from mdbase records, passes it to the
 * state engine's transition function, and updates both the
 * issue record and state.json on success.
 */

import {
  readRecord,
  updateFrontmatter,
  transition,
  loadState,
  persistState,
  listRecords,
} from '@coda/core';
import type { Phase, GateCheckData } from '@coda/core';
import { join } from 'path';
import { existsSync } from 'fs';
import type { AdvanceInput, AdvanceResult } from './types';

/**
 * Gather gate check data from the issue's mdbase records.
 */
function gatherGateData(codaRoot: string, issueSlug: string): GateCheckData {
  const issuePath = join(codaRoot, 'issues', `${issueSlug}.md`);
  const issueDir = join(codaRoot, 'issues', issueSlug);

  const data: GateCheckData = {};

  // Read issue record for AC count
  if (existsSync(issuePath)) {
    const { frontmatter } = readRecord<Record<string, unknown>>(issuePath);
    const acs = frontmatter['acceptance_criteria'];
    data.issueAcCount = Array.isArray(acs) ? acs.length : 0;

    // Check all ACs met
    if (Array.isArray(acs)) {
      data.allAcsMet = acs.length > 0 && acs.every(
        (ac) => typeof ac === 'object' && ac !== null && (ac as Record<string, unknown>)['status'] === 'met'
      );
    }
  }

  // Check if plan exists
  if (existsSync(issueDir)) {
    const files = listRecords(issueDir);
    const planFile = files.find((f) => f.includes('plan-'));
    data.planExists = planFile !== undefined;

    // Check if plan is approved
    if (planFile) {
      const { frontmatter } = readRecord<Record<string, unknown>>(planFile);
      data.planApproved = frontmatter['status'] === 'approved';

      // Check all tasks complete
      const taskCount = frontmatter['task_count'] as number | undefined;
      if (taskCount !== undefined) {
        const tasksDir = join(issueDir, 'tasks');
        if (existsSync(tasksDir)) {
          const taskFiles = listRecords(tasksDir);
          const completeTasks = taskFiles.filter((f) => {
            const { frontmatter: tf } = readRecord<Record<string, unknown>>(f);
            return tf['status'] === 'complete';
          });
          data.allPlannedTasksComplete = completeTasks.length >= taskCount;
        } else {
          data.allPlannedTasksComplete = taskCount === 0;
        }
      }
    }
  }

  // Check completion record exists
  const completionFiles = existsSync(join(codaRoot, 'records'))
    ? listRecords(join(codaRoot, 'records'))
    : [];
  data.completionRecordExists = completionFiles.some((f) => f.includes(issueSlug));

  return data;
}

/**
 * Request a phase transition for the focused issue.
 *
 * Gathers gate data from mdbase records, validates the transition
 * via the state engine, and updates both the issue frontmatter
 * and state.json on success.
 *
 * @param input - Target phase to transition to
 * @param codaRoot - Root path of the `.coda/` directory
 * @param statePath - Path to state.json
 * @returns AdvanceResult with transition outcome
 */
export function codaAdvance(
  input: AdvanceInput,
  codaRoot: string,
  statePath: string
): AdvanceResult {
  try {
    const state = loadState(statePath);
    if (!state) {
      return { success: false, error: 'No state found — run coda forge to initialize' };
    }

    if (!state.focus_issue) {
      return { success: false, error: 'No focus issue set — focus an issue first' };
    }

    const previousPhase = state.phase;
    const targetPhase = input.target_phase as Phase;
    const gateData = gatherGateData(codaRoot, state.focus_issue);

    const result = transition(state, targetPhase, gateData);

    if (!result.success) {
      // Extract gate name from error
      const gateMatch = result.error?.match(/Gate "([^"]+)"/);
      return {
        success: false,
        previous_phase: previousPhase ?? undefined,
        gate_name: gateMatch?.[1],
        reason: result.error,
      };
    }

    // Update issue phase in mdbase
    const issuePath = join(codaRoot, 'issues', `${state.focus_issue}.md`);
    if (existsSync(issuePath)) {
      updateFrontmatter(issuePath, { phase: targetPhase });
    }

    // Persist new state
    if (result.state) {
      persistState(result.state, statePath);
    }

    return {
      success: true,
      previous_phase: previousPhase ?? undefined,
      new_phase: targetPhase,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
