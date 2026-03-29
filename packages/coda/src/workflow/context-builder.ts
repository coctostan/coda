/**
 * @module workflow/context-builder
 * Loads and assembles context from `.coda/` mdbase records.
 *
 * All functions use @coda/core data layer for record I/O.
 * Missing files return null/empty gracefully — no throws.
 */
import { readRecord, listRecords } from '@coda/core';
import type { IssueRecord, PlanRecord, TaskRecord } from '@coda/core';
import { join } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';

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
 * Load the plan record for an issue. Finds the first `plan-v*.md` in the issue directory.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @returns The plan record or null if not found
 */
export function loadPlan(
  codaRoot: string,
  issueSlug: string
): { frontmatter: PlanRecord; body: string } | null {
  const issueDir = join(codaRoot, 'issues', issueSlug);
  if (!existsSync(issueDir)) return null;

  try {
    const files = readdirSync(issueDir).filter((f) => f.startsWith('plan-v') && f.endsWith('.md'));
    if (files.length === 0) return null;

    files.sort();
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
    const tasks = files.map((filePath) =>
      readRecord<TaskRecord>(filePath)
    );
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

  const taskDir = join(codaRoot, 'issues', issueSlug, 'tasks');
  if (!existsSync(taskDir)) return '';

  const recentIds = completedTasks.slice(-maxTasks);
  const summaries: Array<{ id: number; content: string }> = [];

  try {
    const files = listRecords(taskDir);

    for (const filePath of files) {
      const record = readRecord<TaskRecord>(filePath);
      if (recentIds.includes(record.frontmatter.id)) {
        summaries.push({
          id: record.frontmatter.id,
          content: `### ${record.frontmatter.title} (Task ${String(record.frontmatter.id)})\n${record.body}`,
        });
      }
    }
  } catch {
    return '';
  }

  summaries.sort((a, b) => a.id - b.id);
  return summaries.map((summary) => summary.content).join('\n');
}
