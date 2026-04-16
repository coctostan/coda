/**
 * @module workflow/unify-runner
 * UNIFY phase context assembly — structured instructions for the 5 mandatory actions.
 *
 * Assembles rich context from the issue, plan, task summaries, reference docs,
 * and module findings, then returns a PhaseContext with instructions for all
 * 5 UNIFY actions as specified in coda-spec-v7.
 */
import type { CodaState, CompletionRecord } from '@coda/core';
import { readRecord, getSectionsByTopics } from '@coda/core';
import type { PhaseContext } from './types';
import {
  loadIssue,
  loadPlan,
  getPreviousTaskSummaries,
  loadModuleFindingsSummary,
} from './context-builder';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { findCompletionRecordPath } from '../tools/coda-advance';
import { getCeremonyRules } from './ceremony';
import type { CeremonyRules } from './ceremony';

/**
 * Load topic-matched reference doc sections for UNIFY context.
 *
 * Lists all .md files in `{codaRoot}/reference/`, reads each to check
 * topic overlap with the issue's topics, and returns concatenated matching
 * sections. Falls back to full ref-system.md if no topics match.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param topics - Array of topic strings from the issue
 * @returns Concatenated matched reference doc sections
 */
export function loadTopicMatchedRefDocs(codaRoot: string, topics: string[]): string {
  const refDir = join(codaRoot, 'reference');
  if (!existsSync(refDir)) return '';

  let refFiles: string[];
  try {
    refFiles = readdirSync(refDir).filter((f) => f.endsWith('.md'));
  } catch {
    return '';
  }

  if (refFiles.length === 0) return '';

  // If no topics, return full ref-system.md only
  if (topics.length === 0) {
    const systemPath = join(refDir, 'ref-system.md');
    if (!existsSync(systemPath)) return '';
    try {
      const record = readRecord<Record<string, unknown>>(systemPath);
      return `### ref-system.md\n${record.body}`;
    } catch {
      return '';
    }
  }

  const parts: string[] = [];

  for (const file of refFiles) {
    const filePath = join(refDir, file);
    try {
      const record = readRecord<Record<string, unknown>>(filePath);
      const docTopics = (record.frontmatter['topics'] as string[] | undefined) ?? [];

      // Check if doc topics overlap with issue topics (case-insensitive)
      const lowerIssueTopics = topics.map((t) => t.toLowerCase());
      const hasOverlap = docTopics.some((dt) =>
        lowerIssueTopics.some((it) => dt.toLowerCase().includes(it) || it.includes(dt.toLowerCase()))
      );

      if (hasOverlap) {
        const matchedSections = getSectionsByTopics(record.body, topics);
        if (matchedSections.length > 0) {
          const sectionText = matchedSections
            .map((s) => `#### ${s.heading}\n${s.content}`)
            .join('\n\n');
          parts.push(`### ${file}\n${sectionText}`);
        }
      }
    } catch {
      // Skip files that can't be parsed
    }
  }

  // If no topic matches, fall back to full ref-system.md
  if (parts.length === 0) {
    const systemPath = join(refDir, 'ref-system.md');
    if (!existsSync(systemPath)) return '';
    try {
      const record = readRecord<Record<string, unknown>>(systemPath);
      return `### ref-system.md\n${record.body}`;
    } catch {
      return '';
    }
  }

  return parts.join('\n\n');
}

/**
 * Assemble the full UNIFY phase context with structured instructions for all 5 mandatory actions.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @param state - Optional CodaState for metadata
 * @returns PhaseContext with systemPrompt covering all 5 UNIFY actions and assembled context
 */
