# v0.3: Workflow Integration

**Package:** `coda` → `src/workflow/`, `src/pi/`
**Depends on:** 01-03 (core module system), 04 (prompts)

## Purpose

Wire the module system into the existing workflow engine. Modules fire at phase boundaries, findings are persisted, and blocks prevent phase advancement.

## Where Hooks Fire in the Workflow

```
SPECIFY ────────────────────────────────────────────▶ PLAN
                                               [pre-plan hooks]
                                                      │
PLAN ──────────────────────────────────────────────▶ REVIEW
                                                      │
REVIEW/REVISE ─────────────────────────────────────▶ BUILD
                                               [pre-build hooks]
                                                      │
              ┌───────────────────────────────────────┘
              │
    ┌─────────▼──────────┐
    │  Task 1             │
    │  [TDD + quality     │
    │   pre-build injected]│
    │                     │──▶ [post-task hooks]
    └─────────────────────┘
              │
    ┌─────────▼──────────┐
    │  Task 2             │──▶ [post-task hooks]
    └─────────────────────┘
              │
        [post-build hooks] ◀── security, architecture, tdd, quality, knowledge
              │
              ├── BLOCKED? → Show findings, require resolution before VERIFY
              │
              ▼
VERIFY ────────────────────────────────────────────▶ UNIFY
                                               [post-unify hooks]
                                                      │
UNIFY ─────────────────────────────────────────────▶ DONE
```

## Integration Points

### 1. pre-plan (before PLAN session)

**Trigger:** When phase transitions to `plan` (in phase-runner.ts)

**Modules at this hook:** security (80), architecture (75)

**Behavior:**
- Dispatcher runs pre-plan hooks
- Findings injected into the PLAN session's context as advisory
- Block findings added as constraints the plan must address
- **Does NOT block PLAN from starting** — it informs the planner

```typescript
// In phase-runner.ts, plan context assembly:
const prePlanResult = await dispatcher.runHook('pre-plan', {
  issueSlug: slug,
  phase: 'plan',
  submode: null,
});
// Inject findings as context
planContext += formatFindingsAsContext(prePlanResult.findings);
// If blocked, add as mandatory constraints
if (prePlanResult.blocked) {
  planContext += `\n\n## MODULE BLOCKS — Must Address in Plan\n`;
  planContext += prePlanResult.blockReasons.join('\n');
}
```

### 2. pre-build (before BUILD loop)

**Trigger:** When BUILD loop starts (in build-loop.ts)

**Modules at this hook:** tdd (100), quality (100)

**Behavior:**
- TDD prompt injected into each task's context (same as v0.1/v0.2 but now via dispatcher)
- Quality baseline captured before first task

```typescript
// In build-loop.ts, before first task:
const preBuildResult = await dispatcher.runHook('pre-build', {
  issueSlug: slug,
  phase: 'build',
  submode: null,
});
// TDD prompt is part of the task context
// Quality baseline stored for post-build comparison
```

### 3. post-task (after each BUILD task)

**Trigger:** After each task completes in build-loop.ts

**Modules at this hook:** tdd (100)

**Behavior:**
- TDD module checks: were tests written first? Do tests cover scenarios?
- Findings recorded but generally don't block (task is already done)
- If a critical finding emerges, the next task's context includes it

### 4. post-build (after all BUILD tasks)

**Trigger:** After all tasks complete, before advancing to VERIFY

**Modules at this hook:** security (130), architecture (125), tdd (200), quality (100), knowledge (300)

**This is the main checkpoint.** All 5 modules fire.

**Behavior:**
- Module prompts assembled and injected into the post-build phase session
- Agent analyzes and produces findings as JSON in its response
- Dispatcher parses and validates findings
- Findings collected and persisted
- **If any module blocks:** automation pauses for human (not automatic corrective session)
  - Human shown: "Module findings require attention before VERIFY"
  - Block reasons listed with assumption fields
  - Human resolves: fix code manually, override via `/coda advance`, or `/coda kill`

**Gate integration:** Module block status is added to `GateCheckData`:
```typescript
interface GateCheckData {
  // ... existing fields ...
  moduleBlockFindings?: number;  // count of findings exceeding block threshold
}

// build→verify gate updated:
"build→verify": {
  check: (d) => {
    if (!d.allPlannedTasksComplete) return { passed: false, reason: "All tasks must be complete" };
    if ((d.moduleBlockFindings ?? 0) > 0) return { passed: false, reason: "Module findings require attention" };
    return { passed: true };
  }
}
```

This means `coda_advance` is the single authority for advancement. Module blocks don't bypass the gate system — they're integrated into it.
```

### 5. post-unify (after UNIFY)

**Trigger:** After UNIFY phase completes

**Modules at this hook:** quality (100), knowledge (200)

**Behavior:**
- Quality module: compute quality delta (before vs after), write to completion record
- Knowledge module: extract decisions, patterns, lessons from the issue
- **Never blocks** — UNIFY is closing the loop, these are advisory

## Findings Persistence

All module findings are written to disk per issue:

```
.coda/issues/{slug}/module-findings.json
```

Structure:
```json
{
  "issue": "add-calculator",
  "hookResults": [
    {
      "hookPoint": "pre-plan",
      "findings": [...],
      "blocked": false,
      "timestamp": "2026-03-28T10:00:00Z"
    },
    {
      "hookPoint": "post-build",
      "findings": [...],
      "blocked": true,
      "blockReasons": ["SECURITY BLOCK: Hardcoded API key in src/config.ts"],
      "timestamp": "2026-03-28T11:30:00Z"
    }
  ]
}
```

This file grows throughout the issue lifecycle. Each hook run appends to the `hookResults` array.

## Context Summarization

When module findings are included in cross-phase context (e.g., VERIFY sees post-build findings), they're summarized:

```typescript
function summarizeFindings(hookResults: HookResult[]): string {
  // Group by module
  // Show: module name, finding count by severity, block status
  // Example: "security: 1 critical (BLOCKED), 2 info | architecture: 1 medium, 3 info"
  // Detail only for blocked or high+ severity findings
  // Full details available via coda_read on module-findings.json
}
```

This keeps cross-phase context within budget while preserving essential information.

## Changes to Existing Files

| File | Change |
|------|--------|
| `workflow/phase-runner.ts` | Add dispatcher.runHook calls at phase boundaries |
| `workflow/build-loop.ts` | Add pre-build, post-task, post-build hook dispatch |
| `workflow/context-builder.ts` | Include summarized findings in phase context |
| `pi/hooks.ts` | Module prompts injected via before_agent_start (already supports custom context) |
| `tools/coda-advance.ts` | Check for module blocks before allowing advancement |

## Files

```
packages/coda/src/workflow/
├── module-integration.ts    # NEW: wire dispatcher into workflow phases
```

(Plus modifications to existing workflow files listed above)

## Tests

### Unit Tests
1. pre-plan findings injected into plan context
2. post-build block prevents advancement to VERIFY
3. post-build non-block allows advancement
4. Findings persisted to module-findings.json after each hook
5. Cross-phase context summarization (long findings → concise summary)
6. Human override (`/coda advance`) bypasses module block
7. post-unify findings appended to completion record

### Integration Tests
8. Full lifecycle with security module enabled: issue with clean code → no blocks
9. Full lifecycle with security module: issue with hardcoded secret → post-build blocks
10. Module disabled in config → its hooks don't fire
