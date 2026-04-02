/**
 * @module tools/sort-utils
 * Deterministic filename sorting helpers for CODA record conventions.
 */

function extractNumericSuffix(filename: string): number {
  const match = filename.match(/(\d+)\.\w+$/);
  return match ? Number.parseInt(match[1]!, 10) : 0;
}

/** Sort filenames by trailing numeric suffix in ascending order without mutating the input. */
export function sortByNumericSuffix(files: string[]): string[] {
  return [...files].sort((a, b) => extractNumericSuffix(a) - extractNumericSuffix(b));
}
