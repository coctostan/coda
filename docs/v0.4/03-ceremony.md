# v0.4: Adaptive Ceremony

**Package:** `coda` → `src/workflow/ceremony.ts` (NEW)
**Integrates with:** phase-runner.ts, context-builder.ts

## Problem

v0.1-v0.3 treats every issue the same: full SPECIFY → PLAN → REVIEW → BUILD → VERIFY → UNIFY. But a bug fix doesn't need the same ceremony as a new feature. A chore doesn't need TDD. A docs issue doesn't need autonomous verify.

## Solution

Rules per issue type that control: which phases are active, which modules fire, whether TDD is enforced, and whether human review is required.

## Ceremony Table (from v7 spec)

| Phase | Feature | Bugfix | Refactor | Chore | Docs |
|-------|---------|--------|----------|-------|------|
| SPECIFY | Full AC + spec delta | AC = bug repro + spec delta | AC = behavior unchanged | Lightweight | Content scope |
| PLAN | Full tasks | Plan + repro test scenario | Plan (no new tests) | Minimal | Outline |
| REVIEW | Full autonomous loop | Full loop | Lighter (1 iteration max) | Skip | Skip |
| Human review | Yes (default) | Configurable | No | No | No |
| BUILD | TDD per task | TDD per task | TDD (existing tests) | Execute (no TDD) | Write |
| VERIFY | AC evidence + full suite | Repro test + suite | Existing suite passes | Suite passes | Human review |
| UNIFY | Full record + spec delta merge | Record + spec delta | Record | Record | Record |

## Implementation

```typescript
interface CeremonyRules {
  reviewEnabled: boolean;
  reviewMaxIterations: number;
  humanReviewDefault: boolean;
  tddEnabled: boolean;
  verifyEnabled: boolean;
  verifyMaxIterations: number;
  unifyFull: boolean;            // full (spec delta + ref update) vs lightweight (record only)
  modulesEnabled: boolean;
  specDeltaRequired: boolean;
}

const CEREMONY_DEFAULTS: Record<string, CeremonyRules> = {
  feature: {
    reviewEnabled: true,
    reviewMaxIterations: 3,
    humanReviewDefault: true,
    tddEnabled: true,
    verifyEnabled: true,
    verifyMaxIterations: 3,
    unifyFull: true,
    modulesEnabled: true,
    specDeltaRequired: true,
  },
  bugfix: {
    reviewEnabled: true,
    reviewMaxIterations: 3,
    humanReviewDefault: true,
    tddEnabled: true,
    verifyEnabled: true,
    verifyMaxIterations: 2,
    unifyFull: true,
    modulesEnabled: true,
    specDeltaRequired: true,
  },
  refactor: {
    reviewEnabled: true,
    reviewMaxIterations: 1,    // lighter review
    humanReviewDefault: false,
    tddEnabled: true,
    verifyEnabled: true,
    verifyMaxIterations: 2,
    unifyFull: false,          // record only
    modulesEnabled: true,
    specDeltaRequired: true,
  },
  chore: {
    reviewEnabled: false,      // skip review entirely
    reviewMaxIterations: 0,
    humanReviewDefault: false,
    tddEnabled: false,         // no TDD
    verifyEnabled: true,
    verifyMaxIterations: 1,
    unifyFull: false,
    modulesEnabled: false,     // no modules
    specDeltaRequired: false,
  },
  docs: {
    reviewEnabled: false,
    reviewMaxIterations: 0,
    humanReviewDefault: false,
    tddEnabled: false,
    verifyEnabled: false,       // human review instead
    verifyMaxIterations: 0,
    unifyFull: false,
    modulesEnabled: false,
    specDeltaRequired: false,
  },
};

function getCeremonyRules(issueType: string, config?: CodaConfig): CeremonyRules {
  const defaults = CEREMONY_DEFAULTS[issueType] ?? CEREMONY_DEFAULTS.feature;
  // Config overrides per issue type (from coda.json)
  const overrides = config?.ceremony_overrides?.[issueType];
  return { ...defaults, ...overrides };
}
```

## Integration Points

### Phase Runner
```typescript
const rules = getCeremonyRules(issue.issue_type, config);

// Skip REVIEW if not enabled
if (phase === 'review' && !rules.reviewEnabled) {
  // Auto-advance: plan → build (skip review entirely)
}

// Use issue-type max iterations
if (phase === 'review') {
  maxIterations = rules.reviewMaxIterations;
}
```

### Build Loop
```typescript
if (!rules.tddEnabled) {
  // Don't lock TDD gate — allow direct writes
  state.tdd_gate = 'unlocked';  // permanently for this issue
}
```

### Module Dispatcher
```typescript
if (!rules.modulesEnabled) {
  // Skip all module hooks for this issue
  return { findings: [], blocked: false, hookPoint, blockReasons: [], timestamp: now };
}
```

### Context Builder
```typescript
if (!rules.specDeltaRequired) {
  // Don't inject spec delta context or require it in UNIFY
}
```

## Config Override

In `coda.json`:
```json
{
  "ceremony_overrides": {
    "bugfix": {
      "humanReviewDefault": false
    },
    "chore": {
      "tddEnabled": true
    }
  }
}
```

## Files

```
packages/coda/src/workflow/
├── ceremony.ts          # NEW: CeremonyRules, CEREMONY_DEFAULTS, getCeremonyRules
```

## Tests

1. Feature gets full ceremony (all enabled)
2. Chore skips review, TDD, modules
3. Docs skips review, TDD, verify
4. Bugfix with config override disables human review
5. Unknown issue type falls back to feature defaults
6. getCeremonyRules merges defaults with config overrides
