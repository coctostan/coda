/**
 * @module forge/brownfield
 * Brownfield SCAN orchestration for existing codebases.
 *
 * Identifies universal scan targets, detects the source directory,
 * and assembles init-scan module prompts. The agent acts on the
 * returned ScanContext to read files, run commands, and produce evidence.
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createRegistry, readRecord, writeRecord } from '@coda/core';
import type { RegistryConfig } from '@coda/core';
import { createDispatcher } from '@coda/core';
import { readAllEvidence } from './evidence';

/**
 * Universal files to check for during brownfield scanning.
 * These are always scanned regardless of which modules are enabled.
 */
export const UNIVERSAL_SCAN_TARGETS: readonly string[] = [
  'README.md',
  'CONTRIBUTING.md',
  'AGENTS.md',
  'CLAUDE.md',
  'package.json',
  'Cargo.toml',
  'go.mod',
  'pyproject.toml',
] as const;

/**
 * Base commands to run for universal evidence gathering.
 * Dynamic commands (e.g., `find {sourceDir}`) are added by assembleScanContext.
 */
export const UNIVERSAL_COMMANDS: readonly string[] = [
  'git log --oneline -20',
  'ls -la',
] as const;

/** Candidate source directories, checked in priority order. */
const SOURCE_DIR_CANDIDATES = ['src', 'lib', 'app', 'cmd', 'pkg'] as const;

/**
 * The assembled scan context returned to the agent for brownfield FORGE.
 */
export interface ScanContext {
  /** Universal files that exist in the project. */
  universalTargets: string[];
  /** Detected source directory (src, lib, app, etc.) or null if none found. */
  sourceDir: string | null;
  /** Commands to run for universal evidence (including dynamic find command). */
  universalCommands: string[];
  /** Assembled init-scan prompts from all enabled modules. */
  modulePrompts: string;
}

/**
 * Get the universal scan target files that actually exist in the project.
 *
 * @param projectRoot - Absolute path to the project root
 * @returns Array of filenames (not full paths) that exist
 */
export function getUniversalScanTargets(projectRoot: string): string[] {
  return UNIVERSAL_SCAN_TARGETS.filter((f) => existsSync(join(projectRoot, f)));
}

/**
 * Detect the primary source directory in the project.
 * Checks candidates in priority order: src, lib, app, cmd, pkg.
 *
 * @param projectRoot - Absolute path to the project root
 * @returns The first matching directory name, or null if none found
 */
export function getSourceDirectory(projectRoot: string): string | null {
  for (const dir of SOURCE_DIR_CANDIDATES) {
    if (existsSync(join(projectRoot, dir))) {
      return dir;
    }
  }
  return null;
}

/**
 * Assemble the full scan context for brownfield FORGE.
 *
 * Identifies existing universal targets, detects the source directory,
 * builds the command list, and assembles init-scan module prompts via
 * the dispatcher.
 *
 * @param projectRoot - Absolute path to the project root
 * @param promptsDir - Absolute path to the module prompts directory
 * @param config - Optional registry config for module enable/disable
 * @returns ScanContext for the agent to act on
 */
export function assembleScanContext(
  projectRoot: string,
  promptsDir: string,
  config?: RegistryConfig
): ScanContext {
  const universalTargets = getUniversalScanTargets(projectRoot);
  const sourceDir = getSourceDirectory(projectRoot);

  // Build command list — add dynamic find command if source dir detected
  const universalCommands = [...UNIVERSAL_COMMANDS];
  if (sourceDir) {
    universalCommands.push(`find ${sourceDir} -type f | head -50`);
  }

  // Assemble init-scan prompts from all enabled modules
  const registry = createRegistry(config ?? {}, promptsDir);
  const dispatcher = createDispatcher(registry);
  const modulePrompts = dispatcher.assemblePrompts('init-scan', {
    issueSlug: 'forge-onboarding',
    phase: 'forge',
    submode: null,
  });

  return {
    universalTargets,
    sourceDir,
    universalCommands,
    modulePrompts,
  };
}

// ─── SYNTHESIZE ────────────────────────────────────────────

/**
 * Specification for a reference document to produce during SYNTHESIZE.
 */
export interface RefDocSpec {
  /** Filename (e.g., 'ref-system.md'). */
  name: string;
  /** Human-readable title. */
  title: string;
  /** What this ref doc covers. */
  description: string;
  /** Which evidence modules contribute to this doc. */
  sourceEvidence: string[];
}

/**
 * Reference documents to produce during brownfield SYNTHESIZE.
 * Each entry specifies what the doc covers and which evidence modules feed into it.
 */
