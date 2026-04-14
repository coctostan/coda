/**
 * @module pi/commands
 * Command registration for the CODA Pi extension.
 *
 * Registers the `/coda` slash command and dispatches supported subcommands.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { ExtensionAPI, ExtensionCommandContext } from '@mariozechner/pi-coding-agent';
import { createDefaultState, loadState, persistState } from '@coda/core';
import type { Phase } from '@coda/core';
import type { CodaConfig } from '../forge/types';
import { assembleScanContext, detectBackdrop, getDefaultConfig, scaffoldCoda } from '../forge';
import { codaAdvance, codaBack, codaCreate, codaKill, codaRead, codaStatus } from '../tools';
import type { AdvanceInput, StatusResult } from '../tools';
import { createBranch, getBuildSequence } from '../workflow';
import { resolveGateMode } from '../workflow/gate-automation';
import { handleAutonomousAdvanceTrigger } from './hooks';

/** Supported issue types for `/coda new`. */
type IssueType = 'feature' | 'bugfix' | 'refactor' | 'chore' | 'docs';

/**
 * Register all CODA Pi commands.
 *
 * @param pi - The Pi extension API
 * @param codaRoot - Path to the `.coda/` directory
 * @param projectRoot - Absolute path to the project root
 */
export function registerCommands(
  pi: ExtensionAPI,
  codaRoot: string,
  projectRoot: string = dirname(codaRoot)
): void {
  const statePath = join(codaRoot, 'state.json');

  pi.registerCommand('coda', {
    description: 'Manage CODA lifecycle actions (status, forge, new, activate, advance, back, kill, build)',
    handler: async (args, ctx) => {
      try {
        await handleCodaCommand(args, ctx, pi, codaRoot, statePath, projectRoot);
      } catch (err) {
        ctx.ui.notify(formatCodaError(err), 'error');
      }
    },
  });
}

