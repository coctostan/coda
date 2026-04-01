# v0.3: Types & Finding Schema

**Package:** `@coda/core` → `src/modules/`
**Depends on:** Nothing

## Types

```typescript
/** A hook point where modules can fire */
type HookPoint =
  | "init-scan"       // During /coda forge — brownfield/greenfield scanning
  | "pre-specify"     // Before SPECIFY — inject domain context
  | "pre-plan"        // Before PLAN — inject constraints
  | "post-plan"       // After PLAN — validate plan
  | "pre-build"       // Before BUILD — establish baselines
  | "post-task"       // After each BUILD task — incremental checks
  | "post-build"      // After all BUILD tasks — comprehensive review
  | "pre-verify"      // Before VERIFY — setup context
  | "post-unify";     // After UNIFY — knowledge capture

/** A single module hook registration */
interface ModuleHook {
  hookPoint: HookPoint;
  priority: number;         // lower = runs first (for ordering multiple modules at same hook)
  promptFile: string;       // path to the markdown prompt for this hook
}

/** Module definition */
interface ModuleDefinition {
  name: string;                     // "security", "architecture", etc.
  domain: string;                   // human-readable: "Security Patterns"
  version: string;                  // "1.0.0"
  hooks: ModuleHook[];              // which hooks this module participates in
  blockThreshold: FindingSeverity;  // findings at or above this severity block advancement
  enabled: boolean;                 // from config
}

/** Severity levels */
type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";

/** The severity ordering for comparison */
const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/** A single module finding */
interface Finding {
  module: string;                   // which module produced this
  hookPoint: HookPoint;            // at which hook it was produced
  file?: string;                   // affected file (if applicable)
  check: string;                   // what was checked
  severity: FindingSeverity;
  finding: string;                 // what was found
  assumption?: string;             // what must be true for this to matter
  recommendation?: string;         // suggested fix
  evidence?: string;               // supporting evidence (code snippet, command output)
}

/** Result of running all module hooks at a given hook point */
interface HookResult {
  hookPoint: HookPoint;
  findings: Finding[];
  blocked: boolean;                // any finding at or above block threshold?
  blockReasons: string[];          // human-readable block explanations
  timestamp: string;               // ISO timestamp
}

/** Module config in coda.json */
interface ModuleConfig {
  enabled: boolean;
  blockThreshold?: FindingSeverity;  // override per-project
}
```

## Finding Schema Validation

The extension validates that LLM-produced findings match the schema. This is NOT content validation (the LLM's judgment stands) — it's SHAPE validation (required fields present, severity is a valid enum value).

```typescript
function validateFinding(raw: unknown): Finding | null {
  // Required: module, check, severity, finding
  // Optional: file, assumption, recommendation, evidence, hookPoint
  // severity must be one of the enum values
  // Returns null if invalid (logged as warning, not fatal)
}

function validateFindings(raw: unknown): Finding[] {
  // Parse JSON array from LLM output
  // Validate each, filter out nulls
  // Return valid findings (partial results OK — don't lose valid findings
  //   because one was malformed)
}
```

**Lenient parsing:** If the LLM returns findings with extra fields, ignore them. If a finding is missing `module`, inject it from context. The goal is to capture as much structured data as possible, not to reject imperfect output.

## Files

```
packages/core/src/modules/
├── types.ts              # All types above
└── finding-schema.ts     # validateFinding, validateFindings
```

## Tests

1. Finding with all fields validates correctly
2. Finding missing optional fields validates (they're optional)
3. Finding missing required field (check, severity, finding) returns null
4. Invalid severity value returns null
5. Array with mix of valid/invalid → returns only valid ones
6. Extra fields on finding → ignored (not rejected)
7. SEVERITY_ORDER comparison: critical > high > medium > low > info
8. Empty array input → empty array output
