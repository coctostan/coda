/**
 * @module tools/coda-create
 * Create new mdbase records in the `.coda/` directory.
 *
 * Generates correct file paths based on record type,
 * creates directory structures as needed, and persists
 * records via the core data layer.
 */

import { writeRecord } from '@coda/core';
import { join } from 'path';
import type { CreateInput, CreateResult } from './types';

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Convert a title string to a kebab-case slug.
 *
 * @param title - Human-readable title
 * @returns Kebab-case slug suitable for file names
 */
export function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function validatePathSlug(slug: string, label: string): string {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`${label} must match ^[a-z0-9][a-z0-9-]*$`);
  }

  return slug;
}

function validateTitleSlug(title: string, label: string): string {
  const slug = toSlug(title);
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`${label} must produce a non-empty slug matching ^[a-z0-9][a-z0-9-]*$`);
  }

  return slug;
}

/**
 * Generate the file path for a new record based on its type.
 */
function generatePath(input: CreateInput): { path: string; id?: string } {
  const fields = input.fields;
  const title = fields['title'] as string | undefined;

  switch (input.type) {
    case 'issue': {
      if (!title) throw new Error('Issue requires a title field');
      const slug = validateTitleSlug(title, 'Issue title');
      return { path: `issues/${slug}.md`, id: slug };
    }
    case 'plan': {
      const issue = fields['issue'] as string | undefined;
      const iteration = (fields['iteration'] as number | undefined) ?? 1;
      if (!issue) throw new Error('Plan requires an issue field');
      const issueSlug = validatePathSlug(issue, 'Plan issue slug');
      return { path: `issues/${issueSlug}/plan-v${String(iteration)}.md` };
    }
    case 'task': {
      const issue = fields['issue'] as string | undefined;
      const id = fields['id'] as number | undefined;
      if (!issue) throw new Error('Task requires an issue field');
      if (id === undefined) throw new Error('Task requires an id field');
      const issueSlug = validatePathSlug(issue, 'Task issue slug');
      const slug = title ? validateTitleSlug(title, 'Task title') : validatePathSlug(`task-${String(id)}`, 'Task slug');
      const padded = String(id).padStart(2, '0');
      return { path: `issues/${issueSlug}/tasks/${padded}-${slug}.md`, id: String(id) };
    }
    case 'reference': {
      if (!title) throw new Error('Reference requires a title field');
      const slug = validateTitleSlug(title, 'Reference title');
      return { path: `reference/ref-${slug}.md`, id: slug };
    }
    case 'record': {
      if (!title) throw new Error('Record requires a title field');
      const slug = validateTitleSlug(title, 'Record title');
      return { path: `records/${slug}.md`, id: slug };
    }
    default:
      throw new Error(`Unknown record type: ${String(input.type)}`);
  }
}

/**
 * Create a new mdbase record in the `.coda/` directory.
 *
 * Routes by record type to generate the correct file path,
 * creates directory structure as needed, and persists the
 * record via the core data layer.
 *
 * @param input - Record type, fields, and optional body
 * @param codaRoot - Root path of the `.coda/` directory
 * @returns CreateResult with the path and optional id
 */
export function codaCreate(input: CreateInput, codaRoot: string): CreateResult {
  try {
    const { path, id } = generatePath(input);
    const fullPath = join(codaRoot, path);

    writeRecord(fullPath, input.fields, input.body ?? '');

    return { success: true, path, id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, path: '', error: message };
  }
}
