# v0.4: Context Budget Management

**Package:** `coda` → `src/workflow/context-builder.ts`
**Modifies:** all phase context assembly

## Problem

Each phase injects context via `before_agent_start`. Without budgets, context grows unbounded — a mature project with large ref docs, many task summaries, and accumulated module findings could blow past useful context limits.

## Solution

Per-phase context budgets (in tokens, estimated). The context builder targets a budget per phase, omitting lower-priority content to stay within limits. Budgets are advisory — the builder doesn't truncate mid-section.

## Phase Budgets (from v7 spec)

| Phase | Budget Target | Primary Content | Secondary Content |
|-------|---------------|-----------------|-------------------|
| SPECIFY | ~4K tokens | Issue + relevant ref-system sections + ref-prd | Recent related records |
| PLAN | ~6K tokens | Issue + ACs + architecture + conventions | Prior records, ref-system |
| REVIEW | ~4K tokens | Plan + tasks + AC list | Revision instructions |
| BUILD | ~4K tokens | Task record + topic-matched conventions | Dependency task summaries |
| VERIFY | ~6K tokens | Issue ACs + all task summaries + plan | Module findings summary |
| UNIFY | ~8K tokens | Issue + plan + all summaries + ref docs | Module findings, decisions |

## Implementation

```typescript
interface ContextBudget {
  targetTokens: number;
  sections: ContextSection[];
}

interface ContextSection {
  label: string;            // for logging: "ref-system (auth section)"
  content: string;          // the actual content
  priority: "required" | "high" | "medium" | "low";
  estimatedTokens: number;  // rough estimate: chars / 4
}

function assembleWithinBudget(sections: ContextSection[], targetTokens: number): string {
  // 1. Always include "required" sections
  // 2. Add "high" priority until budget approached
  // 3. Add "medium" if room remains
  // 4. "low" only if significant room
  // 5. Never truncate a section mid-content — include or exclude whole sections
  
  let result = '';
  let usedTokens = 0;
  
  const sorted = sections.sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority));
  
  for (const section of sorted) {
    if (section.priority === 'required' || usedTokens + section.estimatedTokens <= targetTokens) {
      result += `\n\n${section.content}`;
      usedTokens += section.estimatedTokens;
    }
  }
  
  return result;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);  // rough approximation
}
```

## Priority Assignments per Phase

### BUILD (per-task)
- **Required:** Task record (objective, truths, test scenarios)
- **Required:** TDD module prompt
- **High:** Dependency task summaries
- **Medium:** Topic-matched conventions
- **Low:** Module findings from pre-build

### VERIFY
- **Required:** Issue ACs
- **High:** All task summaries
- **High:** Module findings summary (post-build)
- **Medium:** Plan overview
- **Low:** Spec delta

### UNIFY
- **Required:** Issue + ACs + spec delta
- **Required:** ref-system.md (for delta merge)
- **High:** All task summaries
- **High:** Plan overview
- **Medium:** Module findings aggregate
- **Low:** Decision records, convention sections

## Module Findings Summarization

Module findings are summarized across phases to save context:

```typescript
function summarizeModuleFindings(hookResults: HookResult[]): string {
  // Group by module
  const byModule: Record<string, Finding[]> = {};
  for (const hr of hookResults) {
    for (const f of hr.findings) {
      (byModule[f.module] ??= []).push(f);
    }
  }
  
  // Summary per module: "security: 1 critical (BLOCKED), 2 info"
  const lines = Object.entries(byModule).map(([mod, findings]) => {
    const counts = findings.reduce((acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const parts = Object.entries(counts).map(([sev, n]) => `${n} ${sev}`);
    return `${mod}: ${parts.join(', ')}`;
  });
  
  return `## Module Findings Summary\n${lines.join('\n')}`;
}
```

Full findings detail is available via `coda_read` on `module-findings.json` — the context summary is just the overview.

## Files

```
packages/coda/src/workflow/context-builder.ts   # MODIFY: add budget management
```

## Tests

1. Required sections always included (even if over budget)
2. High sections included until budget reached
3. Medium/low sections omitted when budget tight
4. Sections never truncated mid-content
5. Module findings summarized to one-line-per-module format
6. Empty findings → no summary section
7. estimateTokens roughly correct (within 2x of actual)
