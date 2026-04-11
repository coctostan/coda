# v0.5: Session Management — /coda pause + /coda resume

**Package:** `coda` → `src/pi/commands.ts` (MODIFY), `src/workflow/` (NEW helpers)

## Problem

Agent sessions end when the human leaves. On return, the agent has no memory of prior context, decisions, or in-progress work. The human has to manually re-explain where things stand.

## Solution

`/coda pause` writes a handoff artifact to disk. `/coda resume` reads the handoff + state.json to reconstruct context for the agent. No session state capture needed — everything is on disk.

## /coda pause

Writes `.coda/handoff.md` with:

```markdown
---
paused_at: 2026-04-03T15:30:00Z
focus_issue: my-feature
phase: build
current_task: 3
completed_tasks: [1, 2]
---

## In-Progress Work
Task 3: Create login endpoint with JWT
- Started implementation in src/api/auth/login.ts
- JWT library installed, basic structure done
- Still need: input validation, error handling, tests

## Decisions Made This Session
- Using bcrypt for password hashing (not argon2) — simpler dependency
- JWT expiry set to 15min with refresh token pattern

## Open Questions
- Should refresh tokens be stored in DB or Redis?

## Next Steps
1. Finish Task 3 implementation
2. Run Task 3 verification
3. If pass, proceed to Task 4
```

### Implementation

```typescript
function codaPause(codaRoot: string): PauseResult {
  const state = loadState(statePath);
  const focusIssue = state?.focus_issue;
  
  if (!focusIssue) {
    return { success: false, message: 'No active issue to pause.' };
  }
  
  // The agent writes the handoff content — we provide the template
  const template = buildPauseTemplate(state, codaRoot);
  
  // Write handoff artifact
  writeRecord(join(codaRoot, 'handoff.md'), {
    paused_at: new Date().toISOString(),
    focus_issue: focusIssue,
    phase: state.phase,
    current_task: state.current_task,
    completed_tasks: state.completed_tasks,
  }, template);
  
  return { success: true, message: `Paused. Handoff written to .coda/handoff.md` };
}
```

## /coda resume

Reads `.coda/handoff.md` + `state.json` and assembles a rich context for the agent:

```typescript
function codaResume(codaRoot: string): ResumeContext {
  const state = loadState(statePath);
  const handoff = readHandoff(codaRoot);
  
  if (!handoff) {
    // No handoff — just return current state
    return { hasHandoff: false, state, context: buildStateOnlyContext(state) };
  }
  
  // Rich context from handoff + state
  return {
    hasHandoff: true,
    state,
    context: buildResumeContext(state, handoff),
    focusIssue: handoff.frontmatter.focus_issue,
    phase: handoff.frontmatter.phase,
    currentTask: handoff.frontmatter.current_task,
  };
}
```

The resume context includes:
- Where we are (issue, phase, task)
- What was in progress
- Decisions made
- Open questions
- Next steps
- Current task record (loaded fresh from disk)

## Command Registration

```typescript
case 'pause': {
  const result = codaPause(codaRoot);
  ctx.ui.notify(result.message);
  return;
}

case 'resume': {
  const resumeCtx = codaResume(codaRoot);
  if (resumeCtx.hasHandoff) {
    ctx.ui.notify(
      `Resuming: ${resumeCtx.focusIssue} at ${resumeCtx.phase}\n\n` +
      resumeCtx.context
    );
  } else {
    ctx.ui.notify(codaStatus(codaRoot).summary);
  }
  // Clean up handoff after successful resume
  unlinkSync(join(codaRoot, 'handoff.md'));
  return;
}
```

## Files

```
packages/coda/src/workflow/session.ts    # NEW: codaPause, codaResume, buildPauseTemplate, buildResumeContext
packages/coda/src/pi/commands.ts         # MODIFY: add pause + resume cases
```

## Tests

1. codaPause writes handoff.md with correct frontmatter
2. codaPause with no active issue returns error
3. codaResume reads handoff + state
4. codaResume with no handoff returns state-only context
5. codaResume cleans up handoff.md after successful resume
6. buildPauseTemplate includes task progress and current phase
7. buildResumeContext includes in-progress work and next steps
