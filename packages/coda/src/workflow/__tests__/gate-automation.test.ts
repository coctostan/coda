import { describe, test, expect } from 'bun:test';
import {
  resolveGateMode,
  shouldRequireHuman,
  DEFAULT_GATE_MODES,
} from '../gate-automation';
import type { CodaConfig } from '../../forge/types';
import { getDefaultConfig } from '../../forge/scaffold';

/** Build a minimal CodaConfig with optional gate overrides. */
function makeConfig(overrides: Partial<CodaConfig> = {}): CodaConfig {
  return { ...getDefaultConfig(), ...overrides };
}

describe('resolveGateMode', () => {
  test('returns hardcoded default when config has no gates or overrides', () => {
    const config = makeConfig();
    // Remove gates field to test fallback (getDefaultConfig will have it after D3)
    delete (config as unknown as Record<string, unknown>)['gates'];
    delete (config as unknown as Record<string, unknown>)['gate_overrides'];
    // Also remove human_review_default to prevent backward-compat path
    delete (config as unknown as Record<string, unknown>)['human_review_default'];

    expect(resolveGateMode('plan_review', 'feature', config)).toBe('human');
    expect(resolveGateMode('build_review', 'feature', config)).toBe('auto-unless-block');
    expect(resolveGateMode('unify_review', 'feature', config)).toBe('human');
  });

  test('returns project default when gates field is set', () => {
    const config = makeConfig({
      gates: {
        plan_review: 'auto',
        build_review: 'human',
        unify_review: 'auto',
      },
    });

    expect(resolveGateMode('plan_review', 'feature', config)).toBe('auto');
    expect(resolveGateMode('build_review', 'feature', config)).toBe('human');
    expect(resolveGateMode('unify_review', 'feature', config)).toBe('auto');
  });

  test('returns issue-type override when set', () => {
    const config = makeConfig({
      gates: {
        plan_review: 'human',
        build_review: 'auto-unless-block',
        unify_review: 'human',
      },
      gate_overrides: {
        chore: { plan_review: 'auto', unify_review: 'auto' },
      },
    });

    expect(resolveGateMode('plan_review', 'chore', config)).toBe('auto');
    expect(resolveGateMode('unify_review', 'chore', config)).toBe('auto');
    // build_review not overridden for chore — falls back to project default
    expect(resolveGateMode('build_review', 'chore', config)).toBe('auto-unless-block');
  });

  test('override wins over project default', () => {
    const config = makeConfig({
      gates: {
        plan_review: 'human',
        build_review: 'auto-unless-block',
        unify_review: 'human',
      },
      gate_overrides: {
        feature: { plan_review: 'auto' },
      },
    });

    // Override wins
    expect(resolveGateMode('plan_review', 'feature', config)).toBe('auto');
    // No override — project default
    expect(resolveGateMode('build_review', 'feature', config)).toBe('auto-unless-block');
  });

  test('derives plan_review from human_review_default when gates absent (backward compat)', () => {
    const config = makeConfig();
    delete (config as unknown as Record<string, unknown>)['gates'];
    delete (config as unknown as Record<string, unknown>)['gate_overrides'];
    // human_review_default: feature=true, refactor=false (from getDefaultConfig)

    expect(resolveGateMode('plan_review', 'feature', config)).toBe('human');
    expect(resolveGateMode('plan_review', 'refactor', config)).toBe('auto');
  });

  test('gates wins over human_review_default when both present', () => {
    const config = makeConfig({
      gates: {
        plan_review: 'auto',
        build_review: 'auto-unless-block',
        unify_review: 'human',
      },
      // human_review_default has feature=true, which would say 'human'
      // but gates says 'auto' — gates should win
    });

    expect(resolveGateMode('plan_review', 'feature', config)).toBe('auto');
  });
});

describe('shouldRequireHuman', () => {
  test('human mode always returns true', () => {
    expect(shouldRequireHuman('human', false)).toBe(true);
    expect(shouldRequireHuman('human', true)).toBe(true);
  });

  test('auto mode always returns false', () => {
    expect(shouldRequireHuman('auto', false)).toBe(false);
    expect(shouldRequireHuman('auto', true)).toBe(false);
  });

  test('auto-unless-block returns false with no blocking findings', () => {
    expect(shouldRequireHuman('auto-unless-block', false)).toBe(false);
  });

  test('auto-unless-block returns true with blocking findings', () => {
    expect(shouldRequireHuman('auto-unless-block', true)).toBe(true);
  });
});

describe('DEFAULT_GATE_MODES', () => {
  test('has correct hardcoded defaults', () => {
    expect(DEFAULT_GATE_MODES.plan_review).toBe('human');
    expect(DEFAULT_GATE_MODES.build_review).toBe('auto-unless-block');
    expect(DEFAULT_GATE_MODES.unify_review).toBe('human');
  });
});
