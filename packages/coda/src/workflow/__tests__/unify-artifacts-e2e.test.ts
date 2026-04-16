/**
 * @module workflow/__tests__/unify-artifacts-e2e
 *
 * End-to-end integration tests for the evidence-based `unify→done` gate.
 * Each case materializes a minimal `.coda/` tree (issue, plan, completion
 * record, optional overlay, optional ref doc) and calls codaAdvance to
 * prove the full pipeline blocks empty evidence and passes when artifacts
 * exist on disk or exemptions are declared.
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { codaAdvance } from '../../tools/coda-advance';
import {
  createDefaultState,
  persistState,
  writeRecord,
} from '@coda/core';
import { appendToOverlay } from '../../../../core/src/modules/overlay';
import type {
  CompletionRecord,
  IssueRecord,
  PlanRecord,
} from '@coda/core';

let codaRoot: string;
let statePath: string;

beforeEach(() => {
  codaRoot = mkdtempSync(join(tmpdir(), 'coda-unify-e2e-'));
  statePath = join(codaRoot, 'state.json');
});

afterEach(() => {
  rmSync(codaRoot, { recursive: true, force: true });
});

interface Fixture {
  issueType?: IssueRecord['issue_type'];
  specDelta?: boolean;
  artifactsProduced?: CompletionRecord['artifacts_produced'];
  exemptions?: CompletionRecord['exemptions'];
  /**
   * Files to actually create on disk before calling codaAdvance.
   * Keys are paths relative to codaRoot; values are file contents
   * (body only — frontmatter is added automatically by the helper).
   */
  onDisk?: Record<string, { kind: 'overlay' | 'reference'; body: string }>;
  slug?: string;
}

function buildFixture(opts: Fixture = {}): void {
  const slug = opts.slug ?? 'feature-issue';
  const issueType = opts.issueType ?? 'feature';

  const issueFrontmatter: IssueRecord = {
    title: 'E2E Fixture Issue',
    issue_type: issueType,
    status: 'active',
    phase: 'unify',
    priority: 3,
    topics: [],
    acceptance_criteria: [{ id: 'AC-1', text: 'Criterion 1', status: 'met' }],
    open_questions: [],
    deferred_items: [],
    human_review: false,
  };
  if (opts.specDelta) {
    issueFrontmatter.spec_delta = {
      added: ['new-behavior'],
      modified: [],
      removed: [],
      delta_summary: 'Adds new-behavior',
    };
  }

  mkdirSync(join(codaRoot, 'issues'), { recursive: true });
  writeRecord<IssueRecord>(
    join(codaRoot, 'issues', `${slug}.md`),
    issueFrontmatter,
    '## Description\nFixture issue.\n'
  );

  mkdirSync(join(codaRoot, 'issues', slug), { recursive: true });
  writeRecord<PlanRecord>(
    join(codaRoot, 'issues', slug, 'plan-v1.md'),
    {
      title: 'Plan',
      issue: slug,
      status: 'approved',
      iteration: 1,
      task_count: 0,
      human_review_status: 'not-required',
    },
    '## Approach\nShip.\n'
  );

  // Create disk artifacts (overlays or reference docs)
  if (opts.onDisk) {
    for (const [relative, spec] of Object.entries(opts.onDisk)) {
      if (spec.kind === 'overlay') {
        // modules/<name>.local.md
        const fileName = relative.split('/').pop() ?? '';
        const moduleName = fileName.replace(/\.local\.md$/, '');
        appendToOverlay(codaRoot, moduleName, 'validated_patterns', spec.body, 'test');
      } else {
        // reference/<file>.md
        mkdirSync(join(codaRoot, 'reference'), { recursive: true });
        writeRecord<Record<string, unknown>>(
          join(codaRoot, relative),
          {
            title: 'Ref Doc',
            topics: [],
          },
          spec.body
        );
      }
    }
  }

  // Completion record
  const recordsDir = join(codaRoot, 'records');
  mkdirSync(recordsDir, { recursive: true });
  const completion: CompletionRecord = {
    title: 'Completion',
    issue: slug,
    completed_at: '2026-04-16',
    topics: [],
    system_spec_updated: true,
    reference_docs_reviewed: true,
    milestone_updated: true,
    unify_review_status: 'approved',
  };
  if (opts.artifactsProduced) {
    completion.artifacts_produced = opts.artifactsProduced;
  }
  if (opts.exemptions) {
    completion.exemptions = opts.exemptions;
  }
  writeRecord<CompletionRecord>(
    join(recordsDir, `${slug}-completion.md`),
    completion,
    '## Summary\nDone.\n'
  );

  persistState(
    {
      ...createDefaultState(),
      focus_issue: slug,
      phase: 'unify',
    },
    statePath
  );
}

