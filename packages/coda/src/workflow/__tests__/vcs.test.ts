import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { createBranch, commitTask, getCurrentBranch } from '../vcs';

/**
 * VCS integration tests.
 *
 * Each test creates a temporary git repository to test real git operations.
 * This ensures we're testing actual behavior, not mocked assumptions.
 */

let testDir: string;

function initTestRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'coda-vcs-test-'));
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
  // Create initial commit so we have a branch to work from
  writeFileSync(join(dir, 'README.md'), '# Test');
  execSync('git add .', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "initial"', { cwd: dir, stdio: 'pipe' });
  return dir;
}

beforeEach(() => {
  testDir = initTestRepo();
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('getCurrentBranch', () => {
  test('returns current branch name', () => {
    const branch = getCurrentBranch(testDir);
    // Git init creates "main" or "master" depending on config
    expect(['main', 'master']).toContain(branch);
  });

  test('returns correct branch after checkout', () => {
    execSync('git checkout -b test-branch', { cwd: testDir, stdio: 'pipe' });
    expect(getCurrentBranch(testDir)).toBe('test-branch');
  });
});

describe('createBranch', () => {
  test('creates feat/ branch for feature type', () => {
    const result = createBranch(testDir, 'my-feature', 'feature');
    expect(result.branch).toBe('feat/my-feature');
    expect(result.created).toBe(true);
    expect(getCurrentBranch(testDir)).toBe('feat/my-feature');
  });

  test('creates fix/ branch for bugfix type', () => {
    const result = createBranch(testDir, 'my-bug', 'bugfix');
    expect(result.branch).toBe('fix/my-bug');
    expect(result.created).toBe(true);
    expect(getCurrentBranch(testDir)).toBe('fix/my-bug');
  });

  test('creates feat/ branch for refactor type', () => {
    const result = createBranch(testDir, 'cleanup', 'refactor');
    expect(result.branch).toBe('feat/cleanup');
    expect(result.created).toBe(true);
  });

  test('creates feat/ branch for chore type', () => {
    const result = createBranch(testDir, 'deps', 'chore');
    expect(result.branch).toBe('feat/deps');
    expect(result.created).toBe(true);
  });

  test('creates feat/ branch for docs type', () => {
    const result = createBranch(testDir, 'readme', 'docs');
    expect(result.branch).toBe('feat/readme');
    expect(result.created).toBe(true);
  });

  test('no-ops if already on target branch', () => {
    createBranch(testDir, 'my-feature', 'feature');
    const result = createBranch(testDir, 'my-feature', 'feature');
    expect(result.branch).toBe('feat/my-feature');
    expect(result.created).toBe(false);
  });

  test('switches to existing branch if not checked out', () => {
    createBranch(testDir, 'my-feature', 'feature');
    // Switch back to main/master
    const defaultBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: testDir,
      encoding: 'utf-8',
    }).trim();
    execSync(`git checkout -`, { cwd: testDir, stdio: 'pipe' });
    // Now activate again — should switch, not create
    const result = createBranch(testDir, 'my-feature', 'feature');
    expect(result.branch).toBe('feat/my-feature');
    expect(result.created).toBe(false);
  });
});

describe('commitTask', () => {
  test('commits changes with correct message format', () => {
    writeFileSync(join(testDir, 'feature.ts'), 'export const x = 1;');
    const result = commitTask(testDir, 1, 'implement feature');
    expect(result.committed).toBe(true);
    expect(result.message).toBe('task 1: implement feature');

    // Verify commit message in git log
    const log = execSync('git log -1 --format=%s', {
      cwd: testDir,
      encoding: 'utf-8',
    }).trim();
    expect(log).toBe('task 1: implement feature');
  });

  test('no-ops when working tree is clean', () => {
    const result = commitTask(testDir, 2, 'no changes');
    expect(result.committed).toBe(false);
    expect(result.message).toBe('nothing to commit');
  });

  test('stages and commits new files', () => {
    writeFileSync(join(testDir, 'a.ts'), 'a');
    writeFileSync(join(testDir, 'b.ts'), 'b');
    const result = commitTask(testDir, 3, 'add files');
    expect(result.committed).toBe(true);

    // Verify both files were committed
    const files = execSync('git diff --name-only HEAD~1..HEAD', {
      cwd: testDir,
      encoding: 'utf-8',
    }).trim();
    expect(files).toContain('a.ts');
    expect(files).toContain('b.ts');
  });

  test('stages and commits modified files', () => {
    writeFileSync(join(testDir, 'README.md'), '# Updated');
    const result = commitTask(testDir, 4, 'update readme');
    expect(result.committed).toBe(true);
    expect(result.message).toBe('task 4: update readme');
  });
});
