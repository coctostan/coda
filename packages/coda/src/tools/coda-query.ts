/**
 * @module tools/coda-query
 * Query and filter mdbase records in `.coda/`.
 *
 * Returns frontmatter only (no body) for compact responses.
 * Supports listing issues, tasks, plans, records, references, and decisions.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { listRecords, readRecord } from '@coda/core';
import type { QueryInput, QueryResult } from './types';

/**
 * Query mdbase records by type with optional filtering.
 *
 * @param input - Query parameters (type + optional filters)
 * @param codaRoot - Path to the `.coda/` directory
 * @returns QueryResult with matching records (frontmatter only)
 */
export function codaQuery(input: QueryInput, codaRoot: string): QueryResult {
  const { type, filter } = input;

  switch (type) {
    case 'issue':
      return queryDirectory(join(codaRoot, 'issues'), filter);

    case 'task': {
      if (!filter?.issue) {
        return { success: false, error: 'filter.issue is required for task queries', records: [] };
      }
      return queryDirectory(join(codaRoot, 'issues', filter.issue, 'tasks'), filter);
    }

    case 'plan': {
      if (!filter?.issue) {
        return { success: false, error: 'filter.issue is required for plan queries', records: [] };
      }
      return queryPlans(join(codaRoot, 'issues', filter.issue), filter);
    }

    case 'record':
      return queryDirectory(join(codaRoot, 'records'), filter);

    case 'reference':
      return queryDirectory(join(codaRoot, 'reference'), filter);

    case 'decision':
      return queryDirectory(join(codaRoot, 'decisions'), filter);

    default:
      return { success: false, error: `Unknown query type: ${String(type)}`, records: [] };
  }
}

/**
 * Query all .md records in a directory with optional filtering.
 */
function queryDirectory(
  dir: string,
  filter?: QueryInput['filter']
): QueryResult {
  if (!existsSync(dir)) {
    return { success: true, records: [] };
  }

  const paths = listRecords(dir);
  const records = readAndFilter(paths, filter);
  return { success: true, records };
}

/**
 * Query plan files (plan-v*.md) in an issue directory.
 */
function queryPlans(
  issueDir: string,
  filter?: QueryInput['filter']
): QueryResult {
  if (!existsSync(issueDir)) {
    return { success: true, records: [] };
  }

  try {
    const planFiles = readdirSync(issueDir)
      .filter((f) => f.startsWith('plan-v') && f.endsWith('.md'))
      .sort()
      .map((f) => join(issueDir, f));

    const records = readAndFilter(planFiles, filter);
    return { success: true, records };
  } catch {
    return { success: true, records: [] };
  }
}

/**
 * Read records from paths and apply optional filters.
 * Returns frontmatter only (no body).
 */
function readAndFilter(
  paths: string[],
  filter?: QueryInput['filter']
): Array<{ path: string; frontmatter: Record<string, unknown> }> {
  const results: Array<{ path: string; frontmatter: Record<string, unknown> }> = [];

  for (const filePath of paths) {
    try {
      const record = readRecord<Record<string, unknown>>(filePath);
      const fm = record.frontmatter;

      if (filter?.status && fm.status !== filter.status) continue;

      if (filter?.topic) {
        const topics = Array.isArray(fm.topics) ? fm.topics : [];
        if (!topics.includes(filter.topic)) continue;
      }

      results.push({ path: filePath, frontmatter: fm });
    } catch {
      // Skip unreadable records
    }
  }

  return results;
}
