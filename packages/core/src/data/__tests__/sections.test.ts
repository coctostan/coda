import { describe, test, expect } from 'bun:test';
import { getSection, appendSection, replaceSection } from '../sections';

const sampleBody = `## Description

This is the description of the issue.
It has multiple lines.

## Acceptance Criteria

- AC-1: Users can log in
- AC-2: Users can log out

## Notes

Some developer notes here.
`;

describe('getSection', () => {
  test('finds a section by heading and returns its content', () => {
    const result = getSection(sampleBody, 'Description');
    expect(result).toBe('This is the description of the issue.\nIt has multiple lines.');
  });

  test('finds a middle section', () => {
    const result = getSection(sampleBody, 'Acceptance Criteria');
    expect(result).toBe('- AC-1: Users can log in\n- AC-2: Users can log out');
  });

  test('finds the last section (no trailing ##)', () => {
    const result = getSection(sampleBody, 'Notes');
    expect(result).toBe('Some developer notes here.');
  });

  test('returns null for non-existent heading', () => {
    const result = getSection(sampleBody, 'Nonexistent');
    expect(result).toBeNull();
  });

  test('handles heading with no content (empty section)', () => {
    const body = `## Filled

Content here.

## Empty

## After Empty

After content.
`;
    const result = getSection(body, 'Empty');
    expect(result).toBe('');
  });

  test('handles body with no sections', () => {
    const result = getSection('Just plain text without headings.', 'Anything');
    expect(result).toBeNull();
  });

  test('is case-sensitive for heading names', () => {
    const result = getSection(sampleBody, 'description');
    expect(result).toBeNull();
  });
});

describe('appendSection', () => {
  test('adds a new section at the end of the body', () => {
    const result = appendSection(sampleBody, 'New Section', 'New content here.');
    expect(result).toContain('## New Section');
    expect(result).toContain('New content here.');
    // Ends with the new section
    expect(result.trim().endsWith('New content here.')).toBe(true);
  });

  test('does not modify existing sections', () => {
    const result = appendSection(sampleBody, 'Extra', 'Extra stuff.');
    // Original sections still present
    expect(getSection(result, 'Description')).toBe(
      'This is the description of the issue.\nIt has multiple lines.'
    );
    expect(getSection(result, 'Acceptance Criteria')).toBe(
      '- AC-1: Users can log in\n- AC-2: Users can log out'
    );
    expect(getSection(result, 'Notes')).toBe('Some developer notes here.');
    // New section present
    expect(getSection(result, 'Extra')).toBe('Extra stuff.');
  });

  test('works on empty body', () => {
    const result = appendSection('', 'First Section', 'First content.');
    expect(result).toContain('## First Section');
    expect(getSection(result, 'First Section')).toBe('First content.');
  });
});

describe('replaceSection', () => {
  test('replaces only the target section content', () => {
    const result = replaceSection(sampleBody, 'Acceptance Criteria', '- AC-1: Updated criteria');

    expect(getSection(result, 'Acceptance Criteria')).toBe('- AC-1: Updated criteria');
  });

  test('preserves all other sections', () => {
    const result = replaceSection(sampleBody, 'Acceptance Criteria', 'Replaced.');

    expect(getSection(result, 'Description')).toBe(
      'This is the description of the issue.\nIt has multiple lines.'
    );
    expect(getSection(result, 'Notes')).toBe('Some developer notes here.');
  });

  test('replaces the last section correctly', () => {
    const result = replaceSection(sampleBody, 'Notes', 'Updated notes.');
    expect(getSection(result, 'Notes')).toBe('Updated notes.');
    // Other sections unchanged
    expect(getSection(result, 'Description')).toBe(
      'This is the description of the issue.\nIt has multiple lines.'
    );
  });

  test('appends section if heading not found', () => {
    const result = replaceSection(sampleBody, 'Brand New', 'New content.');
    expect(getSection(result, 'Brand New')).toBe('New content.');
    // Original sections still intact
    expect(getSection(result, 'Description')).not.toBeNull();
  });
});
