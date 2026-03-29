import { describe, expect, test } from 'bun:test';
import {
  TODD_PROMPT,
  TODD_HOOK_POINTS,
  WALT_PROMPT,
  WALT_HOOK_POINTS,
  getModulePrompts,
} from '../index';

describe('Module Prompts', () => {
  describe('Todd — TDD Enforcement', () => {
    test('TODD_PROMPT is a non-empty string containing "RED-GREEN"', () => {
      expect(typeof TODD_PROMPT).toBe('string');
      expect(TODD_PROMPT.length).toBeGreaterThan(0);
      expect(TODD_PROMPT).toContain('RED-GREEN');
    });

    test('TODD_PROMPT contains "write-gate" and "Anti-Patterns"', () => {
      expect(TODD_PROMPT).toContain('write-gate');
      expect(TODD_PROMPT).toContain('Anti-Patterns');
    });

    test('TODD_HOOK_POINTS includes "pre-build"', () => {
      expect(TODD_HOOK_POINTS).toContain('pre-build');
    });
  });

  describe('Walt — Quality Check', () => {
    test('WALT_PROMPT is a non-empty string containing "Quality Check"', () => {
      expect(typeof WALT_PROMPT).toBe('string');
      expect(WALT_PROMPT.length).toBeGreaterThan(0);
      expect(WALT_PROMPT).toContain('Quality Check');
    });

    test('WALT_PROMPT contains "Regression Rules"', () => {
      expect(WALT_PROMPT).toContain('Regression Rules');
    });

    test('WALT_HOOK_POINTS includes "post-task" and "post-build"', () => {
      expect(WALT_HOOK_POINTS).toContain('post-task');
      expect(WALT_HOOK_POINTS).toContain('post-build');
    });
  });

  describe('getModulePrompts — Hook-Point Routing', () => {
    test('pre-build returns array containing Todd prompt', () => {
      const prompts = getModulePrompts('pre-build');
      expect(prompts).toBeArray();
      expect(prompts.length).toBe(1);
      expect(prompts[0]).toBe(TODD_PROMPT);
    });

    test('post-task returns array containing Walt prompt', () => {
      const prompts = getModulePrompts('post-task');
      expect(prompts).toBeArray();
      expect(prompts.length).toBe(1);
      expect(prompts[0]).toBe(WALT_PROMPT);
    });

    test('post-build returns array containing Walt prompt', () => {
      const prompts = getModulePrompts('post-build');
      expect(prompts).toBeArray();
      expect(prompts.length).toBe(1);
      expect(prompts[0]).toBe(WALT_PROMPT);
    });

    test('pre-plan returns empty array', () => {
      const prompts = getModulePrompts('pre-plan');
      expect(prompts).toBeArray();
      expect(prompts.length).toBe(0);
    });

    test('unknown hook point returns empty array', () => {
      const prompts = getModulePrompts('nonexistent');
      expect(prompts).toBeArray();
      expect(prompts.length).toBe(0);
    });
  });
});
