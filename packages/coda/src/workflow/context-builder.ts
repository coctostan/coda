/**
 * @module workflow/context-builder
 * Loads and assembles context from `.coda/` mdbase records.
 *
 * All functions use @coda/core data layer for record I/O.
 * Missing files return null/empty gracefully — no throws.
 */
import { readRecord, listRecords } from '@coda/core';
import type { IssueRecord, PlanRecord, TaskRecord } from '@coda/core';
import type { VerificationFailureArtifact, VerificationFailedCheck } from './types';
import { join } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { loadFindings, summarizeFindings } from './module-integration';
import { sortByNumericSuffix } from '../tools/sort-utils';

/**
 * Load an issue record from `.coda/issues/{slug}.md`.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug (filename without extension)
 * @returns The issue record or null if not found
 */
export function loadIssue(
  codaRoot: string,
  issueSlug: string
): { frontmatter: IssueRecord; body: string } | null {
  const path = join(codaRoot, 'issues', `${issueSlug}.md`);
  if (!existsSync(path)) return null;
  return readRecord<IssueRecord>(path);
}

/**
 * Load the latest plan record for an issue.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @returns The latest plan record or null if not found
 */
export function loadPlan(
  codaRoot: string,
  issueSlug: string
): { frontmatter: PlanRecord; body: string } | null {
  const issueDir = join(codaRoot, 'issues', issueSlug);
  if (!existsSync(issueDir)) return null;

  try {
    const files = sortByNumericSuffix(
      readdirSync(issueDir).filter((f) => f.startsWith('plan-v') && f.endsWith('.md'))
    );
    if (files.length === 0) return null;
    const planFile = files[files.length - 1]!;
    return readRecord<PlanRecord>(join(issueDir, planFile));
  } catch {
    return null;
  }
}

/**
 * Load all task records for an issue, sorted by task id ascending.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @returns Array of task records sorted by id, or empty array if none
 */
export function loadTasks(
  codaRoot: string,
  issueSlug: string
): Array<{ frontmatter: TaskRecord; body: string }> {
  const taskDir = join(codaRoot, 'issues', issueSlug, 'tasks');
  if (!existsSync(taskDir)) return [];

  try {
    const files = listRecords(taskDir);
    const tasks = files.map((filePath) => {
      const record = readRecord<TaskRecord>(filePath);
      return {
        frontmatter: {
          ...record.frontmatter,
          covers_ac: record.frontmatter.covers_ac ?? [],
          depends_on: record.frontmatter.depends_on ?? [],
          files_to_modify: record.frontmatter.files_to_modify ?? [],
          truths: record.frontmatter.truths ?? [],
          artifacts: record.frontmatter.artifacts ?? [],
          key_links: record.frontmatter.key_links ?? [],
        },
        body: record.body,
      };
    });
    tasks.sort((a, b) => a.frontmatter.id - b.frontmatter.id);
    return tasks;
  } catch {
    return [];
  }
}

/**
 * Load reference documents (ref-system.md and ref-prd.md).
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @returns Object with `system` and `prd` content strings (empty if missing)
 */
export function loadRefDocs(codaRoot: string): { system: string; prd: string } {
  const refDir = join(codaRoot, 'reference');
  let system = '';
  let prd = '';

  const systemPath = join(refDir, 'ref-system.md');
  if (existsSync(systemPath)) {
    try {
      const record = readRecord<Record<string, unknown>>(systemPath);
      system = record.body;
    } catch {
      system = '';
    }
  }

  const prdPath = join(refDir, 'ref-prd.md');
  if (existsSync(prdPath)) {
    try {
      const record = readRecord<Record<string, unknown>>(prdPath);
      prd = record.body;
    } catch {
      prd = '';
    }
  }

  return { system, prd };
}

/**
 * Load the active revision instructions artifact for an issue.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @returns Raw markdown content, or empty string if missing
 */
