# v0.5: Per-Project Module Overlays

**Package:** `@coda/core` → `src/modules/overlay.ts` (NEW)
**Modifies:** `dispatcher.ts` (use overlay-merged prompts)

## Problem

Module prompts are static — the same security prompt runs for a banking app and a toy CLI. Projects have specific patterns, known false positives, validated conventions, and project values that should customize module behavior without editing the default prompts.

## Solution

A two-layer prompt model: default prompt (read-only, ships with CODA) + project-local overlay (.local.md in `.coda/modules/`). The dispatcher merges both into a single prompt at hook time.

## Overlay Content Sources

Overlays accumulate from multiple paths:

1. **FORGE** — brownfield SCAN discovers project patterns → initial overlay
2. **UNIFY** — each completed issue may add validated patterns or project-specific conventions
3. **Human feedback** — human marks a finding as false positive → overlay records the suppression
4. **Prompt eval** — eval-driven tuning adds context that improves prompt accuracy

## File Layout

```
modules/prompts/
├── security/
│   ├── pre-plan.md         # Default prompt (read-only)
│   ├── post-build.md
│   └── init-scan.md

.coda/modules/
├── security.local.md       # Project overlay (evolves)
├── tdd.local.md
├── architecture.local.md
├── quality.local.md
└── knowledge.local.md
```

## Overlay Format

```markdown
---
module: security
last_updated: 2026-04-03T10:00:00Z
updated_by: unify  # or: human-feedback, forge, eval
---

## Project Values
- This project handles PII (medical records). HIPAA compliance is required.
- All API endpoints must use JWT auth — no exceptions.

## Validated Patterns
- Auth middleware at src/middleware/auth.ts — verified secure in Issue #3.
- Rate limiting on all public endpoints — added in Issue #5.

## Known False Positives
- `AKIA` pattern in test fixtures is intentional mock data, not a real AWS key.
- `password` variable in src/auth/hash.ts is a bcrypt hash, not plaintext.

## Recurring Issues
- Agent keeps suggesting `helmet()` middleware — already present in app.ts line 12.
```

## API

```typescript
/**
 * Load a module's effective prompt: default + project overlay merged.
 */
function loadMergedPrompt(
  defaultPromptPath: string,
  codaRoot: string,
  moduleName: string
): string;

/**
 * Append content to a module's project overlay.
 * Creates the overlay file if it doesn't exist.
 */
function appendToOverlay(
  codaRoot: string,
  moduleName: string,
  section: 'project_values' | 'validated_patterns' | 'known_false_positives' | 'recurring_issues',
  content: string,
  updatedBy: string
): void;

/**
 * Read a module's project overlay, or null if none exists.
 */
function readOverlay(
  codaRoot: string,
  moduleName: string
): { frontmatter: OverlayFrontmatter; body: string } | null;
```

## Merge Behavior

The merged prompt is: `default prompt + "\n\n## Project-Specific Context\n\n" + overlay body`.

The overlay is appended, not interleaved. The default prompt provides the structure and instructions; the overlay adds project-specific context that refines the analysis.

## Dispatcher Integration

In `dispatcher.ts`, replace the direct `readFileSync(promptPath)` with:

```typescript
const prompt = loadMergedPrompt(promptPath, codaRoot, mod.name);
```

This requires passing `codaRoot` into the dispatcher, which it doesn't currently receive. The change is minimal: `createDispatcher(registry)` → `createDispatcher(registry, codaRoot?)`.

## Files

```
packages/core/src/modules/overlay.ts     # NEW: loadMergedPrompt, appendToOverlay, readOverlay
packages/core/src/modules/dispatcher.ts  # MODIFY: use overlay-merged prompts
```

## Tests

1. loadMergedPrompt with no overlay → returns default prompt unchanged
2. loadMergedPrompt with overlay → returns default + overlay appended
3. appendToOverlay creates new overlay file if none exists
4. appendToOverlay appends to existing overlay under correct section
5. readOverlay returns null when no overlay exists
6. readOverlay parses frontmatter and body correctly
7. Dispatcher uses merged prompt when codaRoot is provided
8. Dispatcher uses default prompt when codaRoot is not provided
