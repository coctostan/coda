import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  readOverlay,
  writeOverlay,
  appendToOverlay,
  loadMergedPrompt,
  formatOverlayBody,
} from '../overlay';
import type { OverlayData, OverlayFrontmatter, OverlaySection } from '../overlay';

let tmpDir = '';
let codaRoot = '';

const FULL_OVERLAY_CONTENT = `---
module: security
last_updated: 2026-04-03T10:00:00Z
updated_by: unify
---

## Project Values
- This project handles PII. HIPAA compliance is required.
- All API endpoints must use JWT auth.

## Validated Patterns
- Auth middleware verified secure in Issue #3.

## Known False Positives
- AKIA pattern in test fixtures is mock data.

## Recurring Issues
- Agent suggests helmet() — already present in app.ts.
`;

function modulesDir(root: string): string {
  return join(root, 'modules');
}

function overlayPath(root: string, moduleName = 'security'): string {
  return join(modulesDir(root), `${moduleName}.local.md`);
}

function makeSections(
  overrides: Partial<Record<OverlaySection, string[]>> = {}
): Record<OverlaySection, string[]> {
  return {
    project_values: [...(overrides.project_values ?? [])],
    validated_patterns: [...(overrides.validated_patterns ?? [])],
    known_false_positives: [...(overrides.known_false_positives ?? [])],
    recurring_issues: [...(overrides.recurring_issues ?? [])],
  };
}

function makeOverlayData(
  sectionOverrides: Partial<Record<OverlaySection, string[]>> = {},
  frontmatterOverrides: Partial<OverlayFrontmatter> = {}
): OverlayData {
  return {
    frontmatter: {
      module: 'security',
      last_updated: '2026-04-03T10:00:00Z',
      updated_by: 'unify',
      ...frontmatterOverrides,
    },
    sections: makeSections(sectionOverrides),
  };
}

function expectOverlay(result: OverlayData | null, message: string): OverlayData {
  expect(result).not.toBeNull();

  if (result === null) {
    throw new Error(message);
  }

  return result;
}

function writeRawOverlay(content: string, moduleName = 'security'): void {
  writeFileSync(overlayPath(codaRoot, moduleName), content, 'utf8');
}

function writeDefaultPrompt(content: string): string {
  const defaultPromptPath = join(tmpDir, 'default-prompt.md');
  writeFileSync(defaultPromptPath, content, 'utf8');
  return defaultPromptPath;
}

