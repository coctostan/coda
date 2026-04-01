# v0.3: Module Dispatcher

**Package:** `@coda/core` → `src/modules/dispatcher.ts`
**Depends on:** 01-types-and-schema, 02-registry

## Purpose

Assembles module prompts for a hook point, provides them for injection into the phase session, then parses structured findings from the agent's response. Checks findings against block thresholds.

**Key design:** Modules do NOT get their own sessions. All module prompts for a hook point are combined and injected into the phase session via `before_agent_start`. The agent produces all findings in one response. This is cheaper and more coherent than per-module sessions.

## How It Works

```
Phase boundary reached (e.g., post-build)
    │
    ▼
Dispatcher.assemblePrompts('post-build')
    │
    ├── Registry: which modules have hooks at 'post-build'?
    │   → [security, tdd] (sorted by priority)
    │
    ├── Load each module's prompt markdown
    │   Combine into one analysis request
    │   Append JSON output requirement
    │
    └── Return assembled prompt string for injection

Agent produces response (with or without JSON findings)
    │
    ▼
Dispatcher.parseFindings(agentResponse)
    │
    ├── Extract JSON blocks from response
    │   (look for ```json blocks or top-level arrays)
    │
    ├── If no JSON found: zero findings + log warning
    │   (no retry — prompt quality addressed in v0.5)
    │
    ├── Validate each finding against schema
    │   (lenient: missing optional fields OK, extra fields ignored)
    │
    ├── Check: any finding.severity >= module.blockThreshold?
    │   YES → blocked = true, blockReasons populated
    │   NO  → blocked = false
    │
    └── Return HookResult { findings, blocked, blockReasons }
```

## Dispatcher API

```typescript
interface ModuleDispatcher {
  /**
   * Run all module hooks at a given hook point.
   * Returns collected findings and block status.
   */
  runHook(
    hookPoint: HookPoint,
    context: HookContext
  ): Promise<HookResult>;
}

interface HookContext {
  issueSlug: string;
  phase: Phase;
  submode: Submode | null;
  /** Contextual data the modules may need */
  changedFiles?: string[];       // files modified in BUILD (for post-build)
  taskId?: number;               // current task (for post-task)
  planPath?: string;             // plan record path (for post-plan)
}
```

## Implementation

```typescript
function createDispatcher(
  registry: ModuleRegistry,
  promptsDir: string,
  parseFindings: (llmOutput: string) => Finding[],  // injected — how to get findings from agent
): ModuleDispatcher {

  return {
    async runHook(hookPoint, context): Promise<HookResult> {
      const modules = registry.getModulesForHook(hookPoint);
      const allFindings: Finding[] = [];
      const blockReasons: string[] = [];

      for (const mod of modules) {
        // 1. Load prompt
        const promptPath = registry.resolvePromptPath(mod, hookPoint);
        const prompt = readFileSync(promptPath, 'utf-8');

        // 2. Build module context
        const moduleContext = buildModuleContext(prompt, context, mod);

        // 3. Get findings from agent (injected function — Pi layer provides this)
        const rawOutput = await getAgentFindings(moduleContext);

        // 4. Parse + validate
        const findings = parseFindings(rawOutput).map(f => ({
          ...f,
          module: mod.name,
          hookPoint,
        }));

        // 5. Check threshold
        for (const finding of findings) {
          if (exceedsThreshold(finding.severity, mod.blockThreshold)) {
            blockReasons.push(
              `${mod.name.toUpperCase()} BLOCK: ${finding.finding}` +
              (finding.assumption ? ` (assumes: ${finding.assumption})` : '')
            );
          }
        }

        allFindings.push(...findings);
      }

      return {
        hookPoint,
        findings: allFindings,
        blocked: blockReasons.length > 0,
        blockReasons,
        timestamp: new Date().toISOString(),
      };
    },
  };
}

function exceedsThreshold(severity: FindingSeverity, threshold: FindingSeverity): boolean {
  if (threshold === 'none') return false;  // 'none' = never block
  return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[threshold];
}
```

## Agent Interaction Pattern

The dispatcher needs to get structured findings from the agent. In v0.3, this works through the existing session model:

1. Module prompt is injected into the agent's context via `before_agent_start`
2. The prompt instructs the agent to produce findings as JSON
3. The agent's response is parsed for JSON content
4. Findings are extracted and validated

**The prompt template ending (appended to every module prompt):**

```markdown
## Required Output

Produce your findings as a JSON array. Each finding must have these fields:

```json
[
  {
    "check": "what you checked",
    "severity": "critical|high|medium|low|info",
    "finding": "what you found",
    "assumption": "what must be true for this to matter",
    "file": "affected file (optional)",
    "recommendation": "suggested fix (optional)",
    "evidence": "supporting evidence (optional)"
  }
]
```

If no issues found, produce a single info finding confirming the check was performed:
```json
[{ "check": "security review", "severity": "info", "finding": "No security issues found in changed files." }]
```
```

## Block Behavior

When the dispatcher returns `blocked: true`:

- **At post-build:** The VERIFY phase doesn't start. Agent is shown the block reasons and asked to address them first.
- **At post-plan:** The REVIEW phase raises this as an additional review issue.
- **At pre-build:** BUILD doesn't start until the block is resolved.

The block integrates with existing gate mechanics — it's an additional check alongside the phase gates, not a replacement.

## Files

```
packages/core/src/modules/
├── dispatcher.ts         # createDispatcher, exceedsThreshold, buildModuleContext
```

## Tests

1. runHook with no modules at hook point → empty findings, not blocked
2. runHook with one module, no findings → info finding, not blocked
3. runHook with critical finding at critical threshold → blocked
4. runHook with high finding at critical threshold → NOT blocked (below threshold)
5. runHook with high finding at high threshold → blocked (at threshold)
6. Module with 'none' threshold → never blocked regardless of severity
7. Multiple modules at same hook → findings collected from all, sorted by priority
8. Invalid finding from LLM → filtered out, valid findings preserved
9. exceedsThreshold comparison correct for all severity pairs
10. blockReasons includes assumption text when present
