# M6: Workflow Engine — v0.1 Spec

**Package:** `coda` → `src/workflow/`
**Depends on:** M1 (data), M2 (state), M3 (tools), M4 (modules)

## Purpose

Orchestrates the issue lifecycle. Runs sessions, injects context, manages the BUILD loop. This is the brain.

## v0.1 Scope

- Linear phase runner (no autonomous review/revise or verify/correct loops)
- BUILD loop with newSession per task
- Basic context injection per phase
- No adaptive ceremony (all issues get full flow)

## Phase Runner

The phase runner doesn't automate phase transitions — it provides the right context when the agent enters each phase. The LLM (or human) calls `coda_advance` to move between phases.

```typescript
function getPhaseContext(phase: Phase, issueSlug: string): PhaseContext {
  switch (phase) {
    case 'specify':
      return {
        systemPrompt: "You are specifying an issue...",
        context: loadIssue(issueSlug) + loadRefSystem() + loadRefPrd()
      };
    case 'plan':
      return {
        systemPrompt: "You are planning tasks for this issue...",
        context: loadIssue(issueSlug) + loadRefSystem()
      };
    case 'review':
      return {
        systemPrompt: "You are reviewing the plan...",
        context: loadIssue(issueSlug) + loadPlan(issueSlug) + loadTasks(issueSlug)
      };
    case 'build':
      return buildTaskContext(issueSlug);  // per-task, see BUILD loop
    case 'verify':
      return {
        systemPrompt: "You are verifying acceptance criteria...",
        context: loadIssue(issueSlug) + loadAllTaskSummaries(issueSlug)
      };
    case 'unify':
      return {
        systemPrompt: "You are closing the loop...",
        context: loadIssue(issueSlug) + loadPlan(issueSlug)
                 + loadAllTaskSummaries(issueSlug) + loadRefSystem()
      };
  }
}
```

## BUILD Loop

The core autonomous engine. Runs each task in sequence with a fresh session.

```
for each task (ordered by id):
  1. newSession()                     // fresh context
  2. inject task context via before_agent_start:
     - Task record (objective, truths, artifacts, key_links, test scenarios)
     - Todd module prompt (TDD enforcement)
     - Previous task summaries (carry-forward)
  3. sendUserMessage("Execute this task")
  4. await agent_end                  // completion detection
  5. Walt module runs (post-task quality check)
  6. If quality passes:
     - Task status → complete
     - Write task summary via coda_edit_body
     - git add + git commit with task-derived message
  7. Advance to next task
```

### Per-Task Context

```typescript
function buildTaskContext(issueSlug: string): PhaseContext {
  const state = loadState();
  const task = loadTask(issueSlug, state.current_task);
  const prevSummaries = getPreviousTaskSummaries(issueSlug, state);
  const toddPrompt = getModulePrompts('pre-build');

  return {
    systemPrompt: `You are executing task ${state.current_task}. Follow TDD.`,
    context: [
      `## Task: ${task.frontmatter.title}`,
      task.body,
      `## Truths\n${task.frontmatter.truths.join('\n')}`,
      `## Previous Tasks\n${prevSummaries}`,
      toddPrompt.join('\n')
    ].join('\n\n')
  };
}
```

### Carry-Forward

v0.1 uses simple recency: inject summaries from the last 2-3 completed tasks. No dependency-based carry-forward yet.

## SPECIFY Flow

Conversational. Human in the loop. Agent helps draft ACs.

1. Agent reads issue + ref-system.md
2. Agent and human discuss requirements
3. Agent drafts ACs with IDs (AC-1, AC-2, etc.)
4. Agent drafts spec delta (what changes to ref-system.md)
5. Human approves
6. Agent calls coda_update to write ACs and spec_delta
7. Human calls `/coda advance` or agent calls coda_advance

## PLAN Flow

Autonomous. Agent reads issue and produces plan + tasks.

1. Fresh session with issue context
2. Agent designs approach
3. Agent calls coda_create for plan record
4. Agent calls coda_create for each task record
5. Phase advances to REVIEW

## REVIEW Flow (v0.1 — single pass)

Autonomous. No review/revise loop. Agent checks plan quality in one pass.

1. Fresh session with plan + tasks context
2. Agent checks: AC coverage, dependency ordering, scope
3. If issues found: agent fixes them directly (updates plan/tasks)
4. Sets plan.status = approved
5. Phase advances to BUILD

## VERIFY Flow (v0.1 — single pass)

Autonomous. No verify/correct loop.

1. Fresh session with ACs + all task summaries
2. Agent checks each AC against built artifacts
3. Runs full test suite via coda_run_tests
4. Sets each AC status to met/not-met
5. If all met: phase advances to UNIFY
6. If not met: pauses for human intervention (v0.1 has no correction loop)

## UNIFY Flow (v0.1 — minimal)

Autonomous.

1. Fresh session with everything
2. Agent writes completion record via coda_create
3. Agent reads spec delta from issue
4. Agent updates ref-system.md via coda_edit_body (ADDED/MODIFIED/REMOVED)
5. Phase advances to DONE

## VCS (v0.1)

- On issue activation: `git checkout -b feat/{slug}`
- After each BUILD task: `git add . && git commit -m "{task title}"`
- On DONE: branch exists, ready for manual PR/merge
- No automated PR creation in v0.1

## Files

```
packages/coda/src/workflow/
├── phase-runner.ts      # Per-phase context assembly
├── build-loop.ts        # Autonomous task execution loop
└── context-builder.ts   # Load and assemble context from mdbase
```

## Tests

- Phase runner returns correct context for each phase
- Build loop sequences tasks correctly
- Context builder loads the right records
- VCS: branch created on issue activation, commits after tasks
