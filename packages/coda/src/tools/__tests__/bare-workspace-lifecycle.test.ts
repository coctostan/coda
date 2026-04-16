import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadState, readRecord } from '@coda/core';
import type { IssueRecord } from '@coda/core';
import { codaCreate } from '../coda-create';
import { codaFocus } from '../coda-focus';
import { codaForge } from '../coda-forge';

describe('bare workspace lifecycle entry', () => {
  let projectRoot: string;
  let codaRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'coda-bare-workspace-'));
    codaRoot = join(projectRoot, '.coda');
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  test('uses coda_forge → coda_create → coda_focus to enter the lifecycle without slash commands', () => {
    const forgeResult = codaForge({}, projectRoot);
    const createResult = codaCreate({
      type: 'issue',
      fields: {
        title: 'Bare Workspace Lifecycle',
        issue_type: 'feature',
        status: 'proposed',
        phase: 'specify',
        priority: 3,
        topics: [],
        acceptance_criteria: [{ id: 'AC-1', text: 'Lifecycle starts from tools only', status: 'pending' }],
        open_questions: [],
        deferred_items: [],
        human_review: false,
      },
      body: '## Goal\n\nEnter CODA through tools only.\n',
    }, codaRoot);

    expect(forgeResult).toMatchObject({
      status: 'scaffolded',
      backdrop: 'greenfield',
      coda_root: codaRoot,
    });
    expect(createResult.success).toBe(true);
    expect(createResult.id).toBe('bare-workspace-lifecycle');

    const slug = createResult.id;
    if (!slug) {
      throw new Error('Expected codaCreate to return an issue slug');
    }

    const focusResult = codaFocus({ slug }, codaRoot, projectRoot);
    const issuePath = join(codaRoot, createResult.path);
    const issue = readRecord<IssueRecord>(issuePath);
    const state = loadState(join(codaRoot, 'state.json'));

    expect(focusResult).toMatchObject({
      status: 'focused',
      slug,
      phase: issue.frontmatter.phase,
    });
    expect(existsSync(codaRoot)).toBe(true);
    expect(existsSync(issuePath)).toBe(true);
    expect(state?.focus_issue).toBe(slug);
    expect(state?.phase).toBe(issue.frontmatter.phase);
  });
});
