import { createDefaultState, loadState, persistState, updateFrontmatter } from '@coda/core';
import type { IssueRecord } from '@coda/core';
import { existsSync } from 'fs';
import { join } from 'path';
import type { AdvanceResult } from './types';

export function codaKill(codaRoot: string, statePath: string): AdvanceResult {
  const state = loadState(statePath);
  if (!state) {
    return { success: false, error: 'No state found — run coda forge to initialize' };
  }

  if (!state.focus_issue) {
    return { success: false, error: 'No focus issue set — focus an issue first' };
  }

  const issuePath = join(codaRoot, 'issues', `${state.focus_issue}.md`);
  if (!existsSync(issuePath)) {
    return { success: false, error: `No issue found for ${state.focus_issue}` };
  }

  updateFrontmatter<IssueRecord>(issuePath, {
    status: 'wont-fix',
    phase: 'done',
  });

  persistState(createDefaultState(), statePath);
  return {
    success: true,
    previous_phase: state.phase ?? undefined,
    new_phase: 'done',
  };
}
