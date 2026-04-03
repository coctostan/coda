# v0.4: Topic-Based Section Retrieval

**Package:** `@coda/core` → `src/data/sections.ts`
**Modifies:** existing section reader

## Problem

Reference docs can be large. `ref-system.md` for a mature project might have 20+ capability sections. Loading the entire doc into every phase session wastes context. The agent needs only the sections relevant to the current issue's topics.

## Solution

The section reader gains topic-based filtering. Given a list of topics (from the issue), it returns only the sections whose headings match those topics.

## API

```typescript
/**
 * Get sections from a document body that match any of the given topics.
 * Matching is case-insensitive substring: topic "auth" matches "## Authentication",
 * "## Auth Middleware", "## OAuth Integration".
 */
function getSectionsByTopics(
  body: string,
  topics: string[]
): Array<{ heading: string; content: string }>;

/**
 * Get a compact summary of a document: just the heading list without content.
 * Useful for letting the agent know what sections exist without loading them.
 */
function getSectionHeadings(body: string): string[];
```

## Matching Rules

1. **Case-insensitive substring:** topic `"auth"` matches heading `"## Authentication"`, `"## OAuth Flow"`, `"## Auth Middleware"`
2. **Multiple topics OR:** if issue has topics `["auth", "api"]`, sections matching EITHER are included
3. **Always include "## Overview":** the overview section is always relevant regardless of topics
4. **Empty topics = return all:** if the issue has no topics, return the full document (no filtering)

## Integration

In `context-builder.ts`, when loading reference docs for a phase:

```typescript
// Old (v0.1-v0.3): load entire ref doc
const refSystem = readRecord(refSystemPath);
context += refSystem.body;

// New (v0.4): load only matching sections
const refSystem = readRecord(refSystemPath);
const issue = readRecord(issuePath);
const relevantSections = getSectionsByTopics(refSystem.body, issue.frontmatter.topics);
context += relevantSections.map(s => `## ${s.heading}\n${s.content}`).join('\n\n');
```

## Files

```
packages/core/src/data/sections.ts   # MODIFY: add getSectionsByTopics, getSectionHeadings
```

## Tests

1. Topic "auth" matches "## Authentication" and "## Auth Middleware" but not "## Data Model"
2. Multiple topics: ["auth", "api"] matches sections for either
3. "## Overview" always included
4. Empty topics returns all sections
5. No matching sections → returns only "## Overview" (if it exists)
6. Case insensitivity: topic "API" matches "## api endpoints"
