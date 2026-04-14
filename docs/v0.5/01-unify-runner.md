# v0.5: Full UNIFY Runner

**Package:** `coda` → `src/workflow/unify-runner.ts` (NEW)
**Modifies:** `phase-runner.ts` (wire into unify case)

## Problem

UNIFY currently assembles context and sets a system prompt ("close the loop"), but has zero compounding side effects. The agent is told to update ref docs but nothing enforces or orchestrates it. Spec delta goes unmerged, completion records are optional, milestones don't advance, and post-unify hooks never fire.

## Solution

A `unify-runner.ts` that orchestrates the compounding step: reads the issue's spec delta, merges it into ref-system.md, updates related ref docs, writes a completion record, advances milestone progress, and fires post-unify module hooks.

## UNIFY Steps (in order)

### Step 1: Load Context
```typescript
function loadUnifyContext(codaRoot: string, issueSlug: string): UnifyContext {
  const issue = loadIssue(codaRoot, issueSlug);
  const plan = loadPlan(codaRoot, issueSlug);
  const tasks = loadTasks(codaRoot, issueSlug);
  const refs = loadRefDocs(codaRoot);
  const findings = loadModuleFindingsSummary(codaRoot, issueSlug);
  const completedTasks = tasks.filter(t => t.frontmatter.status === 'complete');
  return { issue, plan, completedTasks, refs, findings };
}
```

### Step 2: Compute Spec Delta
```typescript
function computeSpecDelta(
  issue: IssueRecord,
  completedTasks: TaskRecord[]
): SpecDeltaSummary {
  // Read issue.spec_delta (from SPECIFY phase)
  // Compute actual delta from completed tasks (what was actually built)
  // Return: { planned: issue.spec_delta, actual: computed, drift: diff }
}
```

The "actual" delta is built from task summaries and AC results — what the system can actually do now.

### Step 3: Merge Spec Delta into ref-system.md
```typescript
function mergeSpecDelta(
  codaRoot: string,
  delta: SpecDeltaSummary,
  ceremonyRules: CeremonyRules
): MergeResult {
  // Read current ref-system.md
  // Apply delta.actual (what was built)
  // If ceremonyRules.unifyFull: also update ref-prd.md, ref-conventions.md
  // Write updated ref docs
  // Return: { filesUpdated, sectionsChanged }
}
```

The agent performs the actual merge — this function provides the context and writes the result.

### Step 4: Write Completion Record
```typescript
interface CompletionData {
  issue: string;
  title: string;
  completedAt: string;
  acResults: Array<{ id: string; status: 'met' | 'not-met'; evidence: string }>;
  deviations: string[];
  specDelta: SpecDeltaSummary;
  decisions: string[];
  moduleFindingsSummary: string;
  filesChanged: string[];
}

function writeCompletionRecord(codaRoot: string, data: CompletionData): string {
  // Write to .coda/issues/{slug}/completion.md
  // Return file path
}
```

### Step 5: Advance Milestone
```typescript
function advanceMilestone(codaRoot: string, issueSlug: string): void {
  // Read issue's milestone field
  // If milestone set: read milestone record, increment completed count
  // Write updated milestone
}
```

### Step 6: Fire Post-UNIFY Hooks
```typescript
function firePostUnifyHooks(codaRoot: string, issueSlug: string, changedFiles: string[]): HookResult {
  // Dispatch post-unify hooks: quality (p100), knowledge (p200)
  // Quality records delta in quality history
  // Knowledge captures decisions, rationale, lessons
}
```

## Integration into phase-runner.ts

Replace the current `unify` case with:

```typescript
case 'unify': {
  const unifyCtx = loadUnifyContext(codaRoot, issueSlug);
  const ceremonyRules = getCeremonyRules(issue.issue_type, config?.ceremony_overrides?.[issue.issue_type]);
  
  // Assemble agent context with spec delta + merge instructions
  return withMetadata({
    systemPrompt: buildUnifySystemPrompt(ceremonyRules),
    context: assembleUnifyContext(unifyCtx, ceremonyRules),
  }, phase, state, issueSlug, codaRoot);
}
```

## Files

```
packages/coda/src/workflow/
├── unify-runner.ts      # NEW: UnifyContext, loadUnifyContext, computeSpecDelta, writeCompletionRecord
├── phase-runner.ts      # MODIFY: wire unify-runner into unify case
```

## Tests

1. loadUnifyContext loads issue, plan, tasks, refs, findings
2. computeSpecDelta extracts planned + actual delta
3. writeCompletionRecord creates file with correct frontmatter and AC results
4. advanceMilestone increments milestone progress
5. Lightweight unify (chore) skips spec delta merge and ref doc updates
6. Full unify (feature) includes spec delta merge and ref doc updates
