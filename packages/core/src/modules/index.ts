/**
 * @module modules
 * L3: Module System — registry, dispatcher, finding schema.
 *
 * Provides the infrastructure for domain-expert modules that inject
 * context at phase boundaries and produce structured findings.
 *
 * Dependency rule: L3 modules do not import from L1 (data) or L2 (state).
 */

// Types
export type {
  HookPoint,
  FindingSeverity,
  ModuleHook,
  ModuleDefinition,
  Finding,
  HookResult,
  ModuleConfig,
} from './types';

// Constants
export { HOOK_POINTS, SEVERITY_ORDER, SEVERITY_VALUES } from './types';

// Validation
export { validateFinding, validateFindings } from './finding-schema';

// Registry
export type { ModuleRegistry, RegistryConfig } from './registry';
export { createRegistry, MODULE_DEFINITIONS, DEFAULT_THRESHOLDS } from './registry';

// Dispatcher
export type { ModuleDispatcher, HookContext } from './dispatcher';
export { createDispatcher, exceedsThreshold, FINDINGS_OUTPUT_TEMPLATE } from './dispatcher';

// Overlay
export type {
  OverlaySection,
  OverlayFrontmatter,
  OverlayData,
} from './overlay';
export {
  readOverlay,
  writeOverlay,
  appendToOverlay,
  loadMergedPrompt,
  formatOverlayBody,
} from './overlay';