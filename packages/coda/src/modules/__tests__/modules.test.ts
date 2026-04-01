import { describe, expect, test } from 'bun:test';
import {
  createModuleSystem,
  buildHookContext,
  getModulePromptForHook,
} from '../index';

describe('Module Re-exports (v0.3)', () => {
  test('createModuleSystem is re-exported from modules barrel', () => {
    expect(typeof createModuleSystem).toBe('function');
  });

  test('buildHookContext is re-exported from modules barrel', () => {
    expect(typeof buildHookContext).toBe('function');
  });

  test('getModulePromptForHook is re-exported from modules barrel', () => {
    expect(typeof getModulePromptForHook).toBe('function');
  });
});
