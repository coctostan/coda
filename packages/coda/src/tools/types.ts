/**
 * @module tools/types
 * Input/output type definitions for CODA tools.
 *
 * Each tool has a strongly-typed input and result type.
 * All results extend ToolResult with success/error base fields.
 */

import type { ScanContext } from '../forge';
/** Base result type for all CODA tools. */
export interface ToolResult {
  success: boolean;
  error?: string;
}

/** Input for coda_create — create a new mdbase record. */
export interface CreateInput {
  /** Record type to create */
  type: 'issue' | 'plan' | 'task' | 'record' | 'reference';
  /** Frontmatter fields for the record */
  fields: Record<string, unknown>;
  /** Optional initial body content */
  body?: string;
}

/** Result from coda_create. */
export interface CreateResult extends ToolResult {
  /** Path to the created record (relative to codaRoot) */
  path: string;
  /** Generated ID (e.g., issue slug, task number) */
  id?: string;
}

/** Input for coda_read — read a record with optional section filtering. */
export interface ReadInput {
  /** Record path relative to codaRoot */
  record: string;
  /** Optional: return only this ## section from the body */
  section?: string;
}

/** Result from coda_read. */
export interface ReadResult extends ToolResult {
  /** Parsed frontmatter fields */
  frontmatter: Record<string, unknown>;
  /** Full body or section content */
  body: string;
}

/** Input for coda_update — update frontmatter fields on an existing record. */
export interface UpdateInput {
  /** Record path relative to codaRoot */
  record: string;
  /** Partial fields to merge into frontmatter */
  fields: Record<string, unknown>;
}

/** Result from coda_update. */
export interface UpdateResult extends ToolResult {
  /** List of field names that were updated */
  updated_fields: string[];
}

/** Input for coda_edit_body — section-aware body editing. */
export interface EditBodyInput {
  /** Record path relative to codaRoot */
  record: string;
  /** Operation to perform */
  op: 'append_section' | 'replace_section' | 'append_text';
  /** Section heading (required for append_section and replace_section) */
  section?: string;
  /** Content to add or replace */
  content: string;
  /** If true, create the record if it doesn't exist */
  create_if_missing?: boolean;
}

/** Result from coda_edit_body. */
export interface EditBodyResult extends ToolResult {
  /** Human-readable summary of the change */
  diff_summary: string;
}

/** Input for coda_advance — request a phase transition. */
export interface AdvanceInput {
  /** Target phase to transition to */
  target_phase: string;
  /** Optional human review decision to apply before or instead of advancing. */
  human_review_decision?: 'approved' | 'changes-requested';
  /** Optional human review feedback captured for requested changes. */
  review_feedback?: string;
  /** Optional UNIFY review decision to apply before advancing to done. */
  unify_review_decision?: 'approved' | 'changes-requested';
  /** Optional UNIFY review feedback captured for requested changes. */
  unify_review_feedback?: string;
}

/** Result from coda_advance. */
export interface AdvanceResult extends ToolResult {
  /** Phase before the transition */
  previous_phase?: string;
  /** Phase after the transition (on success) */
  new_phase?: string;
  /** Name of the gate that blocked (on failure) */
  gate_name?: string;
  /** Reason the gate blocked (on failure) */
  reason?: string;
}

/** Input for coda_back — rewind the focused issue to a prior phase. */
export interface BackInput {
  /** Prior phase to rewind to. */
  target_phase: string;
}

/** Input for coda_focus — focus an issue and optionally create a branch. */
export interface FocusInput {
  /** Issue slug to focus. */
  slug: string;
  /** If false, skip feature branch creation. */
  create_branch?: boolean;
}

/** Successful coda_focus result. */
export interface FocusedOutput {
  status: 'focused';
  slug: string;
  phase: string;
  branch?: string;
  branch_status: 'created' | 'existing' | 'skipped';
  reason?: 'create_branch=false' | 'not a git repo' | 'git error';
  next_action: string;
}

/** Idempotent coda_focus result when the issue is already focused. */
export interface AlreadyFocusedOutput {
  status: 'already_focused';
  slug: string;
  phase: string | null;
  next_action: string;
}

