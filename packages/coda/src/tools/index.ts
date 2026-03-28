/**
 * @module tools
 * L4 Tool Layer — CODA's sanctioned write path into `.coda/` data.
 *
 * The LLM never writes directly to `.coda/` — these tools validate
 * and write on its behalf.
 *
 * Plan 01 exports (CRUD tools):
 * - codaCreate — create new mdbase records
 * - codaRead — read records with optional section filtering
 * - codaUpdate — update frontmatter fields
 * - codaEditBody — section-aware body editing
 *
 * Plan 02 will add: codaAdvance, codaStatus, codaRunTests, writeGate
 */

// Type definitions
export type {
  ToolResult,
  CreateInput,
  CreateResult,
  ReadInput,
  ReadResult,
  UpdateInput,
  UpdateResult,
  EditBodyInput,
  EditBodyResult,
} from './types';

// CRUD tools
export { codaCreate, toSlug } from './coda-create';
export { codaRead } from './coda-read';
export { codaUpdate } from './coda-update';
export { codaEditBody } from './coda-edit-body';
