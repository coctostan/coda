# M2: State Engine — v0.1 Spec

**Package:** `@coda/core` → `src/state/`
**Depends on:** Nothing (zero internal dependencies)

## Purpose

In-memory state machine that tracks where we are in the issue lifecycle. Persists to JSON atomically. Provides gates that block invalid transitions.

## v0.1 Scope

- 7 phases, linear transitions only (no submodes)
- Basic gates for phase transitions
- Atomic JSON persist (write-to-temp, rename)
- State reconstruction not needed (v0.2+)

## State Schema (v0.1)

```typescript
interface CodaState {
  version: 1;
  focus_issue: string | null;      // active issue slug
  phase: Phase | null;              // current phase
  current_task: number | null;      // active task number during BUILD
  completed_tasks: number[];        // completed task numbers
  tdd_gate: "locked" | "unlocked"; // TDD write-gate state
  last_test_exit_code: number | null;
  task_tool_calls: number;          // tool calls in current task (stuck detection)
  enabled: boolean;                 // master on/off
}

type Phase = "specify" | "plan" | "review" | "build" | "verify" | "unify" | "done";
```

**v0.1 omits:** `submode`, `loop_iteration`, `build_mode`, `last_test_command`.

## Phase Transitions (v0.1)

Linear only — no backward transitions in v0.1:

```
specify → plan → review → build → verify → unify → done
```

Each transition goes through a gate check.

## Gates (v0.1)

```typescript
interface Gate {
  name: string;
  check: (data: GateCheckData) => { passed: boolean; reason?: string };
}

// v0.1 gates:
const GATES: Record<string, Gate> = {
  "specify→plan": {
    check: (d) => ({
      passed: (d.issueAcCount ?? 0) > 0,
      reason: "Issue must have at least one acceptance criterion"
    })
  },
  "plan→review": {
    check: (d) => ({
      passed: d.planExists === true,
      reason: "Plan must exist before review"
    })
  },
  "review→build": {
    check: (d) => ({
      passed: d.planApproved === true,
      reason: "Plan must be approved before build"
    })
  },
  "build→verify": {
    check: (d) => ({
      passed: d.allPlannedTasksComplete === true,
      reason: "All planned tasks must be complete"
    })
  },
  "verify→unify": {
    check: (d) => ({
      passed: d.allAcsMet === true,
      reason: "All acceptance criteria must be met"
    })
  },
  "unify→done": {
    check: (d) => ({
      passed: d.completionRecordExists === true,
      reason: "Completion record must exist"
    })
  }
};
```

## GateCheckData (v0.1)

```typescript
interface GateCheckData {
  issueAcCount?: number;
  planExists?: boolean;
  planApproved?: boolean;
  allPlannedTasksComplete?: boolean;
  allAcsMet?: boolean;
  completionRecordExists?: boolean;
}
```

**v0.1 omits:** `openQuestionsCount`, `humanReviewStatus`, `allAcsCovered`, `fullSuitePassed`, `referenceDocsReviewed`, `milestoneUpdated`, `systemSpecUpdated`, `specDeltaExists`, `moduleBlockFindings`.

## Atomic Persist

```typescript
// Write state to disk atomically
function persistState(state: CodaState, path: string): void {
  const tmp = path + '.tmp';
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, path);  // atomic on most filesystems
}

// On startup: if .tmp exists, delete it (failed write)
function loadState(path: string): CodaState | null {
  const tmp = path + '.tmp';
  if (existsSync(tmp)) unlinkSync(tmp);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}
```

## Files to Create

```
packages/core/src/state/
├── machine.ts       # Phase transitions, valid moves
├── store.ts         # In-memory state + atomic JSON persist
├── gates.ts         # Gate interface + v0.1 gate implementations
└── types.ts         # CodaState, Phase, GateCheckData, Gate types
```

## Tests

```
packages/core/src/state/__tests__/
├── machine.test.ts  # Valid/invalid transitions
├── store.test.ts    # Persist, load, atomic write safety
└── gates.test.ts    # Each gate passes and fails correctly
```

## Key Test Cases

1. `specify → plan` passes when ACs exist, fails when empty
2. `build → verify` fails when tasks incomplete
3. State persists and reloads correctly
4. Atomic write: if process dies mid-write, old state is intact
5. Invalid transitions (e.g., `specify → build`) are rejected
6. TDD gate state: locked by default, unlock/relock cycle