/** Error coda_focus result. */
export interface FocusErrorOutput {
  status: 'error';
  reason: string;
  next_action: string;
}

/** Result from coda_focus. */
export type FocusOutput = FocusedOutput | AlreadyFocusedOutput | FocusErrorOutput;

/** Input for coda_forge — initialize CODA in a project. */
export interface ForgeInput {
  /** Optional project root override; defaults to the caller-provided cwd. */
  project_root?: string;
}

/** Scaffold result for coda_forge. */
export interface ForgeScaffoldedOutput {
  status: 'scaffolded';
  backdrop: 'greenfield' | 'brownfield';
  coda_root: string;
  next_action: string;
  scan_context?: ScanContext;
}

/** Idempotent coda_forge result when .coda already exists. */
export interface ForgeAlreadyInitializedOutput {
  status: 'already_initialized';
  backdrop: 'existing';
  coda_root: string;
  next_action: string;
}

/** Result from coda_forge. */
export type ForgeOutput = ForgeScaffoldedOutput | ForgeAlreadyInitializedOutput;

/** Result from coda_status. */
export interface StatusResult extends ToolResult {
  /** Currently focused issue slug */
  focus_issue: string | null;
  /** Current lifecycle phase */
  phase: string | null;
  /** Active review/verify submode */
  submode?: 'review' | 'revise' | 'verify' | 'correct' | null;
  /** Current loop iteration for submode-aware flows */
  loop_iteration?: number;
  /** Active task number */
  current_task: number | null;
  /** Active task kind when known */
  task_kind?: 'planned' | 'correction' | null;
  /** Active task title when known */
  task_title?: string | null;
  /** Completed task numbers */
  completed_tasks: number[];
  /** TDD write-gate state */
  tdd_gate: string;
  /** Whether the focused issue requires human review before build. */
  human_review_required?: boolean | null;
  /** Current durable human review status on the active plan. */
  human_review_status?: 'not-required' | 'pending' | 'approved' | 'changes-requested' | null;
  /** Current UNIFY review status from the completion record. */
  unify_review_status?: 'pending' | 'approved' | 'changes-requested' | null;
  /** Resolved gate mode for the active review phase when available. */
  gate_mode?: string | null;
  /** Human-readable suggestion for next action */
  next_action: string;
}

/** Input for coda_run_tests — execute test command. */
export interface RunTestsInput {
  /** Test mode: tdd affects gate, suite does not */
  mode: 'tdd' | 'suite';
  /** Optional file/pattern filter */
  pattern?: string;
}

/** Result from coda_run_tests. */
export interface RunTestsResult extends ToolResult {
  /** Process exit code */
  exit_code: number;
  /** Whether tests passed */
  passed: boolean;
  /** Truncated stdout+stderr output */
  output: string;
  /** Command that was executed */
  command: string;
}

/** Input for write-gate check. */
export interface WriteGateCheck {
  /** File path being written to */
  path: string;
  /** Type of write operation */
  operation: 'write' | 'edit';
}

/** Result from write-gate check. */
export interface WriteGateResult {
  /** Whether the write is allowed */
  allowed: boolean;
  /** Reason the write was blocked (on block) */
  reason?: string;
}

/** Supported record types for coda_query. */
export type QueryRecordType = 'issue' | 'task' | 'plan' | 'record' | 'reference' | 'decision';

/** Input for coda_query — list and filter mdbase records. */
export interface QueryInput {
  /** Record type to query. */
  type: QueryRecordType;
  /** Optional filters to narrow results. */
  filter?: {
    /** Issue slug — required for task and plan queries. */
    issue?: string;
    /** Filter by topic (matches against frontmatter.topics array). */
    topic?: string;
    /** Filter by status (exact match against frontmatter.status). */
    status?: string;
  };
}

/** Result from coda_query. */
export interface QueryResult extends ToolResult {
  /** Matching records with frontmatter only (no body). */
  records: Array<{ path: string; frontmatter: Record<string, unknown> }>;
}