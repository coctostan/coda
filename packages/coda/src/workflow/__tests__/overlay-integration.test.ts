/**
 * Integration tests for module overlay infrastructure.
 *
 * Verifies that overlays are threaded through the dispatcher,
 * module-integration layer, and workflow instructions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRegistry, createDispatcher } from '@coda/core';
import type { RegistryConfig, HookContext } from '@coda/core';
import { getModulePromptForHook } from '../module-integration';
import { assembleUnifyContext } from '../unify-runner';
import { assembleSynthesizeContext } from '../../forge/brownfield';
import { writeEvidence } from '../../forge/evidence';

describe('overlay integration', () => {
  let tmpDir: string;
  let codaRoot: string;
  let promptsDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'coda-overlay-int-'));
    codaRoot = join(tmpDir, '.coda');
    mkdirSync(join(codaRoot, 'modules'), { recursive: true });
    mkdirSync(join(codaRoot, 'issues'), { recursive: true });
    mkdirSync(join(codaRoot, 'reference'), { recursive: true });

    // Create a minimal prompts directory with a test prompt
    promptsDir = join(tmpDir, 'prompts');
    mkdirSync(join(promptsDir, 'security'), { recursive: true });
    writeFileSync(
      join(promptsDir, 'security', 'pre-plan.md'),
      '# Security Pre-Plan\nCheck for security issues.'
    );
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('dispatcher with codaRoot', () => {
    it('uses merged prompt when codaRoot is provided and overlay exists', () => {
      // Create an overlay file
      writeFileSync(
        join(codaRoot, 'modules', 'security.local.md'),
        [
          '---',
          'module: security',
          'last_updated: 2026-04-03T10:00:00Z',
          'updated_by: forge',
          '---',
          '',
          '## Project Values',
          '- All endpoints require JWT auth.',
        ].join('\n')
      );

      const config: RegistryConfig = {};
      const registry = createRegistry(config, promptsDir);
      const dispatcher = createDispatcher(registry, codaRoot);

      const context: HookContext = {
        issueSlug: 'test-issue',
        phase: 'plan',
        submode: null,
      };

      const result = dispatcher.assemblePrompts('pre-plan', context);
      expect(result).toContain('# Security Pre-Plan');
      expect(result).toContain('## Project-Specific Context');
      expect(result).toContain('All endpoints require JWT auth.');
    });

    it('uses default prompt when codaRoot is not provided', () => {
      const config: RegistryConfig = {};
      const registry = createRegistry(config, promptsDir);
      const dispatcher = createDispatcher(registry);

      const context: HookContext = {
        issueSlug: 'test-issue',
        phase: 'plan',
        submode: null,
      };

      const result = dispatcher.assemblePrompts('pre-plan', context);
      expect(result).toContain('# Security Pre-Plan');
      expect(result).not.toContain('## Project-Specific Context');
    });
  });

  describe('getModulePromptForHook with overlay', () => {
    it('threads codaRoot to dispatcher for overlay merge', () => {
      // Create overlay
      writeFileSync(
        join(codaRoot, 'modules', 'security.local.md'),
        [
          '---',
          'module: security',
          'last_updated: 2026-04-03T10:00:00Z',
          'updated_by: unify',
          '---',
          '',
          '## Validated Patterns',
          '- Input validation uses Zod schema for all API endpoints.',
        ].join('\n')
      );

      const result = getModulePromptForHook('pre-plan', 'test-issue', 'plan', {
        codaRoot,
        promptsDir,
      });

      expect(result).toContain('# Security Pre-Plan');
      expect(result).toContain('## Project-Specific Context');
      expect(result).toContain('Input validation uses Zod schema');
    });
  });

  describe('UNIFY overlay compounding instruction', () => {
    it('includes overlay compounding instruction in UNIFY prompt', () => {
      // Create minimal issue for UNIFY
      mkdirSync(join(codaRoot, 'issues', 'test-issue'), { recursive: true });
      writeFileSync(
        join(codaRoot, 'issues', 'test-issue', 'issue.md'),
        [
          '---',
          'title: Test Issue',
          'type: feature',
          'status: unify',
          'topics:',
          '  - security',
          '---',
          '',
          '## Description',
          'A test issue.',
        ].join('\n')
      );

      const ctx = assembleUnifyContext(codaRoot, 'test-issue');
      expect(ctx.systemPrompt).toContain('ACTION 3b: Update Module Overlays');
      expect(ctx.systemPrompt).toContain('.coda/modules/{module}.local.md');
      expect(ctx.systemPrompt).toContain('## Project Values');
      expect(ctx.systemPrompt).toContain('## Validated Patterns');
    });
  });

  describe('brownfield synthesize overlay seeding', () => {
    it('includes overlay seeding instructions in synthesize context', () => {
      // Write a minimal evidence file
      mkdirSync(join(codaRoot, 'forge', 'initial', 'onboarding'), { recursive: true });
      writeEvidence(codaRoot, 'security', { module: 'security', scanned_at: new Date().toISOString(), files_read: [], commands_run: [] }, 'Found auth middleware patterns.');

      const ctx = assembleSynthesizeContext(codaRoot);
      expect(ctx.overlayInstructions).toContain('Module Overlay Seeding');
      expect(ctx.overlayInstructions).toContain('.coda/modules/security.local.md');
      expect(ctx.overlayInstructions).toContain('## Project Values');
    });
  });
});
