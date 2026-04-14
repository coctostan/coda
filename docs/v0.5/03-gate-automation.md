# v0.5: Gate Automation

**Package:** `coda` → `src/forge/types.ts` (MODIFY), `src/workflow/` (MODIFY)
**Modifies:** CodaConfig, scaffold defaults, phase-runner gate checks

## Problem

Every phase transition requires human approval by default. For mature projects or routine work (chores, docs), this creates friction without proportional value. Teams need configurable automation levels per gate.

## Solution

Three automation modes per gate, configurable in `coda.json` and overridable per issue type:

- **`human`** — always requires explicit human approval (default)
- **`auto`** — gate passes automatically (no human interaction)
- **`auto-unless-block`** — passes automatically unless a module finding exceeds its threshold, in which case it blocks for human review

## Gate Points

| Gate | Controls | Default |
|------|----------|---------|
| `specify_approval` | SPECIFY → PLAN transition | human |
| `plan_review` | PLAN → BUILD transition (human plan review) | human |
| `build_review` | BUILD → VERIFY transition (autonomous review result) | auto-unless-block |
| `spec_delta_review` | UNIFY spec delta merge approval | auto |
| `reference_doc_updates` | UNIFY ref doc update approval | auto |
| `module_findings` | Any module finding exceeding threshold | auto-unless-block |

## Config Shape

```typescript
type GateMode = 'human' | 'auto' | 'auto-unless-block';

interface GateAutomation {
  specify_approval: GateMode;
  plan_review: GateMode;
  build_review: GateMode;
  spec_delta_review: GateMode;
  reference_doc_updates: GateMode;
  module_findings: GateMode;
}
```

In `coda.json`:
```json
{
  "gates": {
    "specify_approval": "human",
    "plan_review": "human",
    "build_review": "auto-unless-block",
    "spec_delta_review": "auto",
    "reference_doc_updates": "auto",
    "module_findings": "auto-unless-block"
  },
  "gate_overrides": {
    "chore": {
      "plan_review": "auto",
      "specify_approval": "auto"
    },
    "docs": {
      "plan_review": "auto",
      "specify_approval": "auto",
      "build_review": "auto"
    }
  }
}
```

## Gate Resolution

```typescript
function resolveGateMode(
  gate: keyof GateAutomation,
  issueType: string,
  config: CodaConfig
): GateMode {
  // 1. Check issue-type override: config.gate_overrides?.[issueType]?.[gate]
  // 2. Fall back to project default: config.gates?.[gate]
  // 3. Fall back to hardcoded default (human for plan_review/specify_approval, auto-unless-block for others)
  return resolved;
}

function shouldGateBlock(
  gate: keyof GateAutomation,
  mode: GateMode,
  hasBlockingFindings: boolean
): boolean {
  switch (mode) {
    case 'human': return true;  // always pause for human
    case 'auto': return false;  // always pass
    case 'auto-unless-block': return hasBlockingFindings;
  }
}
```

## Integration Points

### Phase Runner
At each gate point, call `resolveGateMode` to determine whether to pause for human approval or auto-advance.

### State Engine
When a gate blocks, the state records `gate_status: 'awaiting_human'` with the gate name. When the human approves (via `/coda advance approve`), the gate clears.

### Ceremony Rules
`CeremonyRules` already defines `humanReviewDefault` and `reviewEnabled`. Gate automation generalizes this: ceremony rules set defaults, gate config overrides per project, gate_overrides override per issue type.

## Files

```
packages/coda/src/forge/types.ts         # MODIFY: add GateAutomation, GateMode to CodaConfig
packages/coda/src/forge/scaffold.ts      # MODIFY: default gates in scaffoldCoda
packages/coda/src/workflow/gate.ts       # NEW: resolveGateMode, shouldGateBlock
packages/coda/src/workflow/phase-runner.ts  # MODIFY: use gate resolution at transition points
```

## Tests

1. resolveGateMode with no overrides → returns project default
2. resolveGateMode with issue-type override → override wins
3. resolveGateMode with missing config → returns hardcoded default
4. shouldGateBlock: human → always true
5. shouldGateBlock: auto → always false
6. shouldGateBlock: auto-unless-block + no findings → false
7. shouldGateBlock: auto-unless-block + blocking findings → true
8. Default scaffold config has correct gate defaults
