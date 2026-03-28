import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { readRecord } from '@coda/core';
import { scaffoldCoda } from '../scaffold';
import { generateRefDocs, createFirstMilestone, forgeGreenfield } from '../greenfield';
import type { ForgeInterviewAnswers, ForgeContext } from '../types';

const sampleAnswers: ForgeInterviewAnswers = {
  building: 'A task management CLI for developers',
  users: 'Solo developers who need lightweight project tracking',
  techStack: 'TypeScript, Bun, SQLite',
  scope: 'CRUD for tasks and projects; out of scope: team collaboration, cloud sync',
  constraints: 'Must work offline, no external services',
};

describe('FORGE Greenfield', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'coda-forge-gf-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('generateRefDocs', () => {
    test('creates ref-system.md as a valid mdbase record', () => {
      const codaRoot = scaffoldCoda(tempDir);
      generateRefDocs(codaRoot, sampleAnswers);

      const refSystemPath = join(codaRoot, 'reference', 'ref-system.md');
      expect(existsSync(refSystemPath)).toBe(true);

      const record = readRecord<Record<string, unknown>>(refSystemPath);
      expect(record.frontmatter).toHaveProperty('type', 'reference');
      expect(record.frontmatter).toHaveProperty('title', 'System Reference');
      expect(record.body.length).toBeGreaterThan(0);
    });

    test('creates ref-prd.md as a valid mdbase record', () => {
      const codaRoot = scaffoldCoda(tempDir);
      generateRefDocs(codaRoot, sampleAnswers);

      const refPrdPath = join(codaRoot, 'reference', 'ref-prd.md');
      expect(existsSync(refPrdPath)).toBe(true);

      const record = readRecord<Record<string, unknown>>(refPrdPath);
      expect(record.frontmatter).toHaveProperty('type', 'reference');
      expect(record.frontmatter).toHaveProperty('title', 'Product Requirements');
      expect(record.body.length).toBeGreaterThan(0);
    });

    test('ref-system.md contains interview answers', () => {
      const codaRoot = scaffoldCoda(tempDir);
      generateRefDocs(codaRoot, sampleAnswers);

      const record = readRecord<Record<string, unknown>>(
        join(codaRoot, 'reference', 'ref-system.md')
      );
      expect(record.body).toContain('task management CLI');
      expect(record.body).toContain('TypeScript');
    });

    test('ref-prd.md contains user and scope information', () => {
      const codaRoot = scaffoldCoda(tempDir);
      generateRefDocs(codaRoot, sampleAnswers);

      const record = readRecord<Record<string, unknown>>(
        join(codaRoot, 'reference', 'ref-prd.md')
      );
      expect(record.body).toContain('Solo developers');
      expect(record.body).toContain('CRUD for tasks');
    });
  });

  describe('createFirstMilestone', () => {
    test('creates a milestone file in .coda/milestones/', () => {
      const codaRoot = scaffoldCoda(tempDir);
      createFirstMilestone(codaRoot, sampleAnswers);

      const milestonePath = join(codaRoot, 'milestones', 'm1-initial.md');
      expect(existsSync(milestonePath)).toBe(true);
    });

    test('milestone file is a valid mdbase record', () => {
      const codaRoot = scaffoldCoda(tempDir);
      createFirstMilestone(codaRoot, sampleAnswers);

      const record = readRecord<Record<string, unknown>>(
        join(codaRoot, 'milestones', 'm1-initial.md')
      );
      expect(record.frontmatter).toHaveProperty('title', 'Initial Milestone');
      expect(record.frontmatter).toHaveProperty('status', 'planned');
      expect(record.frontmatter).toHaveProperty('version', '0.1.0');
      expect(record.body.length).toBeGreaterThan(0);
    });
  });

  describe('forgeGreenfield', () => {
    test('orchestrates scaffold + ref docs + milestone', () => {
      const context: ForgeContext = {
        projectRoot: tempDir,
        answers: sampleAnswers,
      };

      const result = forgeGreenfield(context);

      expect(result.success).toBe(true);
      expect(existsSync(join(tempDir, '.coda'))).toBe(true);
      expect(existsSync(join(tempDir, '.coda', 'coda.json'))).toBe(true);
      expect(existsSync(join(tempDir, '.coda', 'reference', 'ref-system.md'))).toBe(true);
      expect(existsSync(join(tempDir, '.coda', 'reference', 'ref-prd.md'))).toBe(true);
      expect(existsSync(join(tempDir, '.coda', 'milestones', 'm1-initial.md'))).toBe(true);
    });

    test('returns ForgeResult with success and codaRoot', () => {
      const context: ForgeContext = {
        projectRoot: tempDir,
        answers: sampleAnswers,
      };

      const result = forgeGreenfield(context);

      expect(result.success).toBe(true);
      expect(result.codaRoot).toBe(join(tempDir, '.coda'));
      expect(result.message.length).toBeGreaterThan(0);
    });

    test('returns early with message when .coda/ already exists', () => {
      // Pre-create .coda/
      scaffoldCoda(tempDir);

      const context: ForgeContext = {
        projectRoot: tempDir,
        answers: sampleAnswers,
      };

      const result = forgeGreenfield(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Already initialized');
    });
  });
});
