/**
 * @module modules/overlay
 * Project-specific overlay support for module prompts (L3).
 *
 * Overlay files live under `.coda/modules/*.local.md` and provide
 * project-local context that is appended to default module prompts.
 *
 * Dependency rule: L3 modules MUST NOT import from L1 (data) or L2 (state).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Valid overlay section names. */
export type OverlaySection =
  | 'project_values'
  | 'validated_patterns'
  | 'known_false_positives'
  | 'recurring_issues';

/** Frontmatter for overlay files. */
export interface OverlayFrontmatter {
  module: string;
  last_updated: string;
  updated_by: string;
}

/** Parsed overlay data. */
export interface OverlayData {
  frontmatter: OverlayFrontmatter;
  sections: Record<OverlaySection, string[]>;
}

const SECTION_ORDER: OverlaySection[] = [
  'project_values',
  'validated_patterns',
  'known_false_positives',
  'recurring_issues',
];

const SECTION_HEADINGS: Record<OverlaySection, string> = {
  project_values: '## Project Values',
  validated_patterns: '## Validated Patterns',
  known_false_positives: '## Known False Positives',
  recurring_issues: '## Recurring Issues',
};

const HEADING_TO_SECTION: Record<string, OverlaySection> = {
  '## Project Values': 'project_values',
  '## Validated Patterns': 'validated_patterns',
  '## Known False Positives': 'known_false_positives',
  '## Recurring Issues': 'recurring_issues',
};

function getOverlayPath(codaRoot: string, moduleName: string): string {
  return join(codaRoot, 'modules', `${moduleName}.local.md`);
}

function createEmptySections(): Record<OverlaySection, string[]> {
  return {
    project_values: [],
    validated_patterns: [],
    known_false_positives: [],
    recurring_issues: [],
  };
}

function normalizeNewlines(content: string): string {
  return content.replace(/\r\n?/g, '\n');
}

function parseFrontmatter(
  frontmatterText: string,
  moduleName: string
): OverlayFrontmatter {
  const frontmatter: OverlayFrontmatter = {
    module: moduleName,
    last_updated: '',
    updated_by: '',
  };

  for (const line of frontmatterText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }

    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    switch (key) {
      case 'module':
        frontmatter.module = value;
        break;
      case 'last_updated':
        frontmatter.last_updated = value;
        break;
      case 'updated_by':
        frontmatter.updated_by = value;
        break;
      default:
        break;
    }
  }

  return frontmatter;
}

function parseOverlaySections(body: string): Record<OverlaySection, string[]> {
  const sections = createEmptySections();
  let currentSection: OverlaySection | null = null;

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();

    if (line.length === 0) {
      continue;
    }

    const section = HEADING_TO_SECTION[line];
    if (section !== undefined) {
      currentSection = section;
      continue;
    }

    if (currentSection !== null && line.startsWith('- ')) {
      const item = line.slice(2).trim();
      if (item.length > 0) {
        sections[currentSection].push(item);
      }
    }
  }

  return sections;
}

function splitFrontmatter(content: string): {
  frontmatter: string;
  body: string;
} {
  const normalized = normalizeNewlines(content);

  if (!normalized.startsWith('---\n') && normalized !== '---') {
    return { frontmatter: '', body: normalized };
  }

  const lines = normalized.split('\n');
  let closingMarkerIndex = -1;

  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === '---') {
      closingMarkerIndex = index;
      break;
    }
  }

  if (closingMarkerIndex === -1) {
    return { frontmatter: '', body: normalized };
  }

  return {
    frontmatter: lines.slice(1, closingMarkerIndex).join('\n'),
    body: lines.slice(closingMarkerIndex + 1).join('\n').trim(),
  };
}

function serializeOverlay(data: OverlayData): string {
  const frontmatter = [
    '---',
    `module: ${data.frontmatter.module}`,
    `last_updated: ${data.frontmatter.last_updated}`,
    `updated_by: ${data.frontmatter.updated_by}`,
    '---',
  ].join('\n');

  const body = formatOverlayBody(data);
  return body.length > 0 ? `${frontmatter}\n\n${body}\n` : `${frontmatter}\n`;
}

/**
 * Read and parse a module overlay file from `.coda/modules/{module}.local.md`.
 *
 * @param codaRoot - Absolute or relative path to the `.coda/` directory
 * @param moduleName - Module name used to resolve the overlay file
 * @returns Parsed overlay data, or null when the file does not exist
 */
export function readOverlay(codaRoot: string, moduleName: string): OverlayData | null {
  const overlayPath = getOverlayPath(codaRoot, moduleName);

  if (!existsSync(overlayPath)) {
    return null;
  }

  const content = readFileSync(overlayPath, 'utf-8');
  const { frontmatter, body } = splitFrontmatter(content);

  return {
    frontmatter: parseFrontmatter(frontmatter, moduleName),
    sections: parseOverlaySections(body),
  };
}

/**
 * Write an overlay file to `.coda/modules/{module}.local.md`, creating the
 * modules directory when needed.
 *
 * @param codaRoot - Absolute or relative path to the `.coda/` directory
 * @param moduleName - Module name used to resolve the overlay file path
 * @param data - Overlay content to serialize and write
 */
export function writeOverlay(
  codaRoot: string,
  moduleName: string,
  data: OverlayData
): void {
  const modulesDir = join(codaRoot, 'modules');
  const overlayPath = getOverlayPath(codaRoot, moduleName);

  mkdirSync(modulesDir, { recursive: true });
  writeFileSync(overlayPath, serializeOverlay(data), 'utf-8');
}

/**
 * Append a bullet item to a single overlay section, creating the overlay file
 * when it does not already exist.
 *
 * @param codaRoot - Absolute or relative path to the `.coda/` directory
 * @param moduleName - Module name used to resolve the overlay file path
 * @param section - Logical overlay section to append to
 * @param content - Bullet content to append
 * @param updatedBy - Actor recorded in overlay frontmatter
 */
export function appendToOverlay(
  codaRoot: string,
  moduleName: string,
  section: OverlaySection,
  content: string,
  updatedBy: string
): void {
  const now = new Date().toISOString();
  const overlay = readOverlay(codaRoot, moduleName) ?? {
    frontmatter: {
      module: moduleName,
      last_updated: now,
      updated_by: updatedBy,
    },
    sections: createEmptySections(),
  };

  const item = content.trim();
  if (item.length > 0) {
    overlay.sections[section].push(item);
  }

  overlay.frontmatter.module = moduleName;
  overlay.frontmatter.last_updated = now;
  overlay.frontmatter.updated_by = updatedBy;

  writeOverlay(codaRoot, moduleName, overlay);
}

/**
 * Load a default prompt and merge in project-specific overlay content when the
 * overlay exists and contains at least one item.
 *
 * @param defaultPromptPath - Path to the base module prompt markdown file
 * @param codaRoot - Absolute or relative path to the `.coda/` directory
 * @param moduleName - Module name used to resolve the overlay file
 * @returns Default prompt text, optionally suffixed with project context
 */
export function loadMergedPrompt(
  defaultPromptPath: string,
  codaRoot: string,
  moduleName: string
): string {
  const defaultPrompt = readFileSync(defaultPromptPath, 'utf-8');
  const overlay = readOverlay(codaRoot, moduleName);

  if (overlay === null) {
    return defaultPrompt;
  }

  const overlayBody = formatOverlayBody(overlay);
  if (overlayBody.length === 0) {
    return defaultPrompt;
  }

  return `${defaultPrompt}\n\n## Project-Specific Context\n\n${overlayBody}`;
}

/**
 * Render overlay sections into markdown body content.
 * Empty sections are omitted.
 *
 * @param data - Parsed overlay data to format
 * @returns Markdown body containing only non-empty overlay sections
 */
export function formatOverlayBody(data: OverlayData): string {
  const renderedSections: string[] = [];

  for (const section of SECTION_ORDER) {
    const items = data.sections[section];
    if (items.length === 0) {
      continue;
    }

    const lines = [SECTION_HEADINGS[section], ...items.map((item) => `- ${item}`)];
    renderedSections.push(lines.join('\n'));
  }

  return renderedSections.join('\n\n');
}
