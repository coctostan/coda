# v0.4: Dependency-Based Carry-Forward

**Package:** `coda` → `src/workflow/context-builder.ts`
**Modifies:** BUILD task context assembly

## Problem

v0.1-v0.3 injects the last 2-3 task summaries into each BUILD task's context (recency-based). But if task 5 depends on tasks 1 and 3 (not 4), it gets the wrong context — task 4's summary is irrelevant, task 1's summary is critical.

## Solution

Use the task's `depends_on` field to select carry-forward context. Fall back to recency only when no dependencies are declared.

## Logic

```typescript
function getCarryForwardSummaries(
  issueSlug: string,
  currentTask: TaskRecord,
  allTasks: TaskRecord[],
  maxSummaries: number = 3
): string {
  const completedTasks = allTasks.filter(t => t.status === 'complete');
  
  if (currentTask.depends_on && currentTask.depends_on.length > 0) {
    // Dependency-based: load summaries from depends_on tasks
    const depTasks = currentTask.depends_on
      .map(id => completedTasks.find(t => t.id === id))
      .filter(Boolean);
    return depTasks.map(t => formatTaskSummary(t)).join('\n\n');
  } else {
    // Recency fallback: last N completed tasks
    const recent = completedTasks
      .sort((a, b) => b.id - a.id)
      .slice(0, maxSummaries);
    return recent.map(t => formatTaskSummary(t)).join('\n\n');
  }
}

function formatTaskSummary(task: TaskRecord): string {
  // Read the task record, extract the ## Summary section
  const record = readRecord(task.path);
  const summary = getSection(record.body, 'Summary');
  return `### Task ${task.id}: ${task.title}\n${summary || '(no summary)'}`;
}
```

## Correction Task Context

Correction tasks get special carry-forward:
- The planned/correction tasks that originally covered the same AC (from `covers_ac` overlap)
- The verification failure artifact for the AC being fixed
- NOT recency-based (corrections need targeted context, not recent history)

```typescript
if (currentTask.kind === 'correction' && currentTask.fix_for_ac) {
  // Load source tasks that covered this AC
  const sourceTasks = completedTasks.filter(t => 
    t.covers_ac?.includes(currentTask.fix_for_ac!)
  );
  // Also load the failure artifact
  const failureArtifact = loadFailureArtifact(issueSlug, currentTask.fix_for_ac);
  return [...sourceTasks.map(formatTaskSummary), failureArtifact].join('\n\n');
}
```

## Files

```
packages/coda/src/workflow/context-builder.ts   # MODIFY: replace recency with dependency-based
```

## Tests

1. Task with depends_on [1, 3] gets summaries from tasks 1 and 3 (not 2)
2. Task with empty depends_on gets last 3 completed tasks (recency fallback)
3. Correction task gets source tasks + failure artifact
4. Missing dependency (task declared but not complete) → skipped gracefully
5. No completed tasks → empty string
