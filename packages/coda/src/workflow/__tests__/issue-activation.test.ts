import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { createDefaultState, loadState, persistState, writeRecord } from '@coda/core';
import type { CodaState, IssueRecord } from '@coda/core';
import { focusIssue } from '../issue-activation';

let projectRoot: string;
let codaRoot: string;
let statePath: string;

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'issue-activation-'));
  codaRoot = join(projectRoot, '.coda');
  statePath = join(codaRoot, 'state.json');
  mkdirSync(join(codaRoot, 'issues'), { recursive: true });
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

function writeIssue(slug: string, overrides: Partial<IssueRecord> = {}): void {
  writeRecord<IssueRecord>(join(codaRoot, 'issues', `${slug}.md`), {
    title: 'My Feature',
    issue_type: 'feature',
    status: 'active',
    phase: 'specify',
    priority: 3,
    topics: [],
    acceptance_criteria: [],
    open_questions: [],
    deferred_items: [],
    human_review: false,
    ...overrides,
  }, '## Description\nIssue activation test.\n');
}

function initGitRepo(): void {
  writeFileSync(join(projectRoot, 'README.md'), '# Test repo\n', 'utf-8');
  execSync('git init', { cwd: projectRoot, stdio: 'pipe' });
  execSync('git config user.email "test@example.com"', { cwd: projectRoot, stdio: 'pipe' });
  execSync('git config user.name "Test User"', { cwd: projectRoot, stdio: 'pipe' });
  execSync('git add README.md', { cwd: projectRoot, stdio: 'pipe' });
  execSync('git commit -m "init"', { cwd: projectRoot, stdio: 'pipe' });
}

describe('focusIssue', () => {
  test('focuses an issue, persists state, and creates a branch by default', () => {
    initGitRepo();
    writeIssue('my-feature');

    const result = focusIssue(codaRoot, projectRoot, 'my-feature');

    expect(result).toMatchObject({
      status: 'focused',
      slug: 'my-feature',
      phase: 'specify',
      branch: 'feat/my-feature',
      branch_status: 'created',
    });
    expect(result.next_action).toContain('coda_advance');
    expect(result.next_action.toLowerCase()).toContain('acceptance criteria');

    const state = loadState(statePath);
    expect(state).toMatchObject({
      focus_issue: 'my-feature',
      phase: 'specify',
      current_task: null,
      completed_tasks: [],
    });
    expect(existsSync(join(projectRoot, '.git'))).toBe(true);
    expect(execSync('git branch --list feat/my-feature', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim()).toContain('feat/my-feature');
  });

  test('returns an error payload instead of throwing when the slug does not exist', () => {
    const result = focusIssue(codaRoot, projectRoot, 'missing-issue');

    expect(result.status).toBe('error');
    if (result.status !== 'error') {
      throw new Error(`Expected error result, received ${result.status}`);
    }
    expect(result.reason).toContain('not found');
    expect(result.next_action).toContain('coda_create');
    expect(loadState(statePath)).toBeNull();
  });

  test('returns already_focused and leaves state unchanged when the issue is already focused', () => {
    writeIssue('my-feature', { phase: 'build' });
    const state: CodaState = {
      ...createDefaultState(),
      focus_issue: 'my-feature',
      phase: 'build',
      current_task: 2,
      completed_tasks: [1],
    };
    persistState(state, statePath);

    const before = loadState(statePath);
    const result = focusIssue(codaRoot, projectRoot, 'my-feature');

    expect(result).toMatchObject({ status: 'already_focused', slug: 'my-feature', phase: 'build' });
    if (result.status !== 'already_focused') {
      throw new Error(`Expected already_focused result, received ${result.status}`);
    }
    expect(result.next_action).toContain('coda_status');
    expect(result.next_action).toContain('coda_advance');
    expect(loadState(statePath)).toEqual(before);
  });

  test('skips branch creation when createBranch is false', () => {
    initGitRepo();
    writeIssue('my-feature');

    const result = focusIssue(codaRoot, projectRoot, 'my-feature', { createBranch: false });

    expect(result).toMatchObject({
      status: 'focused',
      slug: 'my-feature',
      phase: 'specify',
      branch_status: 'skipped',
      reason: 'create_branch=false',
    });
    if (result.status !== 'focused') {
      throw new Error(`Expected focused result, received ${result.status}`);
    }
    expect(result.next_action).toContain('coda_advance');
    expect(execSync('git branch --list feat/my-feature', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim()).toBe('');
  });

  test('skips branch creation in a non-git directory and returns a structured reason', () => {
    writeIssue('my-feature');

    const result = focusIssue(codaRoot, projectRoot, 'my-feature');

    expect(result).toMatchObject({
      status: 'focused',
      slug: 'my-feature',
      phase: 'specify',
      branch_status: 'skipped',
      reason: 'not a git repo',
    });
    expect(loadState(statePath)?.focus_issue).toBe('my-feature');
  });

  test('returns an error payload for a malformed issue record', () => {
    writeFileSync(join(codaRoot, 'issues', 'broken.md'), '# missing frontmatter\n', 'utf-8');

    const result = focusIssue(codaRoot, projectRoot, 'broken');

    expect(result.status).toBe('error');
    if (result.status !== 'error') {
      throw new Error(`Expected error result, received ${result.status}`);
    }
    expect(result.reason).toContain('frontmatter');
    expect(loadState(statePath)).toBeNull();
  });
});