export const SYNTHESIZE_REF_DOCS: readonly RefDocSpec[] = [
  {
    name: 'ref-system.md',
    title: 'System Reference',
    description: 'Capabilities assembled from evidence. Structured by capability, not by module.',
    sourceEvidence: ['universal', 'architecture', 'security', 'tdd', 'quality'],
  },
  {
    name: 'ref-architecture.md',
    title: 'Architecture Reference',
    description: 'Patterns, layers, data flow, module boundaries.',
    sourceEvidence: ['architecture', 'quality'],
  },
  {
    name: 'ref-conventions.md',
    title: 'Conventions Reference',
    description: 'Testing patterns, code style, security practices.',
    sourceEvidence: ['quality', 'security', 'tdd'],
  },
  {
    name: 'ref-prd.md',
    title: 'Product Requirements',
    description: 'Why the project exists, who uses it, what it does.',
    sourceEvidence: ['universal', 'knowledge'],
  },
] as const;

/**
 * The assembled synthesis context returned for brownfield SYNTHESIZE.
 */
export interface SynthesizeContext {
  /** Evidence content from SCAN, mapped to module name and body. */
  evidence: Array<{ module: string; body: string }>;
  /** Which reference documents to produce. */
  refDocs: readonly RefDocSpec[];
  /** How many evidence files were found. */
  evidenceCount: number;
}

/**
 * Assemble the synthesis context for brownfield FORGE.
 *
 * Reads all evidence files produced during SCAN and packages them
 * with the ref doc specifications. The agent uses this context to
 * produce the reference documents via `coda_create` / `coda_edit_body`.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @returns SynthesizeContext for the agent to act on
 */
export function assembleSynthesizeContext(codaRoot: string): SynthesizeContext {
  const evidenceRecords = readAllEvidence(codaRoot);
  const evidence = evidenceRecords.map((r) => ({
    module: r.frontmatter.module,
    body: r.body,
  }));

  return {
    evidence,
    refDocs: SYNTHESIZE_REF_DOCS,
    evidenceCount: evidence.length,
  };
}

// ─── GAP ANALYSIS ──────────────────────────────────────────

/**
 * A domain to assess during gap analysis, with dependency ordering.
 */
export interface GapDomain {
  /** Domain name (e.g., 'quality'). */
  name: string;
  /** What to assess in this domain. */
  description: string;
  /** Domains that should be fixed first (dependency ordering). */
  dependsOn: string[];
}

/**
 * Domains to assess during brownfield gap analysis.
 * Ordered by dependency — domains with no dependencies come first,
 * enabling recommendations like "Add CI before increasing test coverage."
 */
export const GAP_DOMAINS: readonly GapDomain[] = [
  {
    name: 'quality',
    description: 'CI pipeline, test framework, linting, type checking',
    dependsOn: [],
  },
  {
    name: 'security',
    description: 'Auth patterns, input validation, secrets, dependency vulnerabilities',
    dependsOn: ['quality'],
  },
  {
    name: 'architecture',
    description: 'Layer boundaries, module structure, god files, circular dependencies',
    dependsOn: [],
  },
  {
    name: 'data',
    description: 'Schema health, migration safety, query patterns',
    dependsOn: ['architecture'],
  },
  {
    name: 'documentation',
    description: 'README, API docs, inline docs, decision records',
    dependsOn: [],
  },
] as const;

/**
 * The assembled gap analysis context for brownfield FORGE.
 */
export interface GapAnalysisContext {
  /** Evidence content from SCAN, mapped to module name and body. */
  evidence: Array<{ module: string; body: string }>;
  /** Domains to assess with dependency ordering. */
  domains: readonly GapDomain[];
  /** How many evidence files were found. */
  evidenceCount: number;
}

/**
 * Assemble the gap analysis context for brownfield FORGE.
 *
 * Reads all evidence from SCAN and packages it with the domain specs.
 * The agent uses this to produce a dependency-ordered gap assessment.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @returns GapAnalysisContext for the agent to act on
 */
export function assembleGapAnalysisContext(codaRoot: string): GapAnalysisContext {
  const evidenceRecords = readAllEvidence(codaRoot);
  const evidence = evidenceRecords.map((r) => ({
    module: r.frontmatter.module,
    body: r.body,
  }));

  return {
    evidence,
    domains: GAP_DOMAINS,
    evidenceCount: evidence.length,
  };
}

/**
 * Write the gap analysis artifact to `.coda/forge/initial/GAP-ANALYSIS.md`.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @param body - Markdown body with the gap analysis content
 * @returns Absolute path to the written file
 */
export function writeGapAnalysis(codaRoot: string, body: string): string {
  const dir = join(codaRoot, 'forge', 'initial');
  mkdirSync(dir, { recursive: true });

  const filePath = join(dir, 'GAP-ANALYSIS.md');
  writeRecord(filePath, {
    title: 'Gap Analysis',
    generated_at: new Date().toISOString(),
  }, body);
  return filePath;
}

/**
 * Read the gap analysis artifact.
 *
 * @param codaRoot - Path to the `.coda/` directory
 * @returns Parsed record with frontmatter and body, or null if not found
 */
export function readGapAnalysis(
  codaRoot: string
): { frontmatter: Record<string, unknown>; body: string } | null {
  const filePath = join(codaRoot, 'forge', 'initial', 'GAP-ANALYSIS.md');
  if (!existsSync(filePath)) return null;

  try {
    return readRecord<Record<string, unknown>>(filePath);
  } catch {
    return null;
  }
}