function expectValidIsoTimestamp(value: string): void {
  const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

  expect(isoTimestampPattern.test(value)).toBe(true);
  expect(Number.isNaN(Date.parse(value))).toBe(false);
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'coda-overlay-'));
  codaRoot = tmpDir;
  mkdirSync(modulesDir(codaRoot), { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('overlay', () => {
  describe('readOverlay', () => {
    it('returns null when no overlay file exists', () => {
      const result = readOverlay(codaRoot, 'security');

      expect(result).toBeNull();
    });

    it('parses valid overlay with all 4 sections', () => {
      writeRawOverlay(FULL_OVERLAY_CONTENT);

      const result = expectOverlay(
        readOverlay(codaRoot, 'security'),
        'Expected readOverlay to parse a full overlay file with all four sections.'
      );

      expect(result.frontmatter).toEqual({
        module: 'security',
        last_updated: '2026-04-03T10:00:00Z',
        updated_by: 'unify',
      });
      expect(result.sections.project_values).toEqual([
        'This project handles PII. HIPAA compliance is required.',
        'All API endpoints must use JWT auth.',
      ]);
      expect(result.sections.validated_patterns).toEqual([
        'Auth middleware verified secure in Issue #3.',
      ]);
      expect(result.sections.known_false_positives).toEqual([
        'AKIA pattern in test fixtures is mock data.',
      ]);
      expect(result.sections.recurring_issues).toEqual([
        'Agent suggests helmet() — already present in app.ts.',
      ]);
    });

    it('parses overlay with missing sections (partial overlay)', () => {
      writeRawOverlay(`---
module: security
last_updated: 2026-04-03T10:00:00Z
updated_by: forge
---

## Project Values
- This project handles PII.

## Validated Patterns
- Auth middleware verified secure in Issue #3.
`);

      const result = expectOverlay(
        readOverlay(codaRoot, 'security'),
        'Expected readOverlay to parse a partial overlay file and default missing sections to empty arrays.'
      );

      expect(result.frontmatter).toEqual({
        module: 'security',
        last_updated: '2026-04-03T10:00:00Z',
        updated_by: 'forge',
      });
      expect(result.sections.project_values).toEqual(['This project handles PII.']);
      expect(result.sections.validated_patterns).toEqual([
        'Auth middleware verified secure in Issue #3.',
      ]);
      expect(result.sections.known_false_positives).toEqual([]);
      expect(result.sections.recurring_issues).toEqual([]);
    });
  });

  describe('writeOverlay', () => {
    it('creates new overlay file with frontmatter and sections', () => {
      const data = makeOverlayData({
        project_values: [
          'This project handles PII. HIPAA compliance is required.',
          'All API endpoints must use JWT auth.',
        ],
        validated_patterns: ['Auth middleware verified secure in Issue #3.'],
        known_false_positives: ['AKIA pattern in test fixtures is mock data.'],
        recurring_issues: ['Agent suggests helmet() — already present in app.ts.'],
      });

      writeOverlay(codaRoot, 'security', data);

      const stored = expectOverlay(
        readOverlay(codaRoot, 'security'),
        'Expected writeOverlay to create a readable overlay file.'
      );
      const raw = readFileSync(overlayPath(codaRoot), 'utf8');
      const expectedFrontmatter = `---
module: security
last_updated: 2026-04-03T10:00:00Z
updated_by: unify
---`;

      expect(stored).toEqual(data);
      expect(raw.startsWith(expectedFrontmatter)).toBe(true);
      expect(raw).toContain('## Project Values');
      expect(raw).toContain('## Validated Patterns');
      expect(raw).toContain('## Known False Positives');
      expect(raw).toContain('## Recurring Issues');
    });

    it('overwrites existing overlay', () => {
      writeOverlay(
        codaRoot,
        'security',
        makeOverlayData({
          project_values: ['Initial project value.'],
          validated_patterns: ['Initial validated pattern.'],
        })
      );

      const replacement = makeOverlayData(
        {
          known_false_positives: ['Replacement false positive.'],
          recurring_issues: ['Replacement recurring issue.'],
        },
        {
          last_updated: '2026-04-04T11:30:00Z',
          updated_by: 'eval',
        }
      );

      writeOverlay(codaRoot, 'security', replacement);

      const stored = expectOverlay(
        readOverlay(codaRoot, 'security'),
        'Expected the second writeOverlay call to fully replace the previous overlay content.'
      );

      expect(stored).toEqual(replacement);
      expect(stored.sections.project_values).toEqual([]);
      expect(stored.sections.validated_patterns).toEqual([]);
    });
  });

  describe('appendToOverlay', () => {
    it('creates new overlay when none exists', () => {
      appendToOverlay(
        codaRoot,
        'security',
        'validated_patterns',
        'Auth middleware verified secure in Issue #3.',
        'forge'
      );

      const result = expectOverlay(
        readOverlay(codaRoot, 'security'),
        'Expected appendToOverlay to create a new overlay file when none exists.'
      );

      expect(result.frontmatter.module).toBe('security');
      expect(result.frontmatter.updated_by).toBe('forge');
      expectValidIsoTimestamp(result.frontmatter.last_updated);
      expect(result.sections.project_values).toEqual([]);
      expect(result.sections.validated_patterns).toEqual([
        'Auth middleware verified secure in Issue #3.',
      ]);
      expect(result.sections.known_false_positives).toEqual([]);
      expect(result.sections.recurring_issues).toEqual([]);
    });

    it('appends to existing section without duplicating', () => {
      writeOverlay(
        codaRoot,
        'security',
        makeOverlayData({
          validated_patterns: ['Auth middleware verified secure in Issue #3.'],
        })
      );

      appendToOverlay(
        codaRoot,
        'security',
        'validated_patterns',
        'Rate limiting verified on all public endpoints.',
        'unify'
      );

      const result = expectOverlay(
        readOverlay(codaRoot, 'security'),
        'Expected appendToOverlay to preserve existing entries and append the new item once.'
      );

      expect(result.sections.validated_patterns).toEqual([
        'Auth middleware verified secure in Issue #3.',
        'Rate limiting verified on all public endpoints.',
      ]);
      expect(result.sections.validated_patterns).toHaveLength(2);
    });

    it('updates frontmatter timestamp and updatedBy', () => {
      writeOverlay(
        codaRoot,
        'security',
        makeOverlayData(
          {
            project_values: ['Initial project value.'],
          },
          {
            last_updated: '2026-04-03T10:00:00Z',
            updated_by: 'unify',
          }
        )
      );

      appendToOverlay(
        codaRoot,
        'security',
        'recurring_issues',
        'Agent suggests helmet() — already present in app.ts.',
        'eval'
      );

      const result = expectOverlay(
        readOverlay(codaRoot, 'security'),
        'Expected appendToOverlay to update frontmatter metadata after appending content.'
      );

      expect(result.frontmatter.updated_by).toBe('eval');
      expect(result.frontmatter.last_updated).not.toBe('2026-04-03T10:00:00Z');
      expectValidIsoTimestamp(result.frontmatter.last_updated);
    });
  });

  describe('loadMergedPrompt', () => {
    it('returns default prompt when no overlay exists', () => {
      const defaultPrompt = '# Security Prompt\n\nCheck for auth issues and secrets.';
      const defaultPromptPath = writeDefaultPrompt(defaultPrompt);

      const mergedPrompt = loadMergedPrompt(defaultPromptPath, codaRoot, 'security');

      expect(mergedPrompt).toBe(defaultPrompt);
    });

    it('returns default + overlay body when overlay exists', () => {
      const defaultPrompt = '# Security Prompt\n\nCheck for auth issues and secrets.';
      const defaultPromptPath = writeDefaultPrompt(defaultPrompt);

      writeOverlay(
        codaRoot,
        'security',
        makeOverlayData({
          project_values: ['This project handles PII. HIPAA compliance is required.'],
          recurring_issues: ['Agent suggests helmet() — already present in app.ts.'],
        })
      );

      const mergedPrompt = loadMergedPrompt(defaultPromptPath, codaRoot, 'security');
      const expectedOverlayBody = [
        '## Project Values',
        '- This project handles PII. HIPAA compliance is required.',
        '',
        '## Recurring Issues',
        '- Agent suggests helmet() — already present in app.ts.',
      ].join('\n');

      expect(mergedPrompt).toBe(
        `${defaultPrompt}\n\n## Project-Specific Context\n\n${expectedOverlayBody}`
      );
    });

    it('handles empty overlay body gracefully', () => {
      const defaultPrompt = '# Security Prompt\n\nCheck for auth issues and secrets.';
      const defaultPromptPath = writeDefaultPrompt(defaultPrompt);

      writeOverlay(codaRoot, 'security', makeOverlayData());

      const mergedPrompt = loadMergedPrompt(defaultPromptPath, codaRoot, 'security');

      expect(mergedPrompt).toBe(defaultPrompt);
    });
  });

  describe('formatOverlayBody', () => {
    it('renders all 4 sections correctly', () => {
      const body = formatOverlayBody(
        makeOverlayData({
          project_values: ['This project handles PII. HIPAA compliance is required.'],
          validated_patterns: ['Auth middleware verified secure in Issue #3.'],
          known_false_positives: ['AKIA pattern in test fixtures is mock data.'],
          recurring_issues: ['Agent suggests helmet() — already present in app.ts.'],
        })
      );

      const expected = [
        '## Project Values',
        '- This project handles PII. HIPAA compliance is required.',
        '',
        '## Validated Patterns',
        '- Auth middleware verified secure in Issue #3.',
        '',
        '## Known False Positives',
        '- AKIA pattern in test fixtures is mock data.',
        '',
        '## Recurring Issues',
        '- Agent suggests helmet() — already present in app.ts.',
      ].join('\n');

      expect(body.trim()).toBe(expected);
    });

    it('skips empty sections', () => {
      const body = formatOverlayBody(
        makeOverlayData({
          validated_patterns: ['Auth middleware verified secure in Issue #3.'],
        })
      );

      expect(body.trim()).toBe(
        '## Validated Patterns\n- Auth middleware verified secure in Issue #3.'
      );
      expect(body).not.toContain('## Project Values');
      expect(body).not.toContain('## Known False Positives');
      expect(body).not.toContain('## Recurring Issues');
    });
  });
});
