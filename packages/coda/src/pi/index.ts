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
 * Register CODA with Pi using the project root's `.coda/` folder.
 *
 * @param pi - The Pi extension API
 */
export function codaExtension(pi: ExtensionAPI): void {
  // ExtensionAPI does not expose a cwd accessor at initialization time in Pi v0.4,
  // so derive the project root explicitly once from process.cwd().
  const projectRoot = process.cwd();
  const codaRoot = join(projectRoot, '.coda');

  registerCommands(pi, codaRoot, projectRoot);
  registerTools(pi, codaRoot, projectRoot);
  registerHooks(pi, codaRoot);
}

export default codaExtension;
