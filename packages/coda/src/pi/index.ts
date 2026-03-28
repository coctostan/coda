/**
 * @module pi
 * L7 Pi Integration — CODA extension entry point.
 *
 * Wires CODA into Pi by registering commands, tools, and hooks.
 * All logic delegates to lower layers (M1-M6).
 */

import type { PiAPI, StateProvider } from './types';
import { registerCommands } from './commands';
import { registerTools } from './tools';
import { registerHooks } from './hooks';
import { loadState } from '@coda/core';

// Types
export type {
  PiAPI,
  CommandConfig,
  CommandHandler,
  ToolSchema,
  ToolHandler,
  HookContext,
  HookResult,
  HookHandler,
  StateProvider,
} from './types';

// Registrations
export { registerCommands } from './commands';
export { registerTools } from './tools';
export { registerHooks } from './hooks';

/**
 * Initialize CODA as a Pi extension.
 *
 * Registers all commands, tools, and hooks with the Pi API.
 * This is the extension entry point.
 *
 * @param pi - The Pi extension API
 * @param codaRoot - Path to the `.coda/` directory
 */
export function initializeCoda(pi: PiAPI, codaRoot: string): void {
  // Create state provider backed by file I/O
  const stateProvider: StateProvider = {
    getState: () => loadState(codaRoot),
  };

  registerCommands(pi, codaRoot);
  registerTools(pi, codaRoot);
  registerHooks(pi, codaRoot, stateProvider);
}

export default initializeCoda;
