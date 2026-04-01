/**
 * @coda/core — Shared infrastructure for the CODA ecosystem
 *
 * Layers:
 *   L1: Data     — mdbase wrapper, type schemas, section reader (IMPLEMENTED)
 *   L2: State    — state machine, atomic JSON persist, gates, transitions (IMPLEMENTED)
 *   L3: Modules  — registry, dispatcher, finding schema, eval engine (IMPLEMENTED — types + validation)
 *
 * Dependency rule: imports flow downward only. L3 → L2 → L1.
 */
// L1: Data Layer
export * from './data';
// L2: State Engine
export * from './state';

// L3: Module System
export * from './modules';