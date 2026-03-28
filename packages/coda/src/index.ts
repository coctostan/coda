/**
 * @coda/coda — CODA Pi Extension
 *
 * Compounding Orchestrated Development Architecture
 *
 * Layers (on top of @coda/core L1-L3):
 *   L4: Tools      — coda_* tools + write-gate (IMPLEMENTED)
 *   L5: FORGE      — greenfield, brownfield, additive, transformative design flows
 *   L6: Workflow   — phase runner, build loop, context builder
 *   L7: Pi         — extension entry, commands, hooks, UI
 *
 * Dependency rule: imports flow downward only. L7 → L6 → L5 → L4.
 */

// L4: Tool Layer
export * from './tools';

// L4.5: Module Prompts
export * from './modules';

// L5: FORGE Design Layer
export * from './forge';

// L6: Workflow Engine
export * from './workflow';

// L7: Pi Integration
// export default function(pi: PiAPI) { ... }
