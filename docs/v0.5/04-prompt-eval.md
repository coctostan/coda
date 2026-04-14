# v0.5: Prompt Eval Infrastructure

**Package:** `coda` → `src/eval/` (NEW directory)
**Depends on:** Module system (v0.3), overlays (v0.5 Phase 3)

## Problem

Module prompts evolve via overlays, human feedback, and iteration — but there's no way to verify a prompt improvement doesn't regress previous behavior. Prompt changes are untested.

## Solution

TDD for prompts: write eval cases (code snippet + expected findings), run the module prompt against cases, score the pass rate. Iterate to improve. Eval cases ship alongside prompts.

## Eval Case Format

Each module has an eval file at `modules/evals/{module}.json`:

```json
[
  {
    "id": "sec-hardcoded-key",
    "module": "security",
    "hookPoint": "pre-plan",
    "description": "Detects hardcoded AWS key in source file",
    "input": {
      "files_modified": ["src/config.ts"],
      "file_contents": {
        "src/config.ts": "const AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';\nexport const config = { key: AWS_KEY };"
      }
    },
    "expected": {
      "min_findings": 1,
      "must_contain_severity": ["critical"],
      "must_match_check": "secrets"
    }
  },
  {
    "id": "sec-no-issues",
    "module": "security",
    "hookPoint": "pre-plan",
    "description": "Clean file produces no critical findings",
    "input": {
      "files_modified": ["src/utils.ts"],
      "file_contents": {
        "src/utils.ts": "export function add(a: number, b: number): number { return a + b; }"
      }
    },
    "expected": {
      "max_findings_above": "medium",
      "severity_cap": "info"
    }
  }
]
```

## API

```typescript
interface EvalCase {
  id: string;
  module: string;
  hookPoint: HookPoint;
  description: string;
  input: {
    files_modified: string[];
    file_contents: Record<string, string>;
    issue_type?: string;
    topics?: string[];
  };
  expected: {
    min_findings?: number;
    max_findings?: number;
    must_contain_severity?: FindingSeverity[];
    must_match_check?: string;
    max_findings_above?: FindingSeverity;
    severity_cap?: FindingSeverity;
  };
}

interface EvalResult {
  caseId: string;
  passed: boolean;
  reason: string;
  findings: Finding[];
  expectedSummary: string;
}

interface EvalSuiteResult {
  module: string;
  total: number;
  passed: number;
  failed: number;
  results: EvalResult[];
}

/**
 * Load eval cases for a module from modules/evals/{module}.json.
 */
function loadEvalCases(evalsDir: string, module: string): EvalCase[];

/**
 * Score a single eval case against actual findings.
 */
function scoreEvalCase(evalCase: EvalCase, findings: Finding[]): EvalResult;

/**
 * Run all eval cases for a module and return the suite result.
 * NOTE: This function scores against provided findings — it does NOT
 * invoke an LLM. The caller is responsible for running the prompt
 * against each case's input and collecting findings.
 */
function scoreEvalSuite(cases: EvalCase[], findingsPerCase: Map<string, Finding[]>): EvalSuiteResult;
```

## Scoring Rules

- `min_findings`: findings.length >= min
- `max_findings`: findings.length <= max
- `must_contain_severity`: at least one finding with each listed severity
- `must_match_check`: at least one finding whose `check` field contains the string
- `max_findings_above`: no findings with severity above the threshold
- `severity_cap`: all findings must be at or below this severity

## Directory Structure

```
packages/coda/src/eval/
├── types.ts       # EvalCase, EvalResult, EvalSuiteResult
├── loader.ts      # loadEvalCases
├── scorer.ts      # scoreEvalCase, scoreEvalSuite
├── index.ts       # barrel export

modules/evals/
├── security.json   # Eval cases for security module
├── tdd.json        # Eval cases for tdd module
├── architecture.json
├── quality.json
└── knowledge.json
```

## Files

```
packages/coda/src/eval/types.ts    # NEW
packages/coda/src/eval/loader.ts   # NEW
packages/coda/src/eval/scorer.ts   # NEW
packages/coda/src/eval/index.ts    # NEW
modules/evals/*.json               # NEW: eval cases per module
```

## Tests

1. loadEvalCases reads and parses JSON correctly
2. loadEvalCases returns empty array for missing module
3. scoreEvalCase: min_findings met → pass
4. scoreEvalCase: min_findings not met → fail with reason
5. scoreEvalCase: must_contain_severity present → pass
6. scoreEvalCase: must_contain_severity missing → fail
7. scoreEvalCase: severity_cap exceeded → fail
8. scoreEvalSuite aggregates pass/fail counts
9. scoreEvalSuite with empty findings map → all fail
