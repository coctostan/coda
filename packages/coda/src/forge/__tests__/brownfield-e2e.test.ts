/**
 * E2E integration test for brownfield FORGE pipeline.
 * Exercises the full flow: detection → scaffold → SCAN → SYNTHESIZE → GAP → VALIDATE → ORIENT
 * plus context features (topic retrieval, ceremony, budgets).
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

// Forge imports
import {
  detectBackdrop,
  scaffoldCoda,
  assembleScanContext,
  assembleSynthesizeContext,
  assembleGapAnalysisContext,
  assembleValidateContext,
  assembleOrientContext,
  writeGapAnalysis,
  readGapAnalysis,
  writeMilestonePlan,
  readMilestonePlan,
  SYNTHESIZE_REF_DOCS,
  GAP_DOMAINS,
  VALIDATE_QUESTIONS,
  ORIENT_QUESTIONS,
} from '..';
import { writeEvidence, readEvidence, readAllEvidence } from '../evidence';
import type { EvidenceFrontmatter } from '../evidence';

// Core imports
import { createRegistry } from '@coda/core';
import { getSectionsByTopics, getSectionHeadings } from '@coda/core';
import { getCeremonyRules } from '../../workflow/ceremony';
import { assembleWithinBudget, estimateTokens, PHASE_BUDGETS } from '../../workflow/context-budgets';
import type { ContextSection } from '../../workflow/context-budgets';

const promptsDir = resolve(__dirname, '../../../../../modules/prompts');

describe('Brownfield FORGE E2E', () => {
  let tempDir: string;
  let projectRoot: string;
  let codaRoot: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'coda-e2e-brownfield-'));
    projectRoot = tempDir;
    codaRoot = join(projectRoot, '.coda');

    // Create a realistic mock brownfield project
    writeFileSync(join(projectRoot, 'package.json'), JSON.stringify({
      name: 'coda-test-todo',
      version: '1.0.0',
      scripts: { test: 'bun test', start: 'bun run src/index.ts' },
      dependencies: {},
    }, null, 2));

    writeFileSync(join(projectRoot, 'README.md'), [
      '# coda-test-todo',
      '',
      '## Overview',
      '',
      'A simple CLI todo application for testing CODA brownfield onboarding.',
      '',
      '## Features',
      '',
      '- Add, list, complete, and remove todos',
      '- JSON file storage',
      '- CLI interface',
      '',
      '## Authentication',
      '',
      'No authentication required — local-only tool.',
      '',
    ].join('\n'));

    mkdirSync(join(projectRoot, 'src'));
    writeFileSync(join(projectRoot, 'src', 'index.ts'), 'export function main() { console.log("todo"); }\n');
    writeFileSync(join(projectRoot, 'src', 'store.ts'), 'export function loadTodos() { return []; }\n');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function makeFm(module: string): EvidenceFrontmatter {
    return {
      module,
      scanned_at: '2026-04-03T10:00:00Z',
      files_read: ['src/index.ts', 'package.json'],
      commands_run: ['ls -la', 'find src -type f'],
    };
  }

  test('full brownfield pipeline: detect → scaffold → scan → synthesize → gap → validate → orient', () => {
    // 1. DETECT — brownfield (has package.json + src/, no .coda/)
    const backdrop = detectBackdrop(projectRoot);
    expect(backdrop.type).toBe('brownfield');

    // 2. SCAFFOLD
    scaffoldCoda(projectRoot);
    expect(existsSync(codaRoot)).toBe(true);
    expect(existsSync(join(codaRoot, 'coda.json'))).toBe(true);

    // 3. SCAN — assemble context
    const scanCtx = assembleScanContext(projectRoot, promptsDir);
    expect(scanCtx.universalTargets).toContain('README.md');
    expect(scanCtx.universalTargets).toContain('package.json');
    expect(scanCtx.sourceDir).toBe('src');
    expect(scanCtx.modulePrompts.length).toBeGreaterThan(0);
    expect(scanCtx.universalCommands.some((c) => c.includes('find src'))).toBe(true);

    // Simulate agent writing evidence (3 modules)
    writeEvidence(codaRoot, 'universal', makeFm('universal'),
      '## Overview\nTodo CLI app.\n\n## Features\nAdd, list, done, remove.\n');
    writeEvidence(codaRoot, 'architecture', makeFm('architecture'),
      '## Structure\nFlat src/ with index.ts + store.ts.\n\n## Patterns\nNo layering.\n');
    writeEvidence(codaRoot, 'security', makeFm('security'),
      '## Auth\nNo auth (local only).\n\n## Secrets\nNone detected.\n');

    // 4. SYNTHESIZE — reads evidence
    const synthCtx = assembleSynthesizeContext(codaRoot);
    expect(synthCtx.evidenceCount).toBe(3);
    expect(synthCtx.evidence.map((e) => e.module)).toEqual(['architecture', 'security', 'universal']);
    expect(synthCtx.refDocs).toHaveLength(4);

    // 5. GAP ANALYSIS — reads evidence + provides domains
    const gapCtx = assembleGapAnalysisContext(codaRoot);
    expect(gapCtx.evidenceCount).toBe(3);
    expect(gapCtx.domains).toHaveLength(5);

    const gapPath = writeGapAnalysis(codaRoot, '## Summary Dashboard\n| Domain | Verdict |\n|--------|--------|\n| Quality | Weak |\n\n## Priority Issues\n1. No CI pipeline\n');
    expect(existsSync(gapPath)).toBe(true);

    // 6. VALIDATE — reads gap + evidence
    const valCtx = assembleValidateContext(codaRoot);
    expect(valCtx.gapAnalysis).not.toBeNull();
    expect(valCtx.gapAnalysis!.body).toContain('Summary Dashboard');
    expect(valCtx.evidenceSummary).toHaveLength(3);
    expect(valCtx.questions).toHaveLength(4);

    // 7. ORIENT — reads gap + evidence + direction questions
    const oriCtx = assembleOrientContext(codaRoot);
    expect(oriCtx.gapAnalysis).not.toBeNull();
    expect(oriCtx.questions).toHaveLength(4);

    // Write milestone plan
    const milestonePath = writeMilestonePlan(codaRoot, '## Milestones\n1. Add priority field\n2. Improve formatting\n');
    expect(existsSync(milestonePath)).toBe(true);

    const milestone = readMilestonePlan(codaRoot);
    expect(milestone).not.toBeNull();
    expect(milestone!.frontmatter['title']).toBe('Milestone Plan');
    expect(milestone!.body).toContain('priority field');
  });

  test('context features: topic retrieval + ceremony + budgets', () => {
    // Topic-based section retrieval on README content
    const readmeBody = '## Overview\nTodo app.\n\n## Features\nAdd, list, done.\n\n## Authentication\nNo auth.\n';
    const sections = getSectionsByTopics(readmeBody, ['auth']);
    const headings = sections.map((s) => s.heading);
    expect(headings).toContain('Overview'); // always included
    expect(headings).toContain('Authentication'); // matches 'auth'
    expect(headings).not.toContain('Features'); // doesn't match

    const allHeadings = getSectionHeadings(readmeBody);
    expect(allHeadings).toEqual(['Overview', 'Features', 'Authentication']);

    // Adaptive ceremony
    const bugfixRules = getCeremonyRules('bugfix');
    expect(bugfixRules.tddEnabled).toBe(true);
    expect(bugfixRules.verifyMaxIterations).toBe(2);
    expect(bugfixRules.humanReviewDefault).toBe(true);

    const choreRules = getCeremonyRules('chore');
    expect(choreRules.tddEnabled).toBe(false);
    expect(choreRules.modulesEnabled).toBe(false);
    expect(choreRules.reviewEnabled).toBe(false);

    // Context budgets
    const sections2: ContextSection[] = [
      { label: 'task', content: 'Build the thing', priority: 'required', estimatedTokens: 100 },
      { label: 'ref-system', content: 'System reference', priority: 'high', estimatedTokens: 200 },
      { label: 'full-history', content: 'Everything ever', priority: 'low', estimatedTokens: 5000 },
    ];
    const result = assembleWithinBudget(sections2, PHASE_BUDGETS['build']!);
    expect(result.includedLabels).toContain('task');
    expect(result.includedLabels).toContain('ref-system');
    expect(result.usedTokens).toBeLessThanOrEqual(PHASE_BUDGETS['build']!);

    expect(estimateTokens('a'.repeat(400))).toBe(100);
  });

  test('module init-scan hooks: all 5 modules registered', () => {
    const registry = createRegistry({}, promptsDir);
    const initScan = registry.getModulesForHook('init-scan');

    expect(initScan).toHaveLength(5);
    expect(initScan[0]!.name).toBe('architecture'); // priority 50
    expect(initScan[initScan.length - 1]!.name).toBe('knowledge'); // priority 200

    const names = initScan.map((m) => m.name);
    expect(names).toContain('security');
    expect(names).toContain('tdd');
    expect(names).toContain('quality');
  });

  test('evidence persistence round-trip', () => {
    scaffoldCoda(projectRoot);

    // Write 3 evidence files
    writeEvidence(codaRoot, 'security', makeFm('security'), '## Security\nNo issues.\n');
    writeEvidence(codaRoot, 'architecture', makeFm('architecture'), '## Arch\nFlat structure.\n');
    writeEvidence(codaRoot, 'universal', makeFm('universal'), '## Universal\nTodo app.\n');

    // Read all — sorted by filename
    const all = readAllEvidence(codaRoot);
    expect(all).toHaveLength(3);
    expect(all[0]!.frontmatter.module).toBe('architecture');
    expect(all[1]!.frontmatter.module).toBe('security');
    expect(all[2]!.frontmatter.module).toBe('universal');

    // Read single
    const sec = readEvidence(codaRoot, 'security');
    expect(sec).not.toBeNull();
    expect(sec!.body).toContain('No issues');
    expect(sec!.frontmatter.files_read).toEqual(['src/index.ts', 'package.json']);

    // Gap analysis round-trip
    writeGapAnalysis(codaRoot, '## Gaps\nCI missing.\n');
    const gap = readGapAnalysis(codaRoot);
    expect(gap).not.toBeNull();
    expect(gap!.body).toContain('CI missing');
    expect(gap!.frontmatter['title']).toBe('Gap Analysis');

    // Milestone plan round-trip
    writeMilestonePlan(codaRoot, '## Plan\nAdd tests first.\n');
    const plan = readMilestonePlan(codaRoot);
    expect(plan).not.toBeNull();
    expect(plan!.body).toContain('Add tests first');
    expect(plan!.frontmatter['title']).toBe('Milestone Plan');
  });
});
