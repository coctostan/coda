/**
 * @module forge/greenfield
 * Greenfield FORGE flow — initializes a new CODA project.
 *
 * Orchestrates scaffold creation, reference doc generation,
 * and first milestone creation. In v0.1 this is the only
 * FORGE flow — no brownfield, additive, or transformative.
 */

import { writeRecord } from '@coda/core';
import { join } from 'path';
import { detectBackdrop, scaffoldCoda } from './scaffold';
import type { ForgeInterviewAnswers, ForgeContext, ForgeResult } from './types';

/**
 * Generate reference documents from interview answers.
 *
 * Creates ref-system.md (what the system does) and ref-prd.md
 * (why it exists, for whom) as valid mdbase records in `.coda/reference/`.
 *
 * @param codaRoot - Absolute path to the `.coda/` directory
 * @param answers - Pre-collected interview answers
 */
export function generateRefDocs(
  codaRoot: string,
  answers: ForgeInterviewAnswers
): void {
  // ref-system.md — what the system does
  const systemFrontmatter = {
    type: 'reference',
    title: 'System Reference',
  };
  const systemBody = [
    '## What This System Does',
    '',
    answers.building,
    '',
    '## Technology Stack',
    '',
    answers.techStack,
    '',
  ].join('\n');

  writeRecord(
    join(codaRoot, 'reference', 'ref-system.md'),
    systemFrontmatter,
    systemBody
  );

  // ref-prd.md — why it exists, for whom
  const prdFrontmatter = {
    type: 'reference',
    title: 'Product Requirements',
  };
  const prdBodyParts = [
    '## Target Users',
    '',
    answers.users,
    '',
    '## Scope',
    '',
    answers.scope,
    '',
  ];

  if (answers.constraints) {
    prdBodyParts.push('## Constraints', '', answers.constraints, '');
  }

  writeRecord(
    join(codaRoot, 'reference', 'ref-prd.md'),
    prdFrontmatter,
    prdBodyParts.join('\n')
  );
}

/**
 * Create the first milestone record from interview answers.
 *
 * Writes a milestone file to `.coda/milestones/m1-initial.md`
 * with scope derived from the interview.
 *
 * @param codaRoot - Absolute path to the `.coda/` directory
 * @param answers - Pre-collected interview answers
 */
export function createFirstMilestone(
  codaRoot: string,
  answers: ForgeInterviewAnswers
): void {
  const frontmatter = {
    title: 'Initial Milestone',
    status: 'planned',
    version: '0.1.0',
  };

  const body = [
    '## Scope',
    '',
    answers.scope,
    '',
    '## System',
    '',
    answers.building,
    '',
  ].join('\n');

  writeRecord(
    join(codaRoot, 'milestones', 'm1-initial.md'),
    frontmatter,
    body
  );
}

/**
 * Execute the full greenfield FORGE flow.
 *
 * Detects backdrop, scaffolds `.coda/`, generates reference docs,
 * and creates the first milestone. Returns early if `.coda/` already exists.
 *
 * @param context - Project root and pre-collected interview answers
 * @returns ForgeResult indicating success/failure with a message
 */
export function forgeGreenfield(context: ForgeContext): ForgeResult {
  const { projectRoot, answers } = context;

  // Check backdrop — return early if already initialized
  const backdrop = detectBackdrop(projectRoot);
  if (backdrop.type === 'existing') {
    return {
      success: false,
      codaRoot: join(projectRoot, '.coda'),
      message: 'Already initialized. Use /coda new to create an issue.',
    };
  }

  // Scaffold .coda/ structure
  const codaRoot = scaffoldCoda(projectRoot);

  // Generate reference docs from interview
  generateRefDocs(codaRoot, answers);

  // Create first milestone
  createFirstMilestone(codaRoot, answers);

  return {
    success: true,
    codaRoot,
    message: 'Project initialized. Create your first issue with /coda new',
  };
}
