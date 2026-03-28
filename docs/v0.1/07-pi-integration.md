# M7: Pi Integration — v0.1 Spec

**Package:** `coda` → `src/pi/`
**Depends on:** M1-M6 (everything)

## Purpose

Wire CODA into Pi as an extension. Register commands, tools, hooks. This is the thin glue layer — all logic lives in lower layers.

## v0.1 Commands

| Command | What It Does | Delegates To |
|---------|-------------|-------------|
| `/coda` | Show current status (phase, task, next action) | coda_status (M3) |
| `/coda forge` | Initialize a new project | greenfield flow (M5) |
| `/coda new <type>` | Create an issue | coda_create (M3) + set phase to specify |
| `/coda advance` | Move to next phase | coda_advance (M3) |
| `/coda build` | Start autonomous BUILD loop | build-loop (M6) |

### Deferred commands (v0.2+)
- `/coda activate <id>` — single-issue in v0.1, no switching
- `/coda pause` / `/coda resume` — v0.5
- `/coda back` / `/coda kill` — v0.5
- `/coda audit` — v0.11

## Hooks

### before_agent_start
Fires before every agent turn. Injects phase-specific context.

```typescript
pi.on('before_agent_start', (ctx) => {
  const state = loadState();
  if (!state?.focus_issue || !state?.phase) return;

  const phaseContext = getPhaseContext(state.phase, state.focus_issue);

  return {
    systemPrompt: phaseContext.systemPrompt,
    message: phaseContext.context
  };
});
```

### tool_call
Fires on every tool call. Enforces write-gate.

```typescript
pi.on('tool_call', (ctx) => {
  const { name, args } = ctx.tool;

  // .coda/ write protection
  if ((name === 'write' || name === 'edit') && isCodaPath(args.path)) {
    return { block: true, reason: "Use coda_* tools to modify .coda/ files" };
  }

  // TDD write-gate
  const state = loadState();
  if (state?.tdd_gate === 'locked' && (name === 'write' || name === 'edit')) {
    if (!isTestFile(args.path)) {
      return {
        block: true,
        reason: "TDD gate locked. Write a failing test first, then run coda_run_tests."
      };
    }
  }

  return {};  // allow
});
```

### agent_end
Fires when the agent completes a turn. Used by BUILD loop for completion detection.

```typescript
pi.on('agent_end', (ctx) => {
  // Signal the build loop that the current task session completed
  buildLoopCompletionResolver?.resolve();
});
```

## Tool Registration

Register all coda_* tools so the LLM can call them:

```typescript
pi.registerTool('coda_create', { ... schema ... }, codaCreateHandler);
pi.registerTool('coda_update', { ... schema ... }, codaUpdateHandler);
pi.registerTool('coda_read', { ... schema ... }, codaReadHandler);
pi.registerTool('coda_advance', { ... schema ... }, codaAdvanceHandler);
pi.registerTool('coda_status', { ... schema ... }, codaStatusHandler);
pi.registerTool('coda_run_tests', { ... schema ... }, codaRunTestsHandler);
pi.registerTool('coda_edit_body', { ... schema ... }, codaEditBodyHandler);
```

## Extension Entry Point

```typescript
// packages/coda/src/pi/index.ts
export default function(pi: PiAPI) {
  // Register commands
  registerCommands(pi);

  // Register tools
  registerTools(pi);

  // Register hooks
  registerHooks(pi);

  // Load state on startup
  initializeState(pi);
}
```

## Build Loop Integration

The BUILD loop needs Pi's session management:

```typescript
async function runBuildLoop(pi: PiAPI, issueSlug: string) {
  const tasks = loadTasks(issueSlug);

  for (const task of tasks) {
    // Update state
    updateState({ current_task: task.frontmatter.id, tdd_gate: 'locked' });

    // Fresh session
    await pi.newSession();

    // The before_agent_start hook will inject task context

    // Trigger the agent
    const completionPromise = new Promise(resolve => {
      buildLoopCompletionResolver = { resolve };
    });
    await pi.sendUserMessage("Execute this task according to the injected context.");

    // Wait for completion
    await completionPromise;

    // Post-task: run Walt quality checks
    // (handled by the agent via Walt prompt injection)

    // Mark task complete
    updateFrontmatter(task.path, { status: 'complete' });
    updateState({ completed_tasks: [...state.completed_tasks, task.frontmatter.id] });

    // Commit
    await exec('git add . && git commit -m "' + task.frontmatter.title + '"');
  }
}
```

## Files

```
packages/coda/src/pi/
├── index.ts         # Extension entry point
├── commands.ts      # Command registration + handlers
├── hooks.ts         # before_agent_start, tool_call, agent_end
└── tools.ts         # Tool registration (delegates to src/tools/)
```

## Tests

Integration tests (need Pi test harness or mocks):
- Commands register and route correctly
- before_agent_start injects context for each phase
- tool_call blocks .coda/ writes
- tool_call enforces TDD gate
- Build loop sequences tasks with newSession between them

## Validated Pi API Patterns (from prototype)

These patterns were validated in the original forge prototype and should be used:

| Pattern | API | Notes |
|---------|-----|-------|
| Task dispatch | `pi.sendUserMessage()` | NOT `sendMessage({ triggerTurn })` — that bypasses before_agent_start |
| Completion detection | `agent_end` event + Promise | NOT `waitForIdle()` — race condition |
| Context clearing | `ctx.newSession()` | Zero context leakage between tasks |
| Write-gate | `tool_call` → return `{ block: true, reason }` | Works reliably |
| Context injection | `before_agent_start` → return `{ systemPrompt, message }` | Works for both system prompt and custom messages |