export function assembleUnifyContext(
  codaRoot: string,
  issueSlug: string,
  state?: CodaState
): PhaseContext {
  // Load issue
  const issue = loadIssue(codaRoot, issueSlug);
  const issueContext = issue
    ? `## Issue: ${issue.frontmatter.title}\n${issue.body}`
    : '## Issue\nNo issue found.';

  const issueTopics = issue?.frontmatter.topics ?? [];
  const specDelta = issue?.frontmatter['spec_delta'] as string | undefined;
  const hasMilestone = Boolean(issue?.frontmatter['milestone']);

  // Load plan overview
  const plan = loadPlan(codaRoot, issueSlug);
  const planContext = plan ? `## Plan\n${plan.body}` : '';

  // Load ALL completed task summaries
  const completedTasks = state?.completed_tasks ?? [];
  const summaries = getPreviousTaskSummaries(
    codaRoot, issueSlug, completedTasks, completedTasks.length
  );

  // Load topic-matched reference docs
  const refDocSections = loadTopicMatchedRefDocs(codaRoot, issueTopics);

  // Load module findings summary
  const findingsSummary = loadModuleFindingsSummary(codaRoot, issueSlug);

  // Check for existing completion record with revision feedback
  const revisionFeedback = loadUnifyReviewFeedback(codaRoot, issueSlug);
  const isRevision = revisionFeedback !== null;

  const issueType = issue?.frontmatter.issue_type ?? 'feature';
  const ceremony = getCeremonyRules(issueType);

  // Build the system prompt — revision-aware when changes have been requested
  const systemPrompt = isRevision
    ? buildUnifyRevisionPrompt(revisionFeedback)
    : buildUnifySystemPrompt(specDelta, hasMilestone, ceremony, issueType);
  const context = [
    issueContext,
    planContext,
    summaries ? `## Task Summaries\n${summaries}` : '',
    refDocSections ? `## Reference Docs (topic-matched)\n${refDocSections}` : '',
    findingsSummary ? `## Module Findings\n${findingsSummary}` : '',
  ].filter(Boolean).join('\n\n');

  return {
    systemPrompt,
    context,
    metadata: {
      phase: 'unify',
      submode: state?.submode ?? null,
      loopIteration: state?.loop_iteration ?? 0,
      currentTask: state?.current_task ?? null,
      taskKind: null,
      taskTitle: null,
    },
  };
}

/**
 * YAML schema block agents emit in ACTION 5 for the `artifacts_produced`
 * field. Held as a byte-stable constant so tests can assert exact substrings.
 */
const ARTIFACTS_SCHEMA_BLOCK = `  artifacts_produced:
    overlays: ['modules/{module}.local.md', …]     # paths you wrote under .coda/modules/
    reference_docs: ['reference/{doc}.md', …]     # paths you wrote under .coda/reference/
    decisions: ['records/{slug}.md', …]            # any coda_create type:'decision' records
  exemptions:         # include ONLY for categories with no artifact
    overlays: "short reason"
    reference_docs: "short reason"
    system_spec: "short reason"    # required if issue has spec_delta and ref-system.md was not updated`;

/**
 * Build the "Before You Write the Completion Record" evidence instruction
 * block. Ceremony-aware — strict wording for feature/bugfix, relaxed wording
 * for refactor/chore/docs. Spec-delta enforcement is ceremony-independent.
 */
function buildEvidenceBlock(ceremony: CeremonyRules, hasSpecDelta: boolean): string {
  const strictClause = ceremony.unifyFull === true
    ? `- This issue type has full UNIFY ceremony: at least one artifact is required. You MUST produce at least one overlay update (.coda/modules/{module}.local.md) OR reference-doc update (.coda/reference/{doc}.md). If you legitimately have no compounding signal for one category, declare an exemption with a concrete reason in the \`exemptions\` block.`
    : `- This issue type has relaxed UNIFY ceremony. If you legitimately have no compounding signal, leave artifacts_produced empty — no exemption needed — but if you DO have insight worth capturing, prefer an overlay update.`;

  const specDeltaClause = hasSpecDelta
    ? `\n- spec_delta declared on issue: you MUST update \`reference/ref-system.md\` OR declare \`exemptions.system_spec\` with a concrete reason. The gate will block until one of these is true.`
    : '';

  return `Before You Write the Completion Record — Collect Evidence
- Before writing the completion record, list the paths of every overlay or reference doc you created or modified during this UNIFY pass.
- Gather decision-record paths (anything you created via coda_create type:'decision').
${strictClause}${specDeltaClause}
- The gate verifies every declared path exists on disk and contains non-empty content. Fake paths will be rejected. Empty exemption strings will be rejected.`;
}

/**
 * Build the UNIFY system prompt with instructions for all 5 mandatory actions.
 */
