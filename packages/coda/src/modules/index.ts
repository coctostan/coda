/**
 * Module Layer — CODA Module System Re-exports
 *
 * v0.1 module loaders (todd.ts, walt.ts, getModulePrompts) removed in v0.3.
 * Module system now lives in:
 *   - @coda/core: types, registry, dispatcher, finding schema
 *   - workflow/module-integration.ts: dispatcher factory + workflow wiring
 *
 * This barrel re-exports the workflow integration helpers for backward compatibility.
 */

export {
  createModuleSystem,
  buildHookContext,
  getModulePromptForHook,
} from '../workflow/module-integration';
