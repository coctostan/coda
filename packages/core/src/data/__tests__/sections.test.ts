import { describe, test, expect } from 'bun:test';
import { getSection, appendSection, replaceSection, getSectionsByTopics, getSectionHeadings } from '../sections';

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

const topicBody = `## Overview

This is the project overview.

## Authentication

Auth middleware handles JWT tokens.

## Auth Middleware

Middleware for route protection.

## Data Model

Database schemas and relations.

## api endpoints

REST endpoints for the service.
`;

describe('getSectionsByTopics', () => {
  test('topic "auth" matches "Authentication" and "Auth Middleware" but not "Data Model"', () => {
    const result = getSectionsByTopics(topicBody, ['auth']);
    const headings = result.map((s) => s.heading);
    expect(headings).toContain('Overview');
    expect(headings).toContain('Authentication');
    expect(headings).toContain('Auth Middleware');
    expect(headings).not.toContain('Data Model');
    expect(headings).not.toContain('api endpoints');
  });

  test('multiple topics ["auth", "api"] match sections for either', () => {
    const result = getSectionsByTopics(topicBody, ['auth', 'api']);
    const headings = result.map((s) => s.heading);
    expect(headings).toContain('Overview');
    expect(headings).toContain('Authentication');
    expect(headings).toContain('Auth Middleware');
    expect(headings).toContain('api endpoints');
    expect(headings).not.toContain('Data Model');
  });

  test('"## Overview" is always included regardless of topics', () => {
    const result = getSectionsByTopics(topicBody, ['data']);
    const headings = result.map((s) => s.heading);
    expect(headings).toContain('Overview');
    expect(headings).toContain('Data Model');
    expect(headings).not.toContain('Authentication');
  });

  test('empty topics returns all sections', () => {
    const result = getSectionsByTopics(topicBody, []);
    expect(result.length).toBe(5);
    expect(result[0]?.heading).toBe('Overview');
    expect(result[4]?.heading).toBe('api endpoints');
  });

  test('no matching sections returns only Overview', () => {
    const result = getSectionsByTopics(topicBody, ['zzz-nonexistent']);
    expect(result.length).toBe(1);
    expect(result[0]?.heading).toBe('Overview');
  });

  test('case insensitivity: topic "API" matches "## api endpoints"', () => {
    const result = getSectionsByTopics(topicBody, ['API']);
    const headings = result.map((s) => s.heading);
    expect(headings).toContain('api endpoints');
    expect(headings).toContain('Overview');
  });

  test('body with no sections returns empty array', () => {
    const result = getSectionsByTopics('Just plain text.', ['auth']);
    expect(result).toEqual([]);
  });

  test('topics with no Overview section returns only matching sections', () => {
    const noOverview = `## Authentication

Auth content.

## Data Model

Data content.
`;
    const result = getSectionsByTopics(noOverview, ['auth']);
    expect(result.length).toBe(1);
    expect(result[0]?.heading).toBe('Authentication');
  });

  test('returns correct content for matched sections', () => {
    const result = getSectionsByTopics(topicBody, ['data']);
    const dataSection = result.find((s) => s.heading === 'Data Model');
    expect(dataSection?.content).toBe('Database schemas and relations.');
  });
});

describe('getSectionHeadings', () => {
  test('returns all heading names in document order', () => {
    const result = getSectionHeadings(topicBody);
    expect(result).toEqual(['Overview', 'Authentication', 'Auth Middleware', 'Data Model', 'api endpoints']);
  });

  test('empty body returns empty array', () => {
    const result = getSectionHeadings('');
    expect(result).toEqual([]);
  });

  test('body with no ## headings returns empty array', () => {
    const result = getSectionHeadings('Just plain text without any headings.');
    expect(result).toEqual([]);
  });
});