function buildUnifySystemPrompt(
  specDelta: string | undefined,
  hasMilestone: boolean,
  ceremony: CeremonyRules,
  _issueType: string
): string {
  const hasSpecDelta = specDelta !== undefined && specDelta !== null;
  const evidenceBlock = buildEvidenceBlock(ceremony, hasSpecDelta);

  return `You are completing the UNIFY phase — CODA's compounding engine. Every completed issue should make future issues easier.

You MUST perform all 5 mandatory actions in order:

ACTION 1: Merge Spec Delta into ref-system.md
- Read the spec delta from the issue (if present in frontmatter or body)
- Compare the planned delta against what was actually built (check task summaries)
- Produce the FINAL delta — adjusted for any deviations from the original plan
- Use coda_edit_body to apply ADDED/MODIFIED/REMOVED changes to reference/ref-system
- If no spec delta exists on the issue, confirm explicitly: no spec change needed
- Remember whether you made changes (you will report this in the completion record)
${hasSpecDelta ? `\nSpec delta found on issue:\n${String(specDelta)}\n` : ''}
ACTION 2: Review and Update Other Reference Docs
- Check which reference docs share topics with this issue
- For each matching doc: does this issue change anything about the documented content?
- If yes: use coda_edit_body to update the relevant sections
- If no updates needed: confirm explicitly

ACTION 3: Capture Knowledge for Compounding
- Ask: "Would the system catch this automatically next time?"
- New conventions → update ref-conventions (if it exists) via coda_edit_body
- New patterns → create or update reference docs
- New decisions → create decision records via coda_create type 'decision'
- Lessons learned → update relevant ref doc sections

ACTION 3b: Update Module Overlays for Compounding
- If this issue revealed project-specific patterns relevant to any module (security, tdd, architecture, quality, knowledge), update the module overlay:
  - Use coda_edit_body on .coda/modules/{module}.local.md to add entries under the appropriate section:
    - "## Project Values" — high-level principles established by this work
    - "## Validated Patterns" — conventions confirmed or established by this issue
    - "## Known False Positives" — findings dismissed during this issue with context
    - "## Recurring Issues" — problems flagged repeatedly that remain unresolved
  - Create the overlay file if it doesn't exist yet (use coda_create type 'reference' or coda_edit_body)
- If no module-relevant patterns were learned, skip this action

ACTION 4: Update Milestone Progress
${hasMilestone
    ? '- This issue has a milestone field — check if a milestone record exists\n- If a milestone record exists: update its success criteria status'
    : '- This issue has no milestone field — this action is satisfied automatically'}

${evidenceBlock}

ACTION 5: Write Completion Record (LAST — after all other actions)
- Use coda_create with type 'record' to create the completion record
- Include frontmatter: title, issue slug, completed_at (ISO date), topics (from issue),
  system_spec_updated: true (if you merged changes OR confirmed no change),
  reference_docs_reviewed: true (after completing Action 2),
  milestone_updated: true (after completing Action 4 — even if no milestone exists),
  unify_review_status: 'pending' (triggers human review before advancing to DONE)
- Also include the following YAML schema describing the artifacts you produced:
${ARTIFACTS_SCHEMA_BLOCK}
- Include body sections: Summary, Verification Evidence (per-AC), Deviations,
  Decisions, Patterns, Module Findings
- The three boolean flags (system_spec_updated, reference_docs_reviewed, milestone_updated) MUST all be true before you can advance to DONE. The unify_review_status must be set to 'pending' — a human will review your UNIFY output and approve or request changes before DONE.
Since you write the record LAST, all fields should reflect the actual outcomes
of Actions 1-4.`;
}

/**
 * Load UNIFY review feedback from the completion record when changes have been requested.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param issueSlug - The issue slug
 * @returns Feedback string if changes-requested, null otherwise
 */
export function loadUnifyReviewFeedback(codaRoot: string, issueSlug: string): string | null {
  const recordPath = findCompletionRecordPath(codaRoot, issueSlug);
  if (!recordPath) {
    return null;
  }

  try {
    const record = readRecord<CompletionRecord>(recordPath);
    if (record.frontmatter.unify_review_status !== 'changes-requested') {
      return null;
    }

    // Extract the "UNIFY Review" section from the body
    const sectionMatch = record.body.match(/## UNIFY Review\n([\s\S]*?)(?=\n## |$)/);
    return sectionMatch ? sectionMatch[1]!.trim() : 'Changes requested (no specific feedback found).';
  } catch {
    return null;
  }
}

/**
 * Build a revision-aware UNIFY prompt when the human has requested changes.
 */
function buildUnifyRevisionPrompt(feedback: string): string {
  return `You are revising your UNIFY output after human review. The reviewer has requested changes.

HUMAN REVIEW FEEDBACK:
${feedback}

Address the feedback above. You may:
- Update reference docs via coda_edit_body if the reviewer flagged missing or incorrect updates
- Update the completion record body via coda_edit_body to add missing sections or evidence
- Create new decision records or update patterns as needed
- Use coda_update on the completion record to reset unify_review_status to 'pending' when done

After addressing all feedback, use coda_update on the completion record to set
unify_review_status back to 'pending', then call coda_advance to request DONE again.
The human will re-review your changes.`;
}