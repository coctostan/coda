/**
 * Module Layer — CODA Module Prompt Loaders
 *
 * Exports loaded prompt content and hook-point routing for the
 * Todd (TDD enforcement) and Walt (quality check) modules.
 *
 * In v0.1 these are simple prompt injections — no registry,
 * dispatcher, or eval engine.
 */

export { TODD_PROMPT, TODD_HOOK_POINTS } from './todd';
export { WALT_PROMPT, WALT_HOOK_POINTS } from './walt';

import { TODD_PROMPT, TODD_HOOK_POINTS } from './todd';
import { WALT_PROMPT, WALT_HOOK_POINTS } from './walt';

/**
 * Returns an array of module prompts that should be injected at the given hook point.
 *
 * @param hookPoint - The lifecycle hook point (e.g., "pre-build", "post-task", "post-build")
 * @returns An array of prompt strings for modules registered at that hook point.
 *          Returns an empty array if no modules match.
 */
export function getModulePrompts(hookPoint: string): string[] {
  const prompts: string[] = [];

  if ((TODD_HOOK_POINTS as readonly string[]).includes(hookPoint)) {
    prompts.push(TODD_PROMPT);
  }

  if ((WALT_HOOK_POINTS as readonly string[]).includes(hookPoint)) {
    prompts.push(WALT_PROMPT);
  }

  return prompts;
}