/** Dispatch a `/coda` command invocation to the correct subcommand. */
async function handleCodaCommand(
  args: string,
  ctx: ExtensionCommandContext,
  pi: ExtensionAPI,
  codaRoot: string,
  statePath: string,
  projectRoot: string
): Promise<void> {
  const parsed = parseCommandArgs(args);

  switch (parsed.subcommand) {
    case 'status': {
      const result = codaStatus(statePath, codaRoot);
      const phase = result.phase ?? 'none';
      const submode = result.submode ? ` (${result.submode}${typeof result.loop_iteration === 'number' ? ` loop ${String(result.loop_iteration)}` : ''})` : '';
      const task = result.current_task === null ? 'none' : String(result.current_task);
      ctx.ui.notify(`Phase: ${phase}${submode} | Task: ${task} | Next: ${result.next_action}`);
      return;
    }

    case 'forge': {
      const backdrop = detectBackdrop(projectRoot);

      if (backdrop.type === 'existing') {
        ctx.ui.notify('CODA is already initialized in this project. Use `/coda status` to see current state.');
        return;
      }

      // Scaffold .coda/ for both greenfield and brownfield
      scaffoldCoda(projectRoot);
      if (backdrop.type === 'brownfield') {
        const promptsDir = resolve(__dirname, '..', '..', '..', '..', 'modules', 'prompts');
        const scanCtx = assembleScanContext(projectRoot, promptsDir);
        const targetList = scanCtx.universalTargets.length > 0
          ? scanCtx.universalTargets.join(', ')
          : 'none detected';
        ctx.ui.notify(
          `✓ Brownfield project detected. \`.coda/\` directory created.\n\n` +
          `**Detected:** ${targetList}` +
          (scanCtx.sourceDir ? ` | Source: ${scanCtx.sourceDir}/` : '') +
          `\n\n**Next: Brownfield SCAN**\n` +
          `Read the detected files and run scan commands to gather evidence.\n` +
          `Use \`coda_create\` to write evidence files to \`.coda/forge/initial/onboarding/\`.`
        );
        return;
      }

      // Greenfield (unchanged)
      ctx.ui.notify(
        '✓ Project scaffolded. `.coda/` directory created with default configuration.\n\nNext: Create an issue to describe what you want to build:\n  Use the `coda_create` tool to create an issue in `.coda/issues/`'
      );
      return;
    }

    case 'activate': {
      const slug = parsed.remainder.trim();
      if (slug.length === 0) {
        ctx.ui.notify('Usage: /coda activate <issue-slug>', 'warning');
        return;
      }

      const issuePath = join(codaRoot, 'issues', slug + '.md');
      if (!existsSync(issuePath)) {
        ctx.ui.notify(`Issue "${slug}" not found.`, 'error');
        return;
      }

      const currentState = loadState(statePath);
      if (currentState?.focus_issue === slug) {
        ctx.ui.notify(`Issue "${slug}" is already focused.`, 'warning');
        return;
      }

      const issueRecord = codaRead({ record: `issues/${slug}` }, codaRoot);
      const issueType = typeof issueRecord.frontmatter.issue_type === 'string'
        ? issueRecord.frontmatter.issue_type
        : 'feature';
      const issuePhase = typeof issueRecord.frontmatter.phase === 'string'
        ? (issueRecord.frontmatter.phase as Phase)
        : 'specify';

      const state = currentState ?? createDefaultState();
      state.focus_issue = slug;
      state.phase = issuePhase;
      state.current_task = null;
      state.completed_tasks = [];
      persistState(state, statePath);

      let branchMsg = '';
      try {
        const branchResult = createBranch(projectRoot, slug, issueType);
        branchMsg = branchResult.created
          ? ` Branch ${branchResult.branch} created.`
          : ` On branch ${branchResult.branch}.`;
      } catch {
        branchMsg = ' (VCS branch creation skipped — git error)';
      }

      ctx.ui.notify(`Activated issue "${slug}" at phase ${issuePhase}.${branchMsg}`);
      return;
    }
    case 'new': {
      const { issueType, title } = parseNewIssueArgs(parsed.remainder);
      const gateMode = resolveGateMode('plan_review', issueType, loadCodaConfig(codaRoot) ?? getDefaultConfig());
      const result = codaCreate({
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
          human_review: gateMode !== 'auto',
        },
        body: '',
      }, codaRoot);

      if (!result.success) {
        ctx.ui.notify(result.error ?? 'Failed to create issue.', 'error');
        return;
      }

      ctx.ui.notify(`Created ${issueType} issue ${result.id ?? title} at ${result.path}.`);
      return;
    }

    case 'advance': {
      const status = codaStatus(statePath, codaRoot);
      if (!status.focus_issue || !status.phase) {
        ctx.ui.notify('No focused issue or phase to advance from.', 'warning');
        return;
      }

      const advanceInput = buildAdvanceInput(status, parsed.remainder);
      if ('error' in advanceInput) {
        ctx.ui.notify(advanceInput.error, 'warning');
        return;
      }

      const result = codaAdvance(advanceInput, codaRoot, statePath);

      if (!result.success) {
        ctx.ui.notify(result.reason ?? result.error ?? 'Advance failed.', 'error');
        return;
      }

      const trigger = handleAutonomousAdvanceTrigger(pi, ctx, codaRoot, statePath, advanceInput, result);

      if (advanceInput.human_review_decision === 'changes-requested') {
        const baseMessage = `Recorded human review changes for ${status.focus_issue} and returned the workflow to revise.`;
        ctx.ui.notify(trigger.summary ? `${baseMessage} ${trigger.summary}` : baseMessage);
        return;
      }

      const baseMessage = `Advanced ${status.focus_issue} from ${result.previous_phase ?? status.phase} to ${result.new_phase ?? 'done'}.`;
      ctx.ui.notify(trigger.summary ? `${baseMessage} ${trigger.summary}` : baseMessage);
      return;
    }

    case 'back': {
      const status = codaStatus(statePath, codaRoot);
      if (!status.focus_issue || !status.phase) {
        ctx.ui.notify('No focused issue or phase to rewind from.', 'warning');
        return;
      }

      const targetPhase = parsed.remainder.trim();
      if (targetPhase.length === 0) {
        ctx.ui.notify('Usage: /coda back <phase>', 'warning');
        return;
      }

      const result = codaBack({ target_phase: targetPhase }, codaRoot, statePath);
      if (!result.success) {
        ctx.ui.notify(result.reason ?? result.error ?? 'Back failed.', 'error');
        return;
      }

      ctx.ui.notify(`Rewound ${status.focus_issue} from ${result.previous_phase ?? status.phase} to ${result.new_phase ?? targetPhase}.`);
      return;
    }

    case 'kill': {
      const status = codaStatus(statePath, codaRoot);
      if (!status.focus_issue) {
        ctx.ui.notify('No focused issue to terminate.', 'warning');
        return;
      }

      const result = codaKill(codaRoot, statePath);
      if (!result.success) {
        ctx.ui.notify(result.reason ?? result.error ?? 'Kill failed.', 'error');
        return;
      }

      ctx.ui.notify(`Terminated ${status.focus_issue} and marked it wont-fix.`);
      return;
    }

    case 'build': {
      const status = codaStatus(statePath, codaRoot);
      if (!status.focus_issue) {
        ctx.ui.notify('No focused issue. Use /coda new first.', 'warning');
        return;
      }
      const sequence = getBuildSequence(codaRoot, status.focus_issue);
      if (sequence.length === 0) {
        ctx.ui.notify('No pending tasks. All tasks complete or no tasks found.');
        return;
      }

      if (status.submode === 'correct') {
        const taskLabel = status.current_task === null ? 'none' : String(status.current_task);
        const taskTitle = status.task_title ? ` (${status.task_title})` : '';
        ctx.ui.notify(`CORRECT loop ready for ${status.focus_issue}: task ${taskLabel}${taskTitle} pending. ${status.next_action}`);
        return;
      }
      ctx.ui.notify(`BUILD loop ready for ${status.focus_issue}: ${String(sequence.length)} task(s) pending.`);
      return;
    }

    default: {
      ctx.ui.notify(
        'Usage: /coda [status|forge|new <type> <title>|activate <slug>|advance [approve|changes <feedback>]|back <phase>|kill|build]',
        'warning'
      );
    }
  }
}

