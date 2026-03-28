/**
 * @module pi
 * L7 Pi Integration — CODA extension entry point.
 *
 * Wires CODA into Pi by registering commands, tools, and hooks.
 */

import { join } from 'node:path';
import type { ExtensionAPI } from '@mariozechner/pi-coding-agent';
import { registerCommands } from './commands';
import { registerHooks } from './hooks';
import { registerTools } from './tools';

// Types
export type { CodaExtensionState, StateProvider } from './types';

// Registrations
export { registerCommands } from './commands';
export { registerTools } from './tools';
export { registerHooks } from './hooks';

/**
 * Register CODA with Pi using the current working directory's `.coda/` folder.
 *
 * @param pi - The Pi extension API
 */
export function codaExtension(pi: ExtensionAPI): void {
  const codaRoot = join(process.cwd(), '.coda');
  registerCommands(pi, codaRoot);
  registerTools(pi, codaRoot);
  registerHooks(pi, codaRoot);
}

export default codaExtension;
