/**
 * @module workflow/__tests__/module-system-e2e
 * End-to-end tests for the v0.3 module system integrated path.
 *
 * Exercises the full lifecycle: config → registry → dispatcher → prompt assembly
 * → (mock agent response) → findings parsing → persistence → gate check
 * → context summarization → phase context injection.
 *
 * Scoped to security + tdd modules only (Decision D3).
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  createModuleSystem,
  buildHookContext,
  persistFindings,
  loadFindings,
  summarizeFindings,
  loadModuleConfig,
} from '../module-integration';
import { loadModuleFindingsSummary } from '../context-builder';
import { checkGate } from '@coda/core';
import { writeRecord } from '@coda/core';
import { getPhaseContext } from '../phase-runner';
import type { HookResult, Finding, HookPoint, CodaState } from '@coda/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..', '..', '..');
const promptsDir = resolve(repoRoot, 'modules', 'prompts');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    module: 'security',
    check: 'test check',
    severity: 'info',
    finding: 'Test finding',
    ...overrides,
  };
}

function makeHookResult(overrides: Partial<HookResult> = {}): HookResult {
  return {
    hookPoint: 'post-build',
    findings: [],
    blocked: false,
    blockReasons: [],
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Build a mock agent response containing a JSON findings array
 * inside a fenced code block, mimicking real LLM output.
 */
function mockAgentResponse(findings: Array<Record<string, unknown>>): string {
  return `I've completed my analysis. Here are the findings:

\`\`\`json
${JSON.stringify(findings, null, 2)}
\`\`\`

Please review the findings above.`;
}

