/**
 * @module tools/types
 * Input/output type definitions for CODA tools.
 *
 * Each tool has a strongly-typed input and result type.
 * All results extend ToolResult with success/error base fields.
 */

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