function formatCodaError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return `CODA error: ${message}`;
}

/** Parse the raw `/coda` argument string into a subcommand and remainder. */
function parseCommandArgs(args: string): { subcommand: string; remainder: string } {
  const trimmed = args.trim();
  if (trimmed.length === 0) {
    return { subcommand: 'status', remainder: '' };
  }

  const [subcommand = 'status', ...remainderParts] = trimmed.split(/\s+/);
  return {
    subcommand: subcommand.toLowerCase(),
    remainder: remainderParts.join(' '),
  };
}

function loadCodaConfig(codaRoot: string): CodaConfig | null {
  const configPath = join(codaRoot, 'coda.json');
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(configPath, 'utf-8')) as CodaConfig;
  } catch {
    return null;
  }
}

/** Parse `/coda new` arguments into an issue type and title. */
function parseNewIssueArgs(args: string): { issueType: IssueType; title: string } {
  const trimmed = args.trim();
  if (trimmed.length === 0) {
    return { issueType: 'feature', title: 'Untitled Issue' };
  }

  const [firstToken = '', ...rest] = trimmed.split(/\s+/);
  if (isIssueType(firstToken)) {
    return {
      issueType: firstToken,
      title: rest.join(' ') || 'Untitled Issue',
    };
  }

  return {
    issueType: 'feature',
    title: trimmed,
  };
}

/** Return whether a token is a supported issue type. */
function isIssueType(value: string): value is IssueType {
  return value === 'feature'
    || value === 'bugfix'
    || value === 'refactor'
    || value === 'chore'
    || value === 'docs';
}

/** Get the next phase in the linear lifecycle sequence. */
function getNextPhase(current: string): string {
  const order = ['specify', 'plan', 'review', 'build', 'verify', 'unify', 'done'];
  const index = order.indexOf(current);
  return index >= 0 && index < order.length - 1 ? order[index + 1]! : 'done';
}

function buildAdvanceInput(
  status: StatusResult,
  remainder: string
): AdvanceInput | { error: string } {
  const trimmed = remainder.trim();

  if (status.phase === 'review' && status.human_review_status === 'pending') {
    if (trimmed.length === 0 || trimmed === 'approve' || trimmed === 'approved') {
      return {
        target_phase: 'build',
        human_review_decision: 'approved',
      };
    }

    if (trimmed === 'changes' || trimmed === 'request-changes') {
      return { error: 'Usage: /coda advance changes <feedback>' };
    }

    const changeMatch = trimmed.match(/^(changes|request-changes)\s+([\s\S]+)$/);
    if (changeMatch) {
      return {
        target_phase: 'build',
        human_review_decision: 'changes-requested',
        review_feedback: changeMatch[2]!.trim(),
      };
    }

    return {
      error: 'Human review is pending. Use /coda advance to approve or /coda advance changes <feedback> to request changes.',
    };
  }

  // Handle UNIFY review pending — same UX pattern as human review
  if (status.phase === 'unify' && status.unify_review_status === 'pending') {
    if (trimmed.length === 0 || trimmed === 'approve' || trimmed === 'approved') {
      return {
        target_phase: 'done',
        unify_review_decision: 'approved',
      };
    }

    if (trimmed === 'changes' || trimmed === 'request-changes') {
      return { error: 'Usage: /coda advance changes <feedback>' };
    }

    const changeMatch = trimmed.match(/^(changes|request-changes)\s+([\s\S]+)$/);
    if (changeMatch) {
      return {
        target_phase: 'done',
        unify_review_decision: 'changes-requested',
        unify_review_feedback: changeMatch[2]!.trim(),
      };
    }

    return {
      error: 'UNIFY review is pending. Use /coda advance to approve or /coda advance changes <feedback> to request changes.',
    };
  }

  return {
    target_phase: getNextPhase(status.phase ?? 'done'),
  };
}
