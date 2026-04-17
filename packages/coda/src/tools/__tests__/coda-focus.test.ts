import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { loadState, writeRecord } from '@coda/core';
import type { IssueRecord } from '@coda/core';
import { codaFocus } from '../coda-focus';

let projectRoot: string;
let codaRoot: string;
let statePath: string;

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'coda-focus-'));
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
  }, '## Description\nTool focus test.\n');
}

function initGitRepo(): void {
  writeFileSync(join(projectRoot, 'README.md'), '# Test repo\n', 'utf-8');
  execSync('git init', { cwd: projectRoot, stdio: 'pipe' });
  execSync('git config user.email "test@example.com"', { cwd: projectRoot, stdio: 'pipe' });
  execSync('git config user.name "Test User"', { cwd: projectRoot, stdio: 'pipe' });
  execSync('git add README.md', { cwd: projectRoot, stdio: 'pipe' });
  execSync('git commit -m "init"', { cwd: projectRoot, stdio: 'pipe' });
}

describe('codaFocus', () => {
  test('focuses an issue to begin its lifecycle and creates a feature branch by default', () => {
    initGitRepo();
    writeIssue('my-feature', { phase: 'plan' });

    const result = codaFocus({ slug: 'my-feature' }, codaRoot, projectRoot);

    expect(result).toMatchObject({
      status: 'focused',
      slug: 'my-feature',
      phase: 'plan',
      branch: 'feat/my-feature',
      branch_status: 'created',
    });
    expect(result.next_action).toContain('coda_advance');
    expect(result.next_action.toLowerCase()).toContain('plan');
    expect(loadState(statePath)).toMatchObject({
      focus_issue: 'my-feature',
      phase: 'plan',
      current_task: null,
      completed_tasks: [],
    });
  });

  test('supports create_branch=false and skips branch creation while still mutating state', () => {
    initGitRepo();
    writeIssue('my-feature');

    const result = codaFocus({ slug: 'my-feature', create_branch: false }, codaRoot, projectRoot);

    expect(result).toMatchObject({
      status: 'focused',
      slug: 'my-feature',
      phase: 'specify',
      branch_status: 'skipped',
      reason: 'create_branch=false',
    });
    expect(execSync('git branch --list feat/my-feature', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim()).toBe('');
    expect(loadState(statePath)?.focus_issue).toBe('my-feature');
  });

  test('returns a structured error payload with a coda_create hint when the issue does not exist', () => {
    const result = codaFocus({ slug: 'missing-issue' }, codaRoot, projectRoot);

    expect(result.status).toBe('error');
    if (!('reason' in result)) {
      throw new Error(`Expected error result, received ${result.status}`);
    }
    expect(result.reason).toContain('not found');
    expect(result.next_action).toContain('coda_create');
    expect(loadState(statePath)).toBeNull();
  });
});
