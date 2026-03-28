/**
 * @module workflow/context-builder
 * Loads and assembles context from `.coda/` mdbase records.
 *
 * All functions use @coda/core data layer for record I/O.
 * Missing files return null/empty gracefully — no throws.
 */

import { readRecord, listRecords } from '@coda/core';
import type { IssueRecord, TaskRecord } from '@coda/core';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

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
): { frontmatter: Record<string, unknown>; body: string } | null {
  const issueDir = join(codaRoot, 'issues', issueSlug);
  if (!existsSync(issueDir)) return null;

  try {
    const files = readdirSync(issueDir).filter((f) => f.startsWith('plan-v') && f.endsWith('.md'));
    if (files.length === 0) return null;

    // Sort to get the latest plan version
    files.sort();
    const planFile = files[files.length - 1]!;
    return readRecord<Record<string, unknown>>(join(issueDir, planFile));
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
    tasks.sort((a, b) => (a.frontmatter.id as number) - (b.frontmatter.id as number));
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

  // Take the last N completed task ids
  const recentIds = completedTasks.slice(-maxTasks);

  const summaries: string[] = [];

  try {
    const files = listRecords(taskDir);

    for (const filePath of files) {
      const record = readRecord<TaskRecord>(filePath);
      if (recentIds.includes(record.frontmatter.id as number)) {
        summaries.push(
          `### ${record.frontmatter.title} (Task ${String(record.frontmatter.id)})\n${record.body}`
        );
      }
    }
  } catch {
    return '';
  }

  // Sort by task id to maintain order
  summaries.sort();
  return summaries.join('\n');
}
