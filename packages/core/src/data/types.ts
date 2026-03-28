/**
 * @module types
 * Core type schemas for CODA mdbase records.
 *
 * All CODA data (issues, plans, tasks, records, reference docs) are markdown
 * files with structured YAML frontmatter. These types define the shape of
 * that frontmatter for each record kind.
 */

/** A single acceptance criterion attached to an issue. */
export interface AcceptanceCriterion {
  /** Identifier like "AC-1", "AC-2" */
  id: string;
  /** Human-readable description of the criterion */
  text: string;
  /** Current evaluation status */
  status: 'pending' | 'met' | 'not-met';
}

/** Tracks specification changes between plan iterations. */
export interface SpecDelta {
  /** Newly added spec items */
  added: string[];
  /** Modified spec items */
  modified: string[];
  /** Removed spec items */
  removed: string[];
  /** Human-readable summary of the delta */
  delta_summary: string;
}

/**
 * Frontmatter schema for issue records.
 * Issues are the primary work unit in CODA — they flow through
 * the SPECIFY → PLAN → REVIEW → BUILD → VERIFY → UNIFY → DONE lifecycle.
 */
export interface IssueRecord {
  title: string;
  issue_type: 'feature' | 'bugfix' | 'refactor' | 'chore' | 'docs';
  status: 'proposed' | 'active' | 'resolved' | 'complete' | 'wont-fix';
  phase: 'specify' | 'plan' | 'review' | 'build' | 'verify' | 'unify' | 'done';
  milestone?: string;
  /** Priority from 1 (highest) to 5 (lowest), default 3 */
  priority: number;
  branch?: string;
  current_task?: number;
  topics: string[];
  acceptance_criteria: AcceptanceCriterion[];
  open_questions: string[];
  deferred_items: string[];
  human_review: boolean;
  spec_delta?: SpecDelta;
}

/**
 * Frontmatter schema for plan records.
 * Plans define the implementation approach for an issue.
 */
export interface PlanRecord {
  title: string;
  /** Slug of the parent issue */
  issue: string;
  status: 'draft' | 'in-review' | 'approved' | 'superseded';
  iteration: number;
  task_count: number;
  human_review_status: 'not-required' | 'pending' | 'approved' | 'changes-requested';
}

/**
 * Frontmatter schema for task records.
 * Tasks are individual work items within a plan.
 */
export interface TaskRecord {
  id: number;
  issue: string;
  title: string;
  status: 'pending' | 'active' | 'complete' | 'blocked';
  kind: 'planned' | 'correction';
  /** AC IDs this task covers */
  covers_ac: string[];
  depends_on: number[];
  files_to_modify: string[];
  truths: string[];
  artifacts: Array<{ path: string; description: string }>;
  key_links: Array<{ from: string; to: string; via: string }>;
}

/**
 * Frontmatter schema for completion records.
 * Created when an issue reaches the DONE state.
 */
export interface CompletionRecord {
  title: string;
  issue: string;
  completed_at: string;
  topics: string[];
  reference_docs_reviewed: boolean;
  system_spec_updated: boolean;
  milestone_updated: boolean;
}

/**
 * Frontmatter schema for reference documents.
 * Reference docs persist project knowledge (system spec, PRD, conventions, etc.).
 */
export interface ReferenceDoc {
  title: string;
  category: 'system' | 'architecture' | 'prd' | 'convention' | 'pattern';
  topics: string[];
  last_verified?: string;
  last_updated_by?: string;
}
