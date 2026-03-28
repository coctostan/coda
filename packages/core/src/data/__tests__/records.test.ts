import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { readRecord, writeRecord, updateFrontmatter } from '../records';
import type { IssueRecord, ReferenceDoc } from '../types';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'coda-records-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('readRecord', () => {
  test('reads a file with YAML frontmatter and returns typed frontmatter + body', () => {
    const filePath = join(tempDir, 'test-issue.md');
    const content = `---
title: Test Issue
issue_type: feature
status: proposed
phase: specify
priority: 3
topics:
  - testing
  - core
acceptance_criteria: []
open_questions: []
deferred_items: []
human_review: false
---

## Description

This is the body of the issue.

## Notes

Some notes here.
`;
    writeFileSync(filePath, content, 'utf-8');

    const result = readRecord<IssueRecord>(filePath);

    expect(result.frontmatter.title).toBe('Test Issue');
    expect(result.frontmatter.issue_type).toBe('feature');
    expect(result.frontmatter.status).toBe('proposed');
    expect(result.frontmatter.phase).toBe('specify');
    expect(result.frontmatter.priority).toBe(3);
    expect(result.frontmatter.topics).toEqual(['testing', 'core']);
    expect(result.frontmatter.acceptance_criteria).toEqual([]);
    expect(result.frontmatter.human_review).toBe(false);
    expect(result.body).toContain('## Description');
    expect(result.body).toContain('This is the body of the issue.');
    expect(result.body).toContain('## Notes');
  });

  test('reads a file with empty body', () => {
    const filePath = join(tempDir, 'empty-body.md');
    const content = `---
title: Minimal
category: system
topics: []
---
`;
    writeFileSync(filePath, content, 'utf-8');

    const result = readRecord<ReferenceDoc>(filePath);

    expect(result.frontmatter.title).toBe('Minimal');
    expect(result.frontmatter.category).toBe('system');
    expect(result.body.trim()).toBe('');
  });

  test('throws an error for missing file', () => {
    const filePath = join(tempDir, 'nonexistent.md');

    expect(() => readRecord<IssueRecord>(filePath)).toThrow();
  });

  test('handles frontmatter with nested objects', () => {
    const filePath = join(tempDir, 'nested.md');
    const content = `---
title: Nested Test
issue_type: feature
status: active
phase: build
priority: 1
topics: []
acceptance_criteria:
  - id: AC-1
    text: First criterion
    status: pending
  - id: AC-2
    text: Second criterion
    status: met
open_questions:
  - How should errors be handled?
deferred_items: []
human_review: true
spec_delta:
  added:
    - new requirement
  modified: []
  removed: []
  delta_summary: Added new requirement
---

Body content here.
`;
    writeFileSync(filePath, content, 'utf-8');

    const result = readRecord<IssueRecord>(filePath);

    expect(result.frontmatter.acceptance_criteria).toHaveLength(2);
    expect(result.frontmatter.acceptance_criteria[0]?.id).toBe('AC-1');
    expect(result.frontmatter.acceptance_criteria[0]?.status).toBe('pending');
    expect(result.frontmatter.acceptance_criteria[1]?.status).toBe('met');
    expect(result.frontmatter.spec_delta?.added).toEqual(['new requirement']);
    expect(result.frontmatter.spec_delta?.delta_summary).toBe('Added new requirement');
    expect(result.frontmatter.open_questions).toEqual(['How should errors be handled?']);
  });
});

describe('writeRecord', () => {
  test('writes a valid markdown file with YAML frontmatter and body', () => {
    const filePath = join(tempDir, 'write-test.md');
    const frontmatter: ReferenceDoc = {
      title: 'System Spec',
      category: 'system',
      topics: ['architecture', 'design'],
    };
    const body = '## Overview\n\nThe system architecture.\n';

    writeRecord(filePath, frontmatter, body);

    const written = readFileSync(filePath, 'utf-8');
    expect(written).toContain('---');
    expect(written).toContain('title: System Spec');
    expect(written).toContain('category: system');
    expect(written).toContain('## Overview');
    expect(written).toContain('The system architecture.');

    // Round-trip: read it back
    const result = readRecord<ReferenceDoc>(filePath);
    expect(result.frontmatter.title).toBe('System Spec');
    expect(result.frontmatter.category).toBe('system');
    expect(result.frontmatter.topics).toEqual(['architecture', 'design']);
    expect(result.body).toContain('## Overview');
  });

  test('creates parent directories if they do not exist', () => {
    const filePath = join(tempDir, 'nested', 'dir', 'deep.md');
    const frontmatter: ReferenceDoc = {
      title: 'Deep File',
      category: 'pattern',
      topics: [],
    };

    writeRecord(filePath, frontmatter, 'Some body content.');

    const written = readFileSync(filePath, 'utf-8');
    expect(written).toContain('title: Deep File');
    expect(written).toContain('Some body content.');
  });

  test('writes frontmatter with arrays and nested objects', () => {
    const filePath = join(tempDir, 'complex.md');
    const frontmatter: IssueRecord = {
      title: 'Complex Issue',
      issue_type: 'feature',
      status: 'active',
      phase: 'build',
      priority: 2,
      topics: ['api', 'auth'],
      acceptance_criteria: [
        { id: 'AC-1', text: 'Login works', status: 'pending' },
      ],
      open_questions: [],
      deferred_items: ['Performance optimization'],
      human_review: false,
    };

    writeRecord(filePath, frontmatter, '## Tasks\n\nImplement login.');

    // Round-trip verification
    const result = readRecord<IssueRecord>(filePath);
    expect(result.frontmatter.title).toBe('Complex Issue');
    expect(result.frontmatter.priority).toBe(2);
    expect(result.frontmatter.acceptance_criteria).toHaveLength(1);
    expect(result.frontmatter.acceptance_criteria[0]?.text).toBe('Login works');
    expect(result.frontmatter.deferred_items).toEqual(['Performance optimization']);
    expect(result.body).toContain('## Tasks');
  });
});

describe('updateFrontmatter', () => {
  test('merges partial updates into existing frontmatter without touching body', () => {
    const filePath = join(tempDir, 'update-test.md');
    const initialFrontmatter: IssueRecord = {
      title: 'Original Title',
      issue_type: 'feature',
      status: 'proposed',
      phase: 'specify',
      priority: 3,
      topics: ['initial'],
      acceptance_criteria: [],
      open_questions: [],
      deferred_items: [],
      human_review: false,
    };
    const body = '## Description\n\nOriginal body content.\n';

    writeRecord(filePath, initialFrontmatter, body);

    // Update only status and phase
    updateFrontmatter<IssueRecord>(filePath, {
      status: 'active',
      phase: 'plan',
    });

    const result = readRecord<IssueRecord>(filePath);

    // Updated fields
    expect(result.frontmatter.status).toBe('active');
    expect(result.frontmatter.phase).toBe('plan');

    // Unchanged fields
    expect(result.frontmatter.title).toBe('Original Title');
    expect(result.frontmatter.issue_type).toBe('feature');
    expect(result.frontmatter.priority).toBe(3);
    expect(result.frontmatter.topics).toEqual(['initial']);

    // Body untouched
    expect(result.body).toContain('Original body content.');
  });

  test('throws for non-existent file', () => {
    const filePath = join(tempDir, 'missing.md');

    expect(() =>
      updateFrontmatter<IssueRecord>(filePath, { status: 'active' })
    ).toThrow();
  });
});