/** Build a minimal CodaState with required overrides. */
function makeState(overrides: Partial<CodaState> = {}): CodaState {
  return {
    version: 1,
    focus_issue: 'ctx-issue',
    phase: 'verify',
    submode: null,
    loop_iteration: 0,
    current_task: null,
    completed_tasks: [],
    tdd_gate: 'locked',
    last_test_exit_code: null,
    task_tool_calls: 0,
    enabled: true,
    ...overrides,
  };
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('Module System E2E', () => {
  let tempDir: string;
  let codaRoot: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'coda-e2e-'));
    codaRoot = join(tempDir, '.coda');
    mkdirSync(codaRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  // ─── AC-1: Full Prompt Assembly Path ─────────────────────────────────────

  describe('AC-1: Full prompt assembly path', () => {
    test('pre-plan returns security prompt content', () => {
      const dispatcher = createModuleSystem({}, promptsDir);
      const ctx = buildHookContext('e2e-issue', 'plan');
      const prompt = dispatcher.assemblePrompts('pre-plan', ctx);

      expect(prompt.length).toBeGreaterThan(0);
      expect(prompt).toContain('Module Analysis: pre-plan');
      // Security fires at pre-plan (p80)
      expect(prompt.toLowerCase()).toContain('security');
    });

    test('pre-build returns tdd prompt content', () => {
      const dispatcher = createModuleSystem({}, promptsDir);
      const ctx = buildHookContext('e2e-issue', 'build');
      const prompt = dispatcher.assemblePrompts('pre-build', ctx);

      expect(prompt.length).toBeGreaterThan(0);
      // TDD fires at pre-build (p100)
      expect(prompt).toContain('TDD');
    });

    test('post-task returns tdd prompt content', () => {
      const dispatcher = createModuleSystem({}, promptsDir);
      const ctx = buildHookContext('e2e-issue', 'build', { taskId: 2 });
      const prompt = dispatcher.assemblePrompts('post-task', ctx);

      expect(prompt.length).toBeGreaterThan(0);
      expect(prompt).toContain('TDD');
      expect(prompt).toContain('Task: 2');
    });

    test('post-build combines security (p130) + tdd (p200) in priority order', () => {
      const dispatcher = createModuleSystem({}, promptsDir);
      const ctx = buildHookContext('e2e-issue', 'build', {
        changedFiles: ['src/auth.ts'],
      });
      const prompt = dispatcher.assemblePrompts('post-build', ctx);

      expect(prompt.length).toBeGreaterThan(0);
      // Both modules fire at post-build
      expect(prompt.toLowerCase()).toContain('security');
      expect(prompt).toContain('TDD');
      // Security (p130) appears before TDD (p200) in the assembled prompt
      const secIdx = prompt.toLowerCase().indexOf('security');
      const tddIdx = prompt.indexOf('TDD');
      expect(secIdx).toBeLessThan(tddIdx);
      // Changed files in context
      expect(prompt).toContain('src/auth.ts');
    });

    test('post-unify returns empty (no v0.3 modules at this hook)', () => {
      const dispatcher = createModuleSystem({}, promptsDir);
      const ctx = buildHookContext('e2e-issue', 'unify');
      const prompt = dispatcher.assemblePrompts('post-unify', ctx);

      expect(prompt).toBe('');
    });

    test('all hook points produce expected module participation', () => {
      const dispatcher = createModuleSystem({}, promptsDir);
      const ctx = buildHookContext('e2e-issue', 'build');

      // Map of hookPoint → expected modules present (by name in prompt)
      const expectations: Record<string, { present: string[]; absent: string[] }> = {
        'pre-plan':   { present: ['security'], absent: [] },
        'pre-build':  { present: ['TDD'],      absent: [] },
        'post-task':  { present: ['TDD'],      absent: [] },
        'post-build': { present: ['security', 'TDD'], absent: [] },
        'post-unify': { present: [],           absent: [] },
      };

      for (const [hp, expected] of Object.entries(expectations)) {
        const prompt = dispatcher.assemblePrompts(hp as HookPoint, ctx);
        for (const name of expected.present) {
          expect(prompt.toLowerCase()).toContain(name.toLowerCase());
        }
        if (expected.present.length === 0) {
          expect(prompt).toBe('');
        }
      }
    });
  });

  // ─── AC-2: Full Findings Path — Parse + Persist + Load + Summarize ───────

  describe('AC-2: Full findings round-trip', () => {
    test('parse → persist → load → summarize produces correct data at each step', () => {
      const dispatcher = createModuleSystem({}, promptsDir);
      const ctx = buildHookContext('e2e-issue', 'build');

      // Step 1: Assemble prompts to verify the system is wired
      const prompt = dispatcher.assemblePrompts('post-build', ctx);
      expect(prompt.length).toBeGreaterThan(0);

      // Step 2: Mock an agent response with JSON findings
      const agentResponse = mockAgentResponse([
        {
          module: 'security',
          check: 'hardcoded secrets scan',
          severity: 'critical',
          finding: 'Hardcoded API key in config.ts',
          file: 'src/config.ts',
          assumption: 'File is committed to version control',
          recommendation: 'Use environment variables',
        },
        {
          module: 'tdd',
          check: 'test coverage check',
          severity: 'medium',
          finding: 'New function untested',
          file: 'src/auth.ts',
        },
        {
          module: 'tdd',
          check: 'test quality',
          severity: 'info',
          finding: 'Tests follow AAA pattern',
        },
      ]);

      // Step 3: Parse findings
      const hookResult = dispatcher.parseAndCheckFindings(agentResponse, 'post-build');

      expect(hookResult.hookPoint).toBe('post-build');
      expect(hookResult.findings).toHaveLength(3);
      expect(hookResult.blocked).toBe(true); // critical finding exceeds security threshold
      expect(hookResult.blockReasons.length).toBeGreaterThan(0);
      expect(hookResult.blockReasons[0]).toContain('SECURITY BLOCK');

      // Verify individual findings preserved correctly
      const secFinding = hookResult.findings.find(
        (f) => f.module === 'security' && f.severity === 'critical'
      );
      expect(secFinding).toBeDefined();
      expect(secFinding!.finding).toBe('Hardcoded API key in config.ts');
      expect(secFinding!.file).toBe('src/config.ts');
      expect(secFinding!.recommendation).toBe('Use environment variables');

      // Step 4: Persist findings
      persistFindings(codaRoot, 'e2e-issue', hookResult);

      // Step 5: Load findings
      const loaded = loadFindings(codaRoot, 'e2e-issue');
      expect(loaded.issue).toBe('e2e-issue');
      expect(loaded.hookResults).toHaveLength(1);
      expect(loaded.hookResults[0]!.findings).toHaveLength(3);
      expect(loaded.hookResults[0]!.blocked).toBe(true);

      // Step 6: Summarize findings
      const summary = summarizeFindings(loaded.hookResults);
      expect(summary).toContain('security:');
      expect(summary).toContain('1 critical');
      expect(summary).toContain('(BLOCKED)');
      expect(summary).toContain('Hardcoded API key');
      expect(summary).toContain('tdd:');
      expect(summary).toContain('1 medium');
      expect(summary).toContain('1 info');
    });
  });

  // ─── AC-3: Security Block → Gate Check Integration ───────────────────────

  describe('AC-3: Security block → gate check integration', () => {
    test('critical security finding blocks build→verify gate', () => {
      // Step 1: Persist a blocked hook result
      const hookResult = makeHookResult({
        hookPoint: 'post-build',
        findings: [
          makeFinding({
            module: 'security',
            severity: 'critical',
            finding: 'Hardcoded API key in config.ts',
          }),
        ],
        blocked: true,
        blockReasons: ['SECURITY BLOCK: Hardcoded API key in config.ts'],
      });
      persistFindings(codaRoot, 'e2e-issue', hookResult);

      // Step 2: Load findings and count blocks (as coda-advance would)
      const data = loadFindings(codaRoot, 'e2e-issue');
      const moduleBlockFindings = data.hookResults.reduce(
        (count, hr) => count + hr.blockReasons.length,
        0
      );
      expect(moduleBlockFindings).toBeGreaterThan(0);

      // Step 3: Check the build→verify gate
      const gateResult = checkGate('build', 'verify', {
        allPlannedTasksComplete: true,
        moduleBlockFindings,
      });
      expect(gateResult.passed).toBe(false);
      expect(gateResult.reason).toBe('Module findings require attention');
    });

    test('gate passes when tasks complete and no module blocks', () => {
      const gateResult = checkGate('build', 'verify', {
        allPlannedTasksComplete: true,
        moduleBlockFindings: 0,
      });
      expect(gateResult.passed).toBe(true);
    });

    test('gate fails when tasks not complete even without module blocks', () => {
      const gateResult = checkGate('build', 'verify', {
        allPlannedTasksComplete: false,
        moduleBlockFindings: 0,
      });
      expect(gateResult.passed).toBe(false);
      expect(gateResult.reason).toBe('All planned tasks must be complete');
    });
  });

  // ─── AC-4: Config-Disabled Module → Silent Skip ──────────────────────────

  describe('AC-4: Config-disabled module → silent skip', () => {
    test('disabling tdd produces no pre-build prompt', () => {
      // Write coda.json with tdd disabled
      writeFileSync(
        join(codaRoot, 'coda.json'),
        JSON.stringify({ modules: { tdd: { enabled: false } } })
      );

      const config = loadModuleConfig(codaRoot);
      const dispatcher = createModuleSystem(config, promptsDir);
      const ctx = buildHookContext('e2e-issue', 'build');

      // pre-build only has tdd — should be empty
      const prompt = dispatcher.assemblePrompts('pre-build', ctx);
      expect(prompt).toBe('');

      // post-task only has tdd — should be empty
      const postTaskPrompt = dispatcher.assemblePrompts('post-task', ctx);
      expect(postTaskPrompt).toBe('');
    });

    test('disabling tdd still allows security at post-build', () => {
      writeFileSync(
        join(codaRoot, 'coda.json'),
        JSON.stringify({ modules: { tdd: { enabled: false } } })
      );

      const config = loadModuleConfig(codaRoot);
      const dispatcher = createModuleSystem(config, promptsDir);
      const ctx = buildHookContext('e2e-issue', 'build');

      const prompt = dispatcher.assemblePrompts('post-build', ctx);
      expect(prompt.length).toBeGreaterThan(0);
      expect(prompt.toLowerCase()).toContain('security');
      // TDD should NOT be in the prompt
      expect(prompt).not.toContain('TDD');
    });

    test('disabled module produces no findings when response is parsed', () => {
      writeFileSync(
        join(codaRoot, 'coda.json'),
        JSON.stringify({ modules: { tdd: { enabled: false } } })
      );

      const config = loadModuleConfig(codaRoot);
      const dispatcher = createModuleSystem(config, promptsDir);

      // Even if the response contains tdd findings, they shouldn't block
      // because the tdd module isn't registered
      const agentResponse = mockAgentResponse([
        {
          module: 'tdd',
          check: 'coverage',
          severity: 'high',
          finding: 'No tests for new code',
        },
      ]);

      const result = dispatcher.parseAndCheckFindings(agentResponse, 'pre-build');
      // Findings are parsed (they're valid JSON), but tdd module has no
      // threshold in registry → blocked stays false because getModule returns null
      expect(result.blocked).toBe(false);
      expect(result.blockReasons).toHaveLength(0);
    });
  });

  // ─── AC-5: 'none' Threshold → Advisory Only ─────────────────────────────

  describe("AC-5: 'none' threshold → advisory only", () => {
    test('critical finding with none threshold is recorded but does not block', () => {
      // Configure security with blockThreshold='none'
      writeFileSync(
        join(codaRoot, 'coda.json'),
        JSON.stringify({
          modules: { security: { enabled: true, blockThreshold: 'none' } },
        })
      );

      const config = loadModuleConfig(codaRoot);
      const dispatcher = createModuleSystem(config, promptsDir);

      const agentResponse = mockAgentResponse([
        {
          module: 'security',
          check: 'secret scan',
          severity: 'critical',
          finding: 'API key found in source',
        },
      ]);

      const result = dispatcher.parseAndCheckFindings(agentResponse, 'post-build');

      // Finding is recorded
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]!.severity).toBe('critical');

      // But NOT blocked (threshold is 'none')
      expect(result.blocked).toBe(false);
      expect(result.blockReasons).toHaveLength(0);

      // Persist and verify gate passes
      persistFindings(codaRoot, 'e2e-issue', result);
      const data = loadFindings(codaRoot, 'e2e-issue');
      const moduleBlockFindings = data.hookResults.reduce(
        (count, hr) => count + hr.blockReasons.length,
        0
      );
      expect(moduleBlockFindings).toBe(0);

      const gateResult = checkGate('build', 'verify', {
        allPlannedTasksComplete: true,
        moduleBlockFindings,
      });
      expect(gateResult.passed).toBe(true);
    });
  });

  // ─── AC-6: Verify/Unify Context Includes Findings ───────────────────────

  describe('AC-6: Verify/unify context includes findings', () => {
    function setupIssueWithFindings(withFindings: boolean): void {
      // Set up a minimal .coda/ with issue, plan, tasks
      mkdirSync(join(codaRoot, 'issues', 'ctx-issue', 'tasks'), { recursive: true });

      writeRecord(join(codaRoot, 'issues', 'ctx-issue.md'), {
        title: 'Context Test Issue',
        issue_type: 'feature',
        status: 'active',
        phase: 'verify',
        priority: 3,
        topics: ['e2e'],
        acceptance_criteria: [
          { id: 'AC-1', text: 'It works', status: 'pending' },
        ],
        open_questions: [],
        deferred_items: [],
        human_review: false,
      }, '## Description\nTest issue for context injection.\n');

      writeRecord(join(codaRoot, 'issues', 'ctx-issue', 'plan-v1.md'), {
        version: 1,
        status: 'approved',
        task_count: 1,
        review_mode: 'auto',
      }, '## Plan\nBuild something.\n');

      writeRecord(join(codaRoot, 'issues', 'ctx-issue', 'tasks', '001.md'), {
        id: 1,
        title: 'Task One',
        status: 'done',
        covers_ac: ['AC-1'],
        depends_on: [],
        files_to_modify: ['src/foo.ts'],
        truths: [],
        artifacts: [],
        key_links: [],
      }, '## Summary\nDid the thing.\n');

      if (withFindings) {
        const hookResult = makeHookResult({
          hookPoint: 'post-build',
          findings: [
            makeFinding({
              module: 'security',
              severity: 'high',
              finding: 'SQL injection risk in query handler',
            }),
          ],
          blocked: true,
          blockReasons: ['SECURITY BLOCK: SQL injection risk in query handler'],
        });
        persistFindings(codaRoot, 'ctx-issue', hookResult);
      }
    }

    test('verify phase context contains Module Findings section when findings exist', () => {
      setupIssueWithFindings(true);

      const phaseCtx = getPhaseContext('verify', codaRoot, 'ctx-issue', makeState({
        phase: 'verify',
        completed_tasks: [1],
      }));

      expect(phaseCtx.context).toContain('## Module Findings');
      expect(phaseCtx.context).toContain('security:');
      expect(phaseCtx.context).toContain('SQL injection risk');
    });

    test('unify phase context contains Module Findings section when findings exist', () => {
      setupIssueWithFindings(true);

      const phaseCtx = getPhaseContext('unify', codaRoot, 'ctx-issue', makeState({
        phase: 'unify',
        completed_tasks: [1],
      }));

      expect(phaseCtx.context).toContain('## Module Findings');
      expect(phaseCtx.context).toContain('security:');
    });

    test('verify phase context omits Module Findings section when no findings', () => {
      setupIssueWithFindings(false);

      const phaseCtx = getPhaseContext('verify', codaRoot, 'ctx-issue', makeState({
        phase: 'verify',
        completed_tasks: [1],
      }));

      expect(phaseCtx.context).not.toContain('## Module Findings');
    });

    test('loadModuleFindingsSummary returns empty for no findings', () => {
      const summary = loadModuleFindingsSummary(codaRoot, 'nonexistent-issue');
      expect(summary).toBe('');
    });
  });

  // ─── AC-7: Clean Lifecycle — No Findings That Block ──────────────────────

  describe('AC-7: Clean lifecycle — no blocks', () => {
    test('INFO-only findings flow through without blocking', () => {
      const dispatcher = createModuleSystem({}, promptsDir);

      // Mock response with only info-level findings
      const agentResponse = mockAgentResponse([
        {
          module: 'security',
          check: 'secret scan',
          severity: 'info',
          finding: 'No secrets detected',
        },
        {
          module: 'tdd',
          check: 'coverage review',
          severity: 'info',
          finding: 'All new code has tests',
        },
      ]);

      // Parse
      const hookResult = dispatcher.parseAndCheckFindings(agentResponse, 'post-build');
      expect(hookResult.findings).toHaveLength(2);
      expect(hookResult.blocked).toBe(false);
      expect(hookResult.blockReasons).toHaveLength(0);

      // Persist
      persistFindings(codaRoot, 'clean-issue', hookResult);

      // Load
      const loaded = loadFindings(codaRoot, 'clean-issue');
      expect(loaded.hookResults).toHaveLength(1);

      // Summarize
      const summary = summarizeFindings(loaded.hookResults);
      expect(summary).toContain('security:');
      expect(summary).toContain('1 info');
      expect(summary).toContain('tdd:');
      expect(summary).not.toContain('(BLOCKED)');

      // Gate check
      const moduleBlockFindings = loaded.hookResults.reduce(
        (count, hr) => count + hr.blockReasons.length,
        0
      );
      expect(moduleBlockFindings).toBe(0);

      const gateResult = checkGate('build', 'verify', {
        allPlannedTasksComplete: true,
        moduleBlockFindings,
      });
      expect(gateResult.passed).toBe(true);
    });

    test('mixed info + low findings do not block when thresholds are not met', () => {
      const dispatcher = createModuleSystem({}, promptsDir);

      const agentResponse = mockAgentResponse([
        {
          module: 'security',
          check: 'code review',
          severity: 'low',
          finding: 'Console.log left in auth module',
        },
        {
          module: 'tdd',
          check: 'test quality',
          severity: 'info',
          finding: 'Tests follow good patterns',
        },
        {
          module: 'tdd',
          check: 'coverage',
          severity: 'medium',
          finding: 'Edge case not tested',
        },
      ]);

      const hookResult = dispatcher.parseAndCheckFindings(agentResponse, 'post-build');
      expect(hookResult.findings).toHaveLength(3);
      // security threshold is 'critical' → low doesn't block
      // tdd threshold is 'high' → medium doesn't block
      expect(hookResult.blocked).toBe(false);
      expect(hookResult.blockReasons).toHaveLength(0);

      // Persist + gate
      persistFindings(codaRoot, 'mixed-issue', hookResult);
      const data = loadFindings(codaRoot, 'mixed-issue');
      const moduleBlockFindings = data.hookResults.reduce(
        (count, hr) => count + hr.blockReasons.length,
        0
      );
      expect(moduleBlockFindings).toBe(0);

      const gateResult = checkGate('build', 'verify', {
        allPlannedTasksComplete: true,
        moduleBlockFindings,
      });
      expect(gateResult.passed).toBe(true);
    });
  });

  // ─── Cross-cutting: Multiple hooks accumulate findings ───────────────────

  describe('Cross-cutting: Multi-hook accumulation', () => {
    test('findings from multiple hooks accumulate correctly', () => {
      const dispatcher = createModuleSystem({}, promptsDir);

      // Hook 1: pre-plan
      const prePlanResponse = mockAgentResponse([
        {
          module: 'security',
          check: 'pre-plan review',
          severity: 'info',
          finding: 'No concerns at planning stage',
        },
      ]);
      const prePlanResult = dispatcher.parseAndCheckFindings(prePlanResponse, 'pre-plan');
      persistFindings(codaRoot, 'multi-issue', prePlanResult);

      // Hook 2: post-build
      const postBuildResponse = mockAgentResponse([
        {
          module: 'security',
          check: 'secret scan',
          severity: 'critical',
          finding: 'API key found',
        },
        {
          module: 'tdd',
          check: 'coverage',
          severity: 'medium',
          finding: 'Missing tests for edge cases',
        },
      ]);
      const postBuildResult = dispatcher.parseAndCheckFindings(postBuildResponse, 'post-build');
      persistFindings(codaRoot, 'multi-issue', postBuildResult);

      // Verify accumulated data
      const data = loadFindings(codaRoot, 'multi-issue');
      expect(data.hookResults).toHaveLength(2);
      expect(data.hookResults[0]!.hookPoint).toBe('pre-plan');
      expect(data.hookResults[1]!.hookPoint).toBe('post-build');

      // Total findings across all hooks
      const totalFindings = data.hookResults.reduce(
        (sum, hr) => sum + hr.findings.length,
        0
      );
      expect(totalFindings).toBe(3);

      // Summary covers all hook results
      const summary = summarizeFindings(data.hookResults);
      expect(summary).toContain('security:');
      expect(summary).toContain('1 critical');
      expect(summary).toContain('(BLOCKED)');
      expect(summary).toContain('tdd:');
    });
  });

  // ─── Cross-cutting: No-JSON agent response ──────────────────────────────

  describe('Cross-cutting: No-JSON agent response fallback', () => {
    test('agent response with no JSON produces zero findings', () => {
      const dispatcher = createModuleSystem({}, promptsDir);

      const result = dispatcher.parseAndCheckFindings(
        'I reviewed the code and everything looks fine. No issues found.',
        'post-build'
      );

      expect(result.findings).toHaveLength(0);
      expect(result.blocked).toBe(false);
      expect(result.blockReasons).toHaveLength(0);
    });
  });
});
