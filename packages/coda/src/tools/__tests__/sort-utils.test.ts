import { describe, expect, test } from 'bun:test';
import { sortByNumericSuffix } from '../sort-utils';

describe('sortByNumericSuffix', () => {
  test('sorts plan filenames by numeric suffix instead of lexicographic order', () => {
    expect(sortByNumericSuffix(['plan-v10.md', 'plan-v2.md', 'plan-v1.md'])).toEqual([
      'plan-v1.md',
      'plan-v2.md',
      'plan-v10.md',
    ]);
  });

  test('returns a new array without mutating the input', () => {
    const files = ['plan-v3.md', 'plan-v12.md', 'plan-v2.md'];

    const sorted = sortByNumericSuffix(files);

    expect(sorted).toEqual(['plan-v2.md', 'plan-v3.md', 'plan-v12.md']);
    expect(files).toEqual(['plan-v3.md', 'plan-v12.md', 'plan-v2.md']);
  });
});
