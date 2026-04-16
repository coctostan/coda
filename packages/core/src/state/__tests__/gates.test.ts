import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { checkGate, GATES } from '../gates';

describe('GATES', () => {
  test('has 6 gates defined', () => {
    expect(Object.keys(GATES)).toHaveLength(6);
  });

  test('specify→plan passes with ACs present', () => {
    const result = checkGate('specify', 'plan', { issueAcCount: 3 });
    expect(result.passed).toBe(true);
  });

  test('specify→plan fails with zero ACs', () => {
    const result = checkGate('specify', 'plan', { issueAcCount: 0 });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('acceptance criterion');
  });

  test('specify→plan fails with undefined ACs', () => {
    const result = checkGate('specify', 'plan', {});
    expect(result.passed).toBe(false);
  });

  test('plan→review passes when plan exists', () => {
    const result = checkGate('plan', 'review', { planExists: true });
    expect(result.passed).toBe(true);
  });

  test('plan→review fails when plan does not exist', () => {
    const result = checkGate('plan', 'review', { planExists: false });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Plan must exist');
  });

  test('review→build passes when plan approved', () => {
    const result = checkGate('review', 'build', { planApproved: true });
    expect(result.passed).toBe(true);
  });

  test('review→build fails when plan not approved', () => {
    const result = checkGate('review', 'build', { planApproved: false });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('approved');
  });

  test('build→verify passes when all tasks complete', () => {
    const result = checkGate('build', 'verify', { allPlannedTasksComplete: true });
    expect(result.passed).toBe(true);
  });

  test('build→verify fails when tasks incomplete', () => {
    const result = checkGate('build', 'verify', { allPlannedTasksComplete: false });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('tasks');
  });

  test('build→verify passes when tasks complete and moduleBlockFindings is 0', () => {
    const result = checkGate('build', 'verify', { allPlannedTasksComplete: true, moduleBlockFindings: 0 });
    expect(result.passed).toBe(true);
  });

  test('build→verify passes when tasks complete and moduleBlockFindings is undefined', () => {
    const result = checkGate('build', 'verify', { allPlannedTasksComplete: true });
    expect(result.passed).toBe(true);
  });

  test('build→verify fails when moduleBlockFindings > 0 even if tasks complete', () => {
    const result = checkGate('build', 'verify', { allPlannedTasksComplete: true, moduleBlockFindings: 2 });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Module findings');
  });

  test('build→verify fails on tasks first before checking moduleBlockFindings', () => {
    const result = checkGate('build', 'verify', { allPlannedTasksComplete: false, moduleBlockFindings: 3 });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('tasks');
  });

  test('verify→unify passes when all ACs met', () => {
    const result = checkGate('verify', 'unify', { allAcsMet: true });
    expect(result.passed).toBe(true);
  });

  test('verify→unify fails when ACs not met', () => {
    const result = checkGate('verify', 'unify', { allAcsMet: false });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('acceptance criteria');
  });

  test('unify→done passes when all 5 fields are true (including unifyReviewStatus approved)', () => {
    const result = checkGate('unify', 'done', {
      completionRecordExists: true,
      systemSpecUpdated: true,
      referenceDocsReviewed: true,
      milestoneUpdated: true,
      unifyReviewStatus: 'approved',
    });
    expect(result.passed).toBe(true);
  });

  test('unify→done fails when unifyReviewStatus is pending', () => {
    const result = checkGate('unify', 'done', {
      completionRecordExists: true,
      systemSpecUpdated: true,
      referenceDocsReviewed: true,
      milestoneUpdated: true,
      unifyReviewStatus: 'pending',
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('UNIFY review pending');
  });

  test('unify→done fails when unifyReviewStatus is changes-requested', () => {
    const result = checkGate('unify', 'done', {
      completionRecordExists: true,
      systemSpecUpdated: true,
      referenceDocsReviewed: true,
      milestoneUpdated: true,
      unifyReviewStatus: 'changes-requested',
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('UNIFY review pending');
  });

  test('unify→done fails when unifyReviewStatus is undefined (missing)', () => {
    const result = checkGate('unify', 'done', {
      completionRecordExists: true,
      systemSpecUpdated: true,
      referenceDocsReviewed: true,
      milestoneUpdated: true,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('UNIFY review pending');
  });
  test('unify→done fails when completion record missing', () => {
    const result = checkGate('unify', 'done', { completionRecordExists: false });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Completion record');
  });

  test('unify→done fails when completionRecordExists true but systemSpecUpdated false', () => {
    const result = checkGate('unify', 'done', {
      completionRecordExists: true,
      systemSpecUpdated: false,
      referenceDocsReviewed: true,
      milestoneUpdated: true,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Spec delta');
  });

  test('unify→done fails when systemSpecUpdated true but referenceDocsReviewed false', () => {
    const result = checkGate('unify', 'done', {
      completionRecordExists: true,
      systemSpecUpdated: true,
      referenceDocsReviewed: false,
      milestoneUpdated: true,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Reference docs');
  });

  test('unify→done fails when referenceDocsReviewed true but milestoneUpdated false', () => {
    const result = checkGate('unify', 'done', {
      completionRecordExists: true,
      systemSpecUpdated: true,
      referenceDocsReviewed: true,
      milestoneUpdated: false,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Milestone');
  });
});

describe('unify→done evidence gate', () => {
  let codaRoot: string;

  beforeEach(() => {
    codaRoot = mkdtempSync(join(tmpdir(), 'gates-evidence-'));
  });

  afterEach(() => {
    rmSync(codaRoot, { recursive: true, force: true });
  });

  const baseApprovedData = () => ({
    completionRecordExists: true,
    systemSpecUpdated: true,
    referenceDocsReviewed: true,
    milestoneUpdated: true,
    unifyReviewStatus: 'approved',
    codaRoot,
  });

  function writeOverlayFile(moduleName: string, body: string): string {
    const modulesDir = join(codaRoot, 'modules');
    mkdirSync(modulesDir, { recursive: true });
    const relative = `modules/${moduleName}.local.md`;
    const content = `---\nmodule: ${moduleName}\nlast_updated: 2026-04-16\nupdated_by: test\n---\n\n${body}\n`;
    writeFileSync(join(codaRoot, relative), content, 'utf-8');
    return relative;
  }

  function writeRefDoc(name: string, body: string): string {
    const refDir = join(codaRoot, 'reference');
    mkdirSync(refDir, { recursive: true });
    const relative = `reference/${name}`;
    const content = `---\ntitle: ${name}\ntopics: []\n---\n\n${body}\n`;
    writeFileSync(join(codaRoot, relative), content, 'utf-8');
    return relative;
  }

  test('fails when artifactsProduced is undefined AND issueType feature/bugfix', () => {
    const result = checkGate('unify', 'done', {
      ...baseApprovedData(),
      artifactEvidenceRequired: true,
      // artifactsProduced omitted
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('no compounding artifacts produced');
  });

  test('fails when artifactsProduced.overlays empty AND reference_docs empty AND no exemptions AND issueType feature', () => {
    const result = checkGate('unify', 'done', {
      ...baseApprovedData(),
      artifactEvidenceRequired: true,
      artifactsProduced: { overlays: [], reference_docs: [], decisions: [] },
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('no compounding artifacts produced');
  });

  test('fails when an overlay path is declared but the file does not exist on disk', () => {
    const result = checkGate('unify', 'done', {
      ...baseApprovedData(),
      artifactEvidenceRequired: true,
      artifactsProduced: {
        overlays: ['modules/missing.local.md'],
        reference_docs: [],
        decisions: [],
      },
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('does not exist');
  });

  test('fails when an overlay path is declared and exists but the file has no non-empty sections', () => {
    const relative = writeOverlayFile('security', '## Project Values\n\n## Validated Patterns\n');
    const result = checkGate('unify', 'done', {
      ...baseApprovedData(),
      artifactEvidenceRequired: true,
      artifactsProduced: {
        overlays: [relative],
        reference_docs: [],
        decisions: [],
      },
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('no non-empty sections');
  });

  test('passes when overlays list includes a non-empty overlay file on disk', () => {
    const relative = writeOverlayFile('security', '## Validated Patterns\n- Always prefix logs with request ID\n');
    const result = checkGate('unify', 'done', {
      ...baseApprovedData(),
      artifactEvidenceRequired: true,
      artifactsProduced: {
        overlays: [relative],
        reference_docs: [],
        decisions: [],
      },
    });
    expect(result.passed).toBe(true);
  });

  test('passes when reference_docs list includes a non-empty ref doc on disk', () => {
    const relative = writeRefDoc('ref-system.md', '## Overview\nSystem evolved this way.\n');
    const result = checkGate('unify', 'done', {
      ...baseApprovedData(),
      artifactEvidenceRequired: true,
      artifactsProduced: {
        overlays: [],
        reference_docs: [relative],
        decisions: [],
      },
    });
    expect(result.passed).toBe(true);
  });

  test('passes when exemptions.overlays is a non-empty string AND no artifacts declared', () => {
    const result = checkGate('unify', 'done', {
      ...baseApprovedData(),
      artifactEvidenceRequired: true,
      artifactsProduced: { overlays: [], reference_docs: [], decisions: [] },
      artifactExemptions: { overlays: 'no project-specific patterns emerged' },
    });
    expect(result.passed).toBe(true);
  });

  test('fails when exemptions.overlays is present but is an empty string', () => {
    const result = checkGate('unify', 'done', {
      ...baseApprovedData(),
      artifactEvidenceRequired: true,
      artifactsProduced: { overlays: [], reference_docs: [], decisions: [] },
      artifactExemptions: { overlays: '' },
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('exemption requires a non-empty reason');
  });

  test('relaxes evidence check when issueType refactor with empty artifacts AND no exemptions', () => {
    const result = checkGate('unify', 'done', {
      ...baseApprovedData(),
      artifactEvidenceRequired: false,
      artifactsProduced: { overlays: [], reference_docs: [], decisions: [] },
    });
    expect(result.passed).toBe(true);
  });

  test('still enforces spec_delta requirement for refactor issues', () => {
    const result = checkGate('unify', 'done', {
      ...baseApprovedData(),
      artifactEvidenceRequired: false,
      specDeltaPresent: true,
      artifactsProduced: { overlays: [], reference_docs: [], decisions: [] },
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('spec_delta declared but ref-system.md not updated');
  });

  test('spec_delta is satisfied by a non-empty ref doc update', () => {
    const relative = writeRefDoc('ref-system.md', '## System\nUpdated content.\n');
    const result = checkGate('unify', 'done', {
      ...baseApprovedData(),
      artifactEvidenceRequired: false,
      specDeltaPresent: true,
      artifactsProduced: { overlays: [], reference_docs: [relative], decisions: [] },
    });
    expect(result.passed).toBe(true);
  });

  test('spec_delta is satisfied by a non-empty system_spec exemption', () => {
    const result = checkGate('unify', 'done', {
      ...baseApprovedData(),
      artifactEvidenceRequired: false,
      specDeltaPresent: true,
      artifactsProduced: { overlays: [], reference_docs: [], decisions: [] },
      artifactExemptions: { system_spec: 'intentionally deferred to follow-up' },
    });
    expect(result.passed).toBe(true);
  });
});

describe('checkGate', () => {
  test('returns passed for undefined transition (no gate)', () => {
    // There's no gate for specify→build (it's an invalid transition, but no gate)
    const result = checkGate('specify', 'build', {});
    expect(result.passed).toBe(true);
  });

  test('returns passed for adjacent transitions with no gate defined', () => {
    // If somehow a gate wasn't defined, it passes by default
    const result = checkGate('done', 'specify', {});
    expect(result.passed).toBe(true);
  });
});