describe('unify-artifacts-e2e', () => {
  test('feature + empty artifacts + no exemption → block', () => {
    buildFixture({
      issueType: 'feature',
      artifactsProduced: { overlays: [], reference_docs: [], decisions: [] },
    });

    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('no compounding artifacts produced');
    expect(result.new_phase).toBeUndefined();
  });

  test('feature + overlay on disk + artifacts_produced.overlays lists it → pass', () => {
    buildFixture({
      issueType: 'feature',
      artifactsProduced: {
        overlays: ['modules/security.local.md'],
        reference_docs: [],
        decisions: [],
      },
      onDisk: {
        'modules/security.local.md': {
          kind: 'overlay',
          body: 'Example pattern captured during this issue.',
        },
      },
    });

    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(true);
    expect(result.new_phase).toBe('done');
  });

  test('feature + ref-system.md on disk + artifacts_produced.reference_docs lists it → pass', () => {
    buildFixture({
      issueType: 'feature',
      artifactsProduced: {
        overlays: [],
        reference_docs: ['reference/ref-system.md'],
        decisions: [],
      },
      onDisk: {
        'reference/ref-system.md': {
          kind: 'reference',
          body: '## System\nSystem updated by this issue.\n',
        },
      },
    });

    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(true);
    expect(result.new_phase).toBe('done');
  });

  test('feature + artifacts_produced declares a path that does not exist → block', () => {
    buildFixture({
      issueType: 'feature',
      artifactsProduced: {
        overlays: ['modules/missing.local.md'],
        reference_docs: [],
        decisions: [],
      },
    });

    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('does not exist');
  });

  test('feature + artifacts_produced declares an overlay that exists but is empty → block', () => {
    buildFixture({
      issueType: 'feature',
      artifactsProduced: {
        overlays: ['modules/security.local.md'],
        reference_docs: [],
        decisions: [],
      },
    });
    // Create overlay file with no bullets (only headings)
    mkdirSync(join(codaRoot, 'modules'), { recursive: true });
    const emptyOverlay = `---\nmodule: security\nlast_updated: 2026-04-16\nupdated_by: test\n---\n\n## Project Values\n\n## Validated Patterns\n\n`;
    const { writeFileSync } = require('fs');
    writeFileSync(join(codaRoot, 'modules', 'security.local.md'), emptyOverlay, 'utf-8');

    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('no non-empty sections');
  });

  test('feature + empty artifacts + exemptions.overlays="no patterns emerged" → pass', () => {
    buildFixture({
      issueType: 'feature',
      artifactsProduced: { overlays: [], reference_docs: [], decisions: [] },
      exemptions: {
        overlays: 'no patterns emerged',
        reference_docs: 'no system change',
      },
    });

    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(true);
    expect(result.new_phase).toBe('done');
  });

  test('feature + empty artifacts + exemptions.overlays="" (empty string) → block', () => {
    buildFixture({
      issueType: 'feature',
      artifactsProduced: { overlays: [], reference_docs: [], decisions: [] },
      exemptions: {
        overlays: '',
      },
    });

    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('exemption requires a non-empty reason');
  });

  test('refactor + empty artifacts + no exemption → pass (ceremony relaxation)', () => {
    buildFixture({
      issueType: 'refactor',
      slug: 'refactor-issue',
      artifactsProduced: { overlays: [], reference_docs: [], decisions: [] },
    });

    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(true);
    expect(result.new_phase).toBe('done');
  });

  test('refactor with spec_delta + ref-system.md not touched + no exemption → block', () => {
    buildFixture({
      issueType: 'refactor',
      slug: 'refactor-spec-delta',
      specDelta: true,
      artifactsProduced: { overlays: [], reference_docs: [], decisions: [] },
    });

    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('spec_delta declared but ref-system.md not updated');
  });

  test('refactor with spec_delta + exemptions.system_spec="intentionally deferred" → pass', () => {
    buildFixture({
      issueType: 'refactor',
      slug: 'refactor-spec-delta-exempt',
      specDelta: true,
      artifactsProduced: { overlays: [], reference_docs: [], decisions: [] },
      exemptions: { system_spec: 'intentionally deferred to follow-up phase' },
    });

    const result = codaAdvance({ target_phase: 'done' }, codaRoot, statePath);
    expect(result.success).toBe(true);
    expect(result.new_phase).toBe('done');
  });
});
