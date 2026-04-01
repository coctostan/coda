import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODULE_DEFINITIONS } from '../registry';

/**
 * Resolve the monorepo root from this test file's location.
 * Test is at: packages/core/src/modules/__tests__/prompts.test.ts
 * Root is 5 levels up.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..', '..', '..');
const promptsDir = join(repoRoot, 'modules', 'prompts');

/**
 * Collect all prompt file entries from MODULE_DEFINITIONS.
 * Each entry: { moduleName, domain, hookPoint, promptFile }
 */
const promptEntries = Object.entries(MODULE_DEFINITIONS).flatMap(
  ([name, def]) =>
    def.hooks.map((hook) => ({
      moduleName: name,
      domain: def.domain,
      hookPoint: hook.hookPoint,
      promptFile: hook.promptFile,
    }))
);

describe('Module Prompts', () => {
  describe('prompt files exist and are non-empty', () => {
    for (const entry of promptEntries) {
      test(`${entry.promptFile} exists and is non-empty`, () => {
        const filePath = join(promptsDir, entry.promptFile);
        const content = readFileSync(filePath, 'utf-8');
        expect(content.length).toBeGreaterThan(0);
      });
    }
  });

  describe('prompt files contain the module name', () => {
    for (const entry of promptEntries) {
      test(`${entry.promptFile} contains module name or domain`, () => {
        const filePath = join(promptsDir, entry.promptFile);
        const content = readFileSync(filePath, 'utf-8').toLowerCase();
        const hasName = content.includes(entry.moduleName.toLowerCase());
        const hasDomain = content.includes(entry.domain.toLowerCase());
        expect(hasName || hasDomain).toBe(true);
      });
    }
  });

  describe('prompt files contain "What to Check" section', () => {
    for (const entry of promptEntries) {
      test(`${entry.promptFile} has "What to Check" section`, () => {
        const filePath = join(promptsDir, entry.promptFile);
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('What to Check');
      });
    }
  });

  describe('prompt files contain "Severity Guide" section', () => {
    for (const entry of promptEntries) {
      test(`${entry.promptFile} has "Severity Guide" section`, () => {
        const filePath = join(promptsDir, entry.promptFile);
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('Severity Guide');
      });
    }
  });

  describe('MODULE_DEFINITIONS hooks match existing prompt files', () => {
    for (const [name, def] of Object.entries(MODULE_DEFINITIONS)) {
      for (const hook of def.hooks) {
        test(`${name}/${hook.hookPoint} → ${hook.promptFile} is readable`, () => {
          const filePath = join(promptsDir, hook.promptFile);
          // readFileSync will throw if file doesn't exist
          const content = readFileSync(filePath, 'utf-8');
          expect(content.length).toBeGreaterThan(0);
        });
      }
    }
  });
});
