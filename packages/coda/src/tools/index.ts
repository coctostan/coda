/**
 * @module tools
 * L4 Tool Layer — CODA's sanctioned write path into `.coda/` data.
 *
 * The LLM never writes directly to `.coda/` — these tools validate
 * and write on its behalf.
 *
 * CRUD tools: codaCreate, codaRead, codaUpdate, codaEditBody
 * Lifecycle tools: codaAdvance, codaStatus, codaRunTests
 * Interceptor: checkWriteGate, isTestFile
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
  AdvanceInput,
  AdvanceResult,
  StatusResult,
  RunTestsInput,
  RunTestsResult,
  WriteGateCheck,
  WriteGateResult,
} from './types';

// CRUD tools
export { codaCreate, toSlug } from './coda-create';
export { codaRead } from './coda-read';
export { codaUpdate } from './coda-update';
export { codaEditBody } from './coda-edit-body';

// Lifecycle tools
export { codaAdvance } from './coda-advance';
export { codaStatus } from './coda-status';
export { codaRunTests } from './coda-run-tests';

// Write-gate interceptor
export { checkWriteGate, isTestFile } from './write-gate';
