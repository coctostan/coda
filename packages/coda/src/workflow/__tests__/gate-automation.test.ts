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
    delete (config as unknown as Record<string, unknown>)['gates'];
    delete (config as unknown as Record<string, unknown>)['gate_overrides'];
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

  test('legacy human_review_default is no longer consulted after migration', () => {
    // Post-Phase-55: migration happens in loadCodaConfig (on disk read).
    // If a config somehow still has `human_review_default` in memory after
    // migration, resolveGateMode MUST ignore it and fall back to the hardcoded
    // default (the legacy backward-compat branch has been removed).
    const config = makeConfig();
    delete (config as unknown as Record<string, unknown>)['gates'];
    delete (config as unknown as Record<string, unknown>)['gate_overrides'];
    (config as unknown as Record<string, unknown>)['human_review_default'] = {
      feature: true, bugfix: true, refactor: false, chore: false, docs: false,
    };

    // Hardcoded default, not derived from the legacy field.
    expect(resolveGateMode('plan_review', 'feature', config)).toBe('human');
    expect(resolveGateMode('plan_review', 'refactor', config)).toBe('human');
  });

  test('gates is the sole source of truth (no legacy fallback)', () => {
    const config = makeConfig({
      gates: {
        plan_review: 'auto',
        build_review: 'auto-unless-block',
        unify_review: 'human',
      },
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
