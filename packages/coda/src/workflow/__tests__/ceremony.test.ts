import { describe, test, expect } from 'bun:test';
import { getCeremonyRules, CEREMONY_DEFAULTS } from '../ceremony';
import type { CeremonyRules } from '../ceremony';

describe('Adaptive Ceremony Rules', () => {
  test('feature gets full ceremony — all enabled', () => {
    const rules = getCeremonyRules('feature');
    expect(rules.reviewEnabled).toBe(true);
    expect(rules.reviewMaxIterations).toBe(3);
    expect(rules.humanReviewDefault).toBe(true);
    expect(rules.tddEnabled).toBe(true);
    expect(rules.verifyEnabled).toBe(true);
    expect(rules.verifyMaxIterations).toBe(3);
    expect(rules.unifyFull).toBe(true);
    expect(rules.modulesEnabled).toBe(true);
    expect(rules.specDeltaRequired).toBe(true);
  });

  test('bugfix defaults — full ceremony with shorter verify', () => {
    const rules = getCeremonyRules('bugfix');
    expect(rules.reviewEnabled).toBe(true);
    expect(rules.reviewMaxIterations).toBe(3);
    expect(rules.humanReviewDefault).toBe(true);
    expect(rules.tddEnabled).toBe(true);
    expect(rules.verifyEnabled).toBe(true);
    expect(rules.verifyMaxIterations).toBe(2);
    expect(rules.unifyFull).toBe(true);
    expect(rules.modulesEnabled).toBe(true);
    expect(rules.specDeltaRequired).toBe(true);
  });

  test('refactor — lighter review, no human review, lightweight unify', () => {
    const rules = getCeremonyRules('refactor');
    expect(rules.reviewEnabled).toBe(true);
    expect(rules.reviewMaxIterations).toBe(1);
    expect(rules.humanReviewDefault).toBe(false);
    expect(rules.tddEnabled).toBe(true);
    expect(rules.verifyEnabled).toBe(true);
    expect(rules.verifyMaxIterations).toBe(2);
    expect(rules.unifyFull).toBe(false);
    expect(rules.modulesEnabled).toBe(true);
    expect(rules.specDeltaRequired).toBe(true);
  });

  test('chore skips review, TDD, modules', () => {
    const rules = getCeremonyRules('chore');
    expect(rules.reviewEnabled).toBe(false);
    expect(rules.reviewMaxIterations).toBe(0);
    expect(rules.humanReviewDefault).toBe(false);
    expect(rules.tddEnabled).toBe(false);
    expect(rules.verifyEnabled).toBe(true);
    expect(rules.verifyMaxIterations).toBe(1);
    expect(rules.unifyFull).toBe(false);
    expect(rules.modulesEnabled).toBe(false);
    expect(rules.specDeltaRequired).toBe(false);
  });

  test('docs skips review, TDD, verify, modules', () => {
    const rules = getCeremonyRules('docs');
    expect(rules.reviewEnabled).toBe(false);
    expect(rules.reviewMaxIterations).toBe(0);
    expect(rules.humanReviewDefault).toBe(false);
    expect(rules.tddEnabled).toBe(false);
    expect(rules.verifyEnabled).toBe(false);
    expect(rules.verifyMaxIterations).toBe(0);
    expect(rules.unifyFull).toBe(false);
    expect(rules.modulesEnabled).toBe(false);
    expect(rules.specDeltaRequired).toBe(false);
  });

  test('config override merges with defaults', () => {
    const rules = getCeremonyRules('bugfix', { humanReviewDefault: false });
    // Overridden field
    expect(rules.humanReviewDefault).toBe(false);
    // All other bugfix defaults preserved
    expect(rules.reviewEnabled).toBe(true);
    expect(rules.reviewMaxIterations).toBe(3);
    expect(rules.tddEnabled).toBe(true);
    expect(rules.verifyEnabled).toBe(true);
    expect(rules.verifyMaxIterations).toBe(2);
    expect(rules.unifyFull).toBe(true);
    expect(rules.modulesEnabled).toBe(true);
    expect(rules.specDeltaRequired).toBe(true);
  });

  test('unknown issue type falls back to feature defaults', () => {
    const rules = getCeremonyRules('epic');
    const featureRules = getCeremonyRules('feature');
    expect(rules).toEqual(featureRules);
  });

  test('CEREMONY_DEFAULTS has all 5 issue types', () => {
    const expectedTypes = ['feature', 'bugfix', 'refactor', 'chore', 'docs'];
    for (const type of expectedTypes) {
      expect(CEREMONY_DEFAULTS[type]).toBeDefined();
    }
    expect(Object.keys(CEREMONY_DEFAULTS).length).toBe(5);
  });

  test('getCeremonyRules without overrides returns a copy (not the original)', () => {
    const rules1 = getCeremonyRules('feature');
    const rules2 = getCeremonyRules('feature');
    expect(rules1).toEqual(rules2);
    expect(rules1).not.toBe(rules2); // Different object references
  });
});
