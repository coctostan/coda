/**
 * @module pi/commands
 * Command registration for the CODA Pi extension.
 *
 * Registers 5 v0.1 slash commands that delegate to lower layers.
 */

import type { PiAPI } from './types';
import { codaStatus, codaCreate, codaAdvance } from '../tools';
import { forgeGreenfield } from '../forge';
import { getBuildSequence } from '../workflow';

/**
 * Register all v0.1 CODA commands with the Pi API.
 *
 * Commands:
 * - `/coda` — Show current status
 * - `/coda forge` — Initialize a new project
 * - `/coda new` — Create an issue
 * - `/coda advance` — Move to next phase
 * - `/coda build` — Start BUILD loop
 *
 * @param pi - The Pi extension API
 * @param codaRoot - Path to the `.coda/` directory
 */
export function registerCommands(pi: PiAPI, codaRoot: string): void {
  pi.registerCommand('/coda', {
    description: 'Show current CODA status (phase, task, next action)',
    handler: () => {
      const result = codaStatus(codaRoot);
      const phase = result.phase ?? 'none';
      const task = result.current_task !== null && result.current_task !== undefined
        ? String(result.current_task) : 'none';
      const next = result.next_action ?? 'No suggestion';
      return void console.log(`Phase: ${phase} | Task: ${task} | Next: ${next}`);
    },
  });

  pi.registerCommand('/coda forge', {
    description: 'Initialize a new CODA project (greenfield)',
    handler: async (args: string[]) => {
      // In a real integration, this would run the conversational interview.
      // For v0.1, the forge flow takes pre-collected answers via ForgeContext.
      // The command handler is a placeholder that signals forge readiness.
      const projectRoot = codaRoot.replace(/\/.coda$/, '');
      void args; // args unused in v0.1 — interview is interactive
      void projectRoot;
      void forgeGreenfield; // reference to validate import
    },
  });

  pi.registerCommand('/coda new', {
    description: 'Create a new issue (feature, bugfix, refactor, chore, docs)',
    handler: (args: string[]) => {
      const issueType = args[0] ?? 'feature';
      const title = args.slice(1).join(' ') || 'Untitled Issue';
      codaCreate({
        type: 'issue',
        fields: {
          title,
          issue_type: issueType,
          status: 'proposed',
          phase: 'specify',
          priority: 3,
          topics: [],
          acceptance_criteria: [],
          open_questions: [],
          deferred_items: [],
          human_review: true,
        },
        body: '',
      }, codaRoot);
    },
  });

  pi.registerCommand('/coda advance', {
    description: 'Advance the focused issue to the next lifecycle phase',
    handler: () => {
      const status = codaStatus(codaRoot);
      if (!status.focus_issue || !status.phase) {
        console.log('No focused issue or phase to advance from.');
        return;
      }
      const statePath = codaRoot + '/state.json';
      codaAdvance({
        target_phase: getNextPhase(status.phase),
      }, codaRoot, statePath);
    },
  });

  pi.registerCommand('/coda build', {
    description: 'Start the autonomous BUILD loop for the focused issue',
    handler: () => {
      const status = codaStatus(codaRoot);
      if (!status.focus_issue) {
        console.log('No focused issue. Use /coda new first.');
        return;
      }
      const sequence = getBuildSequence(codaRoot, status.focus_issue);
      if (sequence.length === 0) {
        console.log('No pending tasks. All tasks complete or no tasks found.');
        return;
      }
      console.log(`BUILD loop ready: ${String(sequence.length)} tasks to execute.`);
      // Full build loop integration requires Pi runtime (newSession, sendUserMessage)
      // which is handled by the hooks + Pi runtime in production.
    },
  });
}

/** Get the next phase in the linear sequence. */
function getNextPhase(current: string): string {
  const order = ['specify', 'plan', 'review', 'build', 'verify', 'unify', 'done'];
  const idx = order.indexOf(current);
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1]! : 'done';
}
