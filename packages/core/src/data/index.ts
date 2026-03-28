/**
 * @module data
 * L1 Data Layer — CODA's persistence foundation.
 *
 * Provides typed read/write operations for mdbase-style markdown records
 * with YAML frontmatter, section parsing/mutation, and directory listing.
 *
 * @example
 * ```typescript
 * import { readRecord, writeRecord, getSection, listRecords } from '@coda/core';
 * import type { IssueRecord } from '@coda/core';
 *
 * const { frontmatter, body } = readRecord<IssueRecord>('.coda/issues/my-issue.md');
 * const description = getSection(body, 'Description');
 * ```
 */

// Type schemas
export type {
  AcceptanceCriterion,
  SpecDelta,
  IssueRecord,
  PlanRecord,
  TaskRecord,
  CompletionRecord,
  ReferenceDoc,
} from './types';

// Core record operations
export { readRecord, writeRecord, updateFrontmatter } from './records';

// Section operations
export { getSection, appendSection, replaceSection } from './sections';

// Directory operations
export { listRecords } from './directory';
