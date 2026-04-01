/**
 * @module modules/dispatcher
 * Assembles module prompts for phase-session injection and parses
 * structured findings from agent responses.
 *
 * Two-method API (Decision D2):
 *   assemblePrompts()        → combined prompt string for injection
 *   parseAndCheckFindings()  → HookResult with findings + block status
 *
 * The dispatcher NEVER touches agent sessions. The workflow layer
 * handles session creation, prompt injection, and response capture.
 */

import { readFileSync } from 'node:fs';
import type { FindingSeverity, HookPoint, HookResult } from './types';
import { SEVERITY_ORDER } from './types';
import { validateFindings } from './finding-schema';
import type { ModuleRegistry } from './registry';

/**
 * Contextual data provided to the dispatcher for prompt assembly.
 * Uses string types for phase/submode to avoid coupling to L2 state types.
 */
export interface HookContext {
  /** The active issue slug. */
  issueSlug: string;
  /** Current lifecycle phase (e.g., 'build', 'verify'). */
  phase: string;
  /** Active submode within review/verify, or null. */
  submode: string | null;
  /** Files modified during BUILD (for post-build hooks). */
  changedFiles?: string[];
  /** Current task number (for post-task hooks). */
  taskId?: number;
  /** Plan record path (for post-plan hooks). */
  planPath?: string;
}

/**
 * The public dispatcher API. Assembles prompts and parses findings,
 * but never drives agent sessions.
 */
export interface ModuleDispatcher {
  /**
   * Assemble all module prompts for a hook point into a single string
   * ready for injection into the phase session via before_agent_start.
   *
   * @returns Combined prompt string, or '' if no modules at this hook point.
   */
  assemblePrompts(hookPoint: HookPoint, context: HookContext): string;

  /**
   * Parse the agent's response for structured findings, validate them,
   * and check against module block thresholds.
   *
   * @returns HookResult with findings, block status, and block reasons.
   */
  parseAndCheckFindings(
    agentResponse: string,
    hookPoint: HookPoint
  ): HookResult;
}

/**
 * The JSON output requirement template appended to every assembled prompt.
 * Instructs the agent to produce findings as a JSON array.
 */
export const FINDINGS_OUTPUT_TEMPLATE = `## Required Output

Produce your findings as a JSON array. Each finding must have these fields:

\`\`\`json
[
  {
    "module": "module name",
    "check": "what you checked",
    "severity": "critical|high|medium|low|info",
    "finding": "what you found",
    "assumption": "what must be true for this to matter",
    "file": "affected file (optional)",
    "recommendation": "suggested fix (optional)",
    "evidence": "supporting evidence (optional)"
  }
]
\`\`\`

If no issues found, produce a single info finding confirming the check was performed:
\`\`\`json
[{ "module": "module name", "check": "review name", "severity": "info", "finding": "No issues found." }]
\`\`\``;

/**
 * Check whether a finding severity meets or exceeds a block threshold.
 *
 * @param severity - The finding's severity level
 * @param threshold - The module's block threshold, or 'none' for advisory-only
 * @returns true if the finding should block advancement
 */
export function exceedsThreshold(
  severity: FindingSeverity,
  threshold: FindingSeverity | 'none'
): boolean {
  if (threshold === 'none') return false;
  return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[threshold];
}

/**
 * Create a module dispatcher from a registry.
 *
 * The registry already resolves prompt file paths — the dispatcher
 * reads them directly via registry.resolvePromptPath.
 *
 * @param registry - The module registry for looking up active modules
 * @returns A ModuleDispatcher for prompt assembly and finding parsing
 */
export function createDispatcher(
  registry: ModuleRegistry
): ModuleDispatcher {
  return {
    assemblePrompts(hookPoint: HookPoint, context: HookContext): string {
      const modules = registry.getModulesForHook(hookPoint);
      if (modules.length === 0) return '';

      const parts: string[] = [];

      // Header with context
      parts.push(`## Module Analysis: ${hookPoint}`);
      parts.push(`Issue: ${context.issueSlug} | Phase: ${context.phase}`);
      if (context.changedFiles && context.changedFiles.length > 0) {
        parts.push(`Changed files: ${context.changedFiles.join(', ')}`);
      }
      if (context.taskId !== undefined) {
        parts.push(`Task: ${String(context.taskId)}`);
      }
      parts.push('');

      // Each module's prompt in priority order
      for (const mod of modules) {
        const promptPath = registry.resolvePromptPath(mod, hookPoint);
        if (promptPath) {
          try {
            const prompt = readFileSync(promptPath, 'utf-8');
            parts.push(prompt);
            parts.push('');
          } catch {
            parts.push(
              `<!-- WARNING: Could not load prompt for ${mod.name} at ${promptPath} -->`
            );
            parts.push('');
          }
        }
      }

      // JSON output requirement
      parts.push(FINDINGS_OUTPUT_TEMPLATE);

      return parts.join('\n');
    },

    parseAndCheckFindings(
      agentResponse: string,
      hookPoint: HookPoint
    ): HookResult {
      const rawJson = extractJsonFromResponse(agentResponse);

      // Decision #8: No-JSON fallback = zero findings
      if (rawJson === null) {
        return {
          hookPoint,
          findings: [],
          blocked: false,
          blockReasons: [],
          timestamp: new Date().toISOString(),
        };
      }

      // Validate findings via schema
      const findings = validateFindings(rawJson);

      // Check each finding against its module's block threshold
      const blockReasons: string[] = [];
      for (const finding of findings) {
        const mod = registry.getModule(finding.module);
        if (mod && exceedsThreshold(finding.severity, mod.blockThreshold)) {
          const reason =
            `${mod.name.toUpperCase()} BLOCK: ${finding.finding}` +
            (finding.assumption
              ? ` (assumes: ${finding.assumption})`
              : '');
          blockReasons.push(reason);
        }
      }

      return {
        hookPoint,
        findings,
        blocked: blockReasons.length > 0,
        blockReasons,
        timestamp: new Date().toISOString(),
      };
    },
  };
}

/**
 * Extract a JSON value from an agent response string.
 * Looks for ```json fenced blocks first, then raw JSON arrays.
 *
 * @param response - The full agent response text
 * @returns Parsed JSON value, or null if no valid JSON found
 */
function extractJsonFromResponse(response: string): unknown | null {
  // Try fenced ```json blocks
  const fencedMatch = response.match(/```json\s*\n([\s\S]*?)```/);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1]);
    } catch {
      // Malformed JSON in fenced block — fall through
    }
  }

  // Try raw JSON array (starts with '[')
  const arrayStart = response.indexOf('[');
  if (arrayStart !== -1) {
    // Find the matching closing bracket
    const candidate = response.slice(arrayStart);
    try {
      return JSON.parse(candidate);
    } catch {
      // Try to find just the array portion by matching brackets
      let depth = 0;
      for (let i = 0; i < candidate.length; i++) {
        if (candidate[i] === '[') depth++;
        if (candidate[i] === ']') depth--;
        if (depth === 0) {
          try {
            return JSON.parse(candidate.slice(0, i + 1));
          } catch {
            break;
          }
        }
      }
    }
  }

  return null;
}
