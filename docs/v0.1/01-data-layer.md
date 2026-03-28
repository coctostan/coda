# M1: Data Layer — v0.1 Spec

**Package:** `@coda/core` → `src/data/`
**Depends on:** Nothing
**Deliverable:** Can read/write mdbase-style markdown records with YAML frontmatter, parse ## sections

## What This Layer Does

Reads and writes markdown files with YAML frontmatter. This is the persistence layer — all CODA data (issues, plans, tasks, records, reference docs) are markdown files with structured frontmatter.

## v0.1 Scope

### Must Have

1. **Read a record** — given a path, return parsed frontmatter (as typed object) + body (as string)
2. **Write a record** — given frontmatter object + body string, write valid markdown with YAML frontmatter
3. **Update frontmatter fields** — merge partial updates into existing frontmatter without touching the body
4. **Section reader** — parse `## Heading` boundaries in the body, retrieve a named section
5. **Append/replace section** — add or replace a `## Section` in the body without touching frontmatter or other sections
6. **Type schemas** — TypeScript types for: issue, plan, task, record, reference (matching the spec's mdbase types)
7. **Directory listing** — list all records of a type (e.g., all issues, all tasks for an issue)

### Deferred

- Cross-type queries (query issues by topic, find tasks by AC ID)
- Topic-based section retrieval (load only matching sections from large docs)
- mdbase.yaml collection configuration
- Type schema validation at write time (v0.1 trusts the caller)

## Type Schemas (v0.1 subset)

```typescript
interface IssueRecord {
  title: string;
  issue_type: 'feature' | 'bugfix' | 'refactor' | 'chore' | 'docs';
  status: 'proposed' | 'active' | 'resolved' | 'complete' | 'wont-fix';
  phase: 'specify' | 'plan' | 'review' | 'build' | 'verify' | 'unify' | 'done';
  milestone?: string;
  priority: number;  // 1-5, default 3
  branch?: string;
  current_task?: number;
  topics: string[];
  acceptance_criteria: AcceptanceCriterion[];
  open_questions: string[];
  deferred_items: string[];
  human_review: boolean;
  spec_delta?: SpecDelta;
}

interface AcceptanceCriterion {
  id: string;      // "AC-1", "AC-2"
  text: string;
  status: 'pending' | 'met' | 'not-met';
}

interface SpecDelta {
  added: string[];
  modified: string[];
  removed: string[];
  delta_summary: string;
}

interface PlanRecord {
  title: string;
  issue: string;     // issue slug
  status: 'draft' | 'in-review' | 'approved' | 'superseded';
  iteration: number;
  task_count: number;
  human_review_status: 'not-required' | 'pending' | 'approved' | 'changes-requested';
}

interface TaskRecord {
  id: number;
  issue: string;
  title: string;
  status: 'pending' | 'active' | 'complete' | 'blocked';
  kind: 'planned' | 'correction';
  covers_ac: string[];   // AC IDs
  depends_on: number[];
  files_to_modify: string[];
  truths: string[];
  artifacts: Array<{ path: string; description: string }>;
  key_links: Array<{ from: string; to: string; via: string }>;
}

interface CompletionRecord {
  title: string;
  issue: string;
  completed_at: string;
  topics: string[];
  reference_docs_reviewed: boolean;
  system_spec_updated: boolean;
  milestone_updated: boolean;
}

interface ReferenceDoc {
  title: string;
  category: 'system' | 'architecture' | 'prd' | 'convention' | 'pattern';
  topics: string[];
  last_verified?: string;
  last_updated_by?: string;
}
```

## File Layout

```
.coda/
├── reference/
│   ├── ref-system.md          # ReferenceDoc frontmatter + body
│   ├── ref-prd.md
│   ├── ref-architecture.md
│   └── ref-conventions.md
├── issues/
│   ├── my-issue.md            # IssueRecord frontmatter + body
│   └── my-issue/
│       ├── plan-v1.md         # PlanRecord frontmatter + body
│       └── tasks/
│           ├── 01-first.md    # TaskRecord frontmatter + body
│           └── 02-second.md
└── _types/                    # (informational only in v0.1, not validated)
```

## API Surface

```typescript
// Core read/write
function readRecord<T>(path: string): { frontmatter: T; body: string };
function writeRecord<T>(path: string, frontmatter: T, body: string): void;
function updateFrontmatter<T>(path: string, updates: Partial<T>): void;

// Section operations
function getSection(body: string, heading: string): string | null;
function appendSection(body: string, heading: string, content: string): string;
function replaceSection(body: string, heading: string, content: string): string;

// Directory operations
function listRecords(dir: string): string[];  // returns file paths
```

## Testing

Unit tests with in-memory or temp directory. No Pi dependency.

- Read a file with YAML frontmatter → get correct typed object
- Write a record → file has valid YAML frontmatter + body
- Update frontmatter → only specified fields change, body untouched
- Section reader → finds sections by heading, returns content
- Append section → adds at end, doesn't touch other sections
- Replace section → replaces only target section
- List records → returns all .md files in directory