export function loadRevisionInstructions(codaRoot: string, issueSlug: string): string {
  const path = join(codaRoot, 'issues', issueSlug, 'revision-instructions.md');
  if (!existsSync(path)) return '';

  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Load prior revision instruction snapshots for an issue.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @returns Concatenated markdown history, or empty string if none exists
 */
export function loadRevisionHistory(codaRoot: string, issueSlug: string): string {
  const historyDir = join(codaRoot, 'issues', issueSlug, 'revision-history');
  if (!existsSync(historyDir)) return '';

  try {
    const historyFiles = readdirSync(historyDir)
      .filter((file) => file.endsWith('.md'))
      .sort();

    const entries = historyFiles.map((file) => {
      const content = readFileSync(join(historyDir, file), 'utf-8').trim();
      return content.length > 0 ? `### ${file}\n${content}` : '';
    }).filter(Boolean);

    return entries.join('\n\n');
  } catch {
    return '';
  }
}

/**
 * Get summaries from the most recent N completed tasks (carry-forward).
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @param completedTasks - Array of completed task ids
 * @param maxTasks - Maximum number of summaries to include (default: 3)
 * @returns Assembled summary string, or empty string if none
 */
export function getPreviousTaskSummaries(
  codaRoot: string,
  issueSlug: string,
  completedTasks: number[],
  maxTasks: number = 3
): string {
  if (completedTasks.length === 0) return '';
  return getSourceTaskSummaries(codaRoot, issueSlug, completedTasks.slice(-maxTasks));
}

/**
 * Load one verification failure artifact by AC id.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @param acId - Acceptance criterion id
 * @returns Parsed artifact, or null if missing / invalid
 */
export function loadVerificationFailure(
  codaRoot: string,
  issueSlug: string,
  acId: string
): VerificationFailureArtifact | null {
  const path = join(codaRoot, 'issues', issueSlug, 'verification-failures', `${acId}.yaml`);
  if (!existsSync(path)) return null;

  try {
    return parseVerificationFailure(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Load all verification failure artifacts for an issue, sorted by filename.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @returns Parsed artifacts in deterministic order
 */
export function loadVerificationFailures(
  codaRoot: string,
  issueSlug: string
): VerificationFailureArtifact[] {
  const dir = join(codaRoot, 'issues', issueSlug, 'verification-failures');
  if (!existsSync(dir)) return [];

  try {
    return readdirSync(dir)
      .filter((file) => file.endsWith('.yaml'))
      .sort()
      .map((file) => parseVerificationFailure(readFileSync(join(dir, file), 'utf-8')))
      .filter((artifact): artifact is VerificationFailureArtifact => artifact !== null);
  } catch {
    return [];
  }
}

/**
 * Get summaries for specific source task ids in ascending task order.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @param taskIds - Task ids whose summaries should be included
 * @returns Assembled summary string, or empty string if none
 */
export function getSourceTaskSummaries(
  codaRoot: string,
  issueSlug: string,
  taskIds: number[]
): string {
  if (taskIds.length === 0) return '';

  const requestedIds = new Set(taskIds);
  const tasks = loadTasks(codaRoot, issueSlug)
    .filter((task) => requestedIds.has(task.frontmatter.id))
    .sort((a, b) => a.frontmatter.id - b.frontmatter.id);

  return tasks
    .map((task) => `### ${task.frontmatter.title} (Task ${String(task.frontmatter.id)})\n${task.body}`)
    .join('\n');
}

function parseVerificationFailure(content: string): VerificationFailureArtifact | null {
  const lines = content.split(/\r?\n/);
  let acId = '';
  let status: 'not-met' = 'not-met';
  const failedChecks: VerificationFailedCheck[] = [];
  let currentCheck: VerificationFailedCheck | null = null;
  let sourceTasks: number[] = [];
  const relevantFiles: string[] = [];
  let section: 'failed_checks' | 'relevant_files' | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('ac_id:')) {
      acId = trimmed.slice('ac_id:'.length).trim();
      section = null;
      continue;
    }

    if (trimmed.startsWith('status:')) {
      status = 'not-met';
      section = null;
      continue;
    }

    if (trimmed === 'failed_checks:') {
      section = 'failed_checks';
      continue;
    }

    if (trimmed.startsWith('source_tasks:')) {
      sourceTasks = parseNumberArray(trimmed.slice('source_tasks:'.length).trim());
      section = null;
      continue;
    }

    if (trimmed === 'relevant_files:') {
      section = 'relevant_files';
      continue;
    }

    if (section === 'failed_checks' && trimmed.startsWith('- type:')) {
      currentCheck = {
        type: trimmed.slice('- type:'.length).trim(),
        detail: '',
      };
      failedChecks.push(currentCheck);
      continue;
    }

    if (section === 'failed_checks' && trimmed.startsWith('detail:') && currentCheck) {
      currentCheck.detail = unquote(trimmed.slice('detail:'.length).trim());
      continue;
    }

    if (section === 'relevant_files' && trimmed.startsWith('- ')) {
      relevantFiles.push(trimmed.slice(2).trim());
    }
  }

  if (!acId) return null;

  return {
    acId,
    status,
    failedChecks,
    sourceTasks,
    relevantFiles,
  };
}

function parseNumberArray(value: string): number[] {
  const normalized = value.trim();
  if (!normalized.startsWith('[') || !normalized.endsWith(']')) return [];
  const inner = normalized.slice(1, -1).trim();
  if (inner.length === 0) return [];

  return inner
    .split(',')
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry));
}

function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Load and summarize module findings for cross-phase context injection.
 *
 * Returns a compact summary string suitable for inclusion in verify/unify context.
 * Returns empty string if no findings exist for the issue.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @returns Compact findings summary, or '' if none
 */
export function loadModuleFindingsSummary(
  codaRoot: string,
  issueSlug: string
): string {
  const data = loadFindings(codaRoot, issueSlug);
  if (data.hookResults.length === 0) return '';
  return summarizeFindings(data.hookResults);
}