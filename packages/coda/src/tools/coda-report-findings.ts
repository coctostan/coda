/**
 * @module tools/coda-report-findings
 * Persist structured module findings reported by the agent.
 */

import { HOOK_POINTS, loadState } from '@coda/core';
import type { HookPoint } from '@coda/core';
import { createModuleSystem, persistFindings } from '../workflow/module-integration';
import type { ToolResult } from './types';

/** Input for coda_report_findings. */
export interface ReportFindingsInput {
  /** Lifecycle hook point the findings belong to. */
  hook_point: string;
  /** Raw findings JSON array or fenced ```json block. */
  findings_json: string;
}

/** Result from coda_report_findings. */
export interface ReportFindingsResult extends ToolResult {
  /** Active issue the findings were persisted for. */
  issue?: string;
  /** Hook point the findings were parsed against. */
  hook_point?: HookPoint;
  /** Number of validated findings that were persisted. */
  finding_count?: number;
  /** Whether the parsed findings exceeded any module block threshold. */
  blocked?: boolean;
  /** Human-readable block reasons emitted by the dispatcher. */
  block_reasons?: string[];
}

/**
 * Parse and persist agent-reported module findings for the focused issue.
 *
 * @param input - Hook point and raw findings JSON from the agent
 * @param codaRoot - Root path of the `.coda/` directory
 * @param statePath - Path to state.json
 * @returns ReportFindingsResult with parse and persistence outcome
 */
export function codaReportFindings(
  input: ReportFindingsInput,
  codaRoot: string,
  statePath: string
): ReportFindingsResult {
  try {
    if (!HOOK_POINTS.includes(input.hook_point as HookPoint)) {
      return {
        success: false,
        error: `Invalid hook point: ${input.hook_point}`,
      };
    }

    const state = loadState(statePath);
    if (!state?.focus_issue) {
      return {
        success: false,
        error: 'No focus issue set — focus an issue first',
      };
    }

    const hookPoint = input.hook_point as HookPoint;
    const dispatcher = createModuleSystem(undefined, undefined, codaRoot);
    const hookResult = dispatcher.parseAndCheckFindings(input.findings_json, hookPoint);

    persistFindings(codaRoot, state.focus_issue, hookResult);

    return {
      success: true,
      issue: state.focus_issue,
      hook_point: hookPoint,
      finding_count: hookResult.findings.length,
      blocked: hookResult.blocked,
      block_reasons: hookResult.blockReasons,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message,
    };
  }
}
