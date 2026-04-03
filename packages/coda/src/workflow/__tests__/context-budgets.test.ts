import { describe, test, expect } from 'bun:test';
import {
  assembleWithinBudget,
  estimateTokens,
  PHASE_BUDGETS,
} from '../context-budgets';
import type { ContextSection } from '../context-budgets';

function makeSection(
  label: string,
  priority: ContextSection['priority'],
  tokens: number,
  content?: string
): ContextSection {
  return {
    label,
    content: content ?? `Content for ${label}`,
    priority,
    estimatedTokens: tokens,
  };
}

describe('Context Budget Management', () => {
  describe('estimateTokens', () => {
    test('estimates chars/4 with ceiling', () => {
      expect(estimateTokens('hello')).toBe(2); // 5/4 = 1.25 → 2
      expect(estimateTokens('a'.repeat(400))).toBe(100);
      expect(estimateTokens('a'.repeat(401))).toBe(101);
    });

    test('empty string returns 0', () => {
      expect(estimateTokens('')).toBe(0);
    });
  });

  describe('assembleWithinBudget', () => {
    test('required sections always included even over budget', () => {
      const sections = [
        makeSection('required-big', 'required', 5000, 'Big required content'),
      ];
      const result = assembleWithinBudget(sections, 1000);
      expect(result.content).toContain('Big required content');
      expect(result.usedTokens).toBe(5000);
      expect(result.includedCount).toBe(1);
      expect(result.excludedCount).toBe(0);
    });

    test('priority ordering: required + high included, medium/low omitted when tight', () => {
      const sections = [
        makeSection('req', 'required', 100),
        makeSection('high-1', 'high', 200),
        makeSection('med-1', 'medium', 300),
        makeSection('low-1', 'low', 200),
      ];
      // Budget: 350 → required (100) + high (200) = 300, medium (300) would push to 600
      const result = assembleWithinBudget(sections, 350);
      expect(result.includedLabels).toContain('req');
      expect(result.includedLabels).toContain('high-1');
      expect(result.excludedLabels).toContain('med-1');
      expect(result.excludedLabels).toContain('low-1');
      expect(result.includedCount).toBe(2);
      expect(result.excludedCount).toBe(2);
    });

    test('no mid-section truncation: high section excluded whole if it would overflow', () => {
      const sections = [
        makeSection('req', 'required', 100),
        makeSection('small-high', 'high', 50),
        makeSection('big-high', 'high', 500),
      ];
      // Budget: 200 → required(100) + small(50) = 150, big(500) would push to 650
      const result = assembleWithinBudget(sections, 200);
      expect(result.includedLabels).toEqual(['req', 'small-high']);
      expect(result.excludedLabels).toEqual(['big-high']);
      // big-high content NOT in result (not truncated)
      expect(result.content).not.toContain('Content for big-high');
    });

    test('empty sections returns empty result', () => {
      const result = assembleWithinBudget([], 4000);
      expect(result.content).toBe('');
      expect(result.usedTokens).toBe(0);
      expect(result.includedCount).toBe(0);
      expect(result.excludedCount).toBe(0);
      expect(result.includedLabels).toEqual([]);
      expect(result.excludedLabels).toEqual([]);
    });

    test('all sections fit when budget is generous', () => {
      const sections = [
        makeSection('req', 'required', 100),
        makeSection('high-1', 'high', 200),
        makeSection('med-1', 'medium', 300),
        makeSection('low-1', 'low', 100),
      ];
      const result = assembleWithinBudget(sections, 10000);
      expect(result.includedCount).toBe(4);
      expect(result.excludedCount).toBe(0);
      expect(result.usedTokens).toBe(700);
    });

    test('BudgetResult metadata is correct', () => {
      const sections = [
        makeSection('a-req', 'required', 100),
        makeSection('b-high', 'high', 200),
        makeSection('c-low', 'low', 500),
      ];
      const result = assembleWithinBudget(sections, 350);
      expect(result.includedLabels).toEqual(['a-req', 'b-high']);
      expect(result.excludedLabels).toEqual(['c-low']);
      expect(result.usedTokens).toBe(300);
      expect(result.includedCount).toBe(2);
      expect(result.excludedCount).toBe(1);
    });

    test('same-priority sections preserve original order', () => {
      const sections = [
        makeSection('high-B', 'high', 100, 'B content'),
        makeSection('high-A', 'high', 100, 'A content'),
        makeSection('high-C', 'high', 100, 'C content'),
      ];
      const result = assembleWithinBudget(sections, 10000);
      expect(result.includedLabels).toEqual(['high-B', 'high-A', 'high-C']);
      // Content order matches label order
      const bIdx = result.content.indexOf('B content');
      const aIdx = result.content.indexOf('A content');
      const cIdx = result.content.indexOf('C content');
      expect(bIdx).toBeLessThan(aIdx);
      expect(aIdx).toBeLessThan(cIdx);
    });

    test('required sections included before high even if listed after', () => {
      const sections = [
        makeSection('high-first', 'high', 100),
        makeSection('req-second', 'required', 100),
      ];
      const result = assembleWithinBudget(sections, 10000);
      // Required sorts first
      expect(result.includedLabels[0]).toBe('req-second');
      expect(result.includedLabels[1]).toBe('high-first');
    });
  });

  describe('PHASE_BUDGETS', () => {
    test('has all 6 lifecycle phases with expected values', () => {
      expect(PHASE_BUDGETS['specify']).toBe(4000);
      expect(PHASE_BUDGETS['plan']).toBe(6000);
      expect(PHASE_BUDGETS['review']).toBe(4000);
      expect(PHASE_BUDGETS['build']).toBe(4000);
      expect(PHASE_BUDGETS['verify']).toBe(6000);
      expect(PHASE_BUDGETS['unify']).toBe(8000);
      expect(Object.keys(PHASE_BUDGETS).length).toBe(6);
    });
  });
});
