/**
 * @module modules/finding-schema
 * Validates LLM-produced findings against the Finding schema.
 *
 * This is SHAPE validation — required fields present, severity is a valid
 * enum value. NOT content validation — the LLM's judgment stands.
 *
 * Lenient parsing: extra fields are ignored, missing optional fields are fine,
 * missing `module` field is tolerated (caller can inject from context).
 */

import type { Finding, FindingSeverity, HookPoint } from './types';
import { SEVERITY_VALUES, HOOK_POINTS } from './types';

/**
 * Validate a single raw finding object against the Finding schema.
 *
 * Returns the typed Finding if valid, or null if required fields are
 * missing or severity is invalid. Extra fields are silently ignored.
 *
 * @param raw - Unknown input (typically parsed from LLM JSON output)
 * @returns A valid Finding, or null if the input is malformed
 */
export function validateFinding(raw: unknown): Finding | null {
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    return null;
  }

  const obj = raw as Record<string, unknown>;

  // Required fields: check, severity, finding
  // module is required by the interface but lenient parsing allows the caller
  // to inject it — so we accept empty string as a fallback
  const check = typeof obj['check'] === 'string' ? obj['check'] : null;
  const severity = typeof obj['severity'] === 'string' ? obj['severity'] : null;
  const finding = typeof obj['finding'] === 'string' ? obj['finding'] : null;

  if (check === null || severity === null || finding === null) {
    return null;
  }

  // Validate severity is a known enum value
  if (!SEVERITY_VALUES.includes(severity as FindingSeverity)) {
    return null;
  }

  // Build the validated Finding — required fields
  const validated: Finding = {
    module: typeof obj['module'] === 'string' ? obj['module'] : '',
    check,
    severity: severity as FindingSeverity,
    finding,
  };

  // Optional fields — include only if present and valid type
  if (typeof obj['hookPoint'] === 'string' && HOOK_POINTS.includes(obj['hookPoint'] as HookPoint)) {
    validated.hookPoint = obj['hookPoint'] as HookPoint;
  }
  if (typeof obj['file'] === 'string') {
    validated.file = obj['file'];
  }
  if (typeof obj['assumption'] === 'string') {
    validated.assumption = obj['assumption'];
  }
  if (typeof obj['recommendation'] === 'string') {
    validated.recommendation = obj['recommendation'];
  }
  if (typeof obj['evidence'] === 'string') {
    validated.evidence = obj['evidence'];
  }

  return validated;
}

/**
 * Validate an array of raw findings, returning only the valid ones.
 *
 * Partial results are preserved — if 2 of 3 findings are valid, the 2
 * valid ones are returned. Invalid findings are silently dropped.
 *
 * @param raw - Unknown input (typically a JSON-parsed array from LLM output)
 * @returns Array of valid Finding objects (may be empty)
 */
export function validateFindings(raw: unknown): Finding[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const results: Finding[] = [];
  for (const item of raw) {
    const validated = validateFinding(item);
    if (validated !== null) {
      results.push(validated);
    }
  }

  return results;
}
