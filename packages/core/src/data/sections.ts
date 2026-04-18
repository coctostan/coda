/**
 * @module sections
 * Section operations for markdown body content.
 *
 * These functions parse, append, and replace `## Heading` delimited sections
 * in a markdown body string. All functions are pure — they take a body string
 * and return a new string without side effects.
 */

/**
 * Extract the content of a named `## Heading` section from a markdown body.
 *
 * @param body - The markdown body string (without frontmatter)
 * @param heading - The heading name to find (case-sensitive, without `## ` prefix)
 * @returns The trimmed content under the heading, or null if not found
 */
export function getSection(body: string, heading: string): string | null {
  const lines = body.split('\n');
  const target = `## ${heading}`;
  let startIndex = -1;

  // Find the heading line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined && line.trim() === target) {
      startIndex = i + 1;
      break;
    }
  }

  if (startIndex === -1) return null;

  // Collect content until next ## heading or end of body
  const contentLines: string[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined && line.trim().startsWith('## ')) {
      break;
    }
    contentLines.push(line ?? '');
  }

  // Trim leading and trailing empty lines, then join
  const content = contentLines.join('\n').trim();
  return content;
}

/**
 * Append a new `## Heading` section at the end of a markdown body.
 *
 * @param body - The existing markdown body string
 * @param heading - The heading name for the new section
 * @param content - The content to place under the heading
 * @returns The updated body string with the new section appended
 */
export function appendSection(body: string, heading: string, content: string): string {
  const trimmed = body.trimEnd();
  const separator = trimmed === '' ? '' : '\n\n';
  return `${trimmed}${separator}## ${heading}\n\n${content}\n`;
}

/**
 * Normalize a `## Heading` name for conservative equivalence matching.
 *
 * Strips leading/trailing whitespace, trailing colons, and lowercases the
 * result. Only conservative formatting noise is normalized — substrings,
 * punctuation inside the heading, and semantic variations are NOT matched.
 *
 * Used for replace_section duplicate detection: `Requirements`, `requirements`,
 * `Requirements:`, and `  Requirements  ` all collapse to the same key, but
 * `Requirements (draft)` or `Acceptance Criteria` do not.
 */
export function normalizeHeading(heading: string): string {
  return heading
    .trim()
    .replace(/:\s*$/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Error class thrown by `replaceSection` when it cannot unambiguously resolve
 * the target heading. Callers (e.g., `codaEditBody`) translate these into
 * typed tool errors so agents/operators never get silent duplicate-heading
 * corruption.
 */
export class ReplaceSectionError extends Error {
  public readonly kind: 'not_found' | 'ambiguous';
  constructor(kind: 'not_found' | 'ambiguous', message: string) {
    super(message);
    this.name = 'ReplaceSectionError';
    this.kind = kind;
  }
}

/**
 * Replace the content of an existing `## Heading` section.
 *
 * Resolution rules (Phase 58 C2):
 * - Exact-match first: any `## {heading}` line with the caller's exact spelling.
 * - Conservative-normalized match: strips trailing colons, collapses internal
 *   whitespace, case-insensitive. `Requirements`, `requirements`,
 *   `Requirements:` all match the same canonical section.
 * - If no heading matches: throws `ReplaceSectionError('not_found', ...)`.
 * - If multiple equivalent headings match: throws `ReplaceSectionError('ambiguous', ...)`.
 *
 * No fuzzy substring matching. No silent append — callers that want
 * append-on-missing must catch `not_found` and call `appendSection`
 * explicitly (see `codaEditBody`'s `create_if_missing` path).
 *
 * @throws ReplaceSectionError when the target heading is missing or ambiguous.
 */
export function replaceSection(body: string, heading: string, content: string): string {
  const lines = body.split('\n');
  const exactTarget = `## ${heading}`;
  const normalizedTarget = normalizeHeading(heading);

  // Collect all heading lines and their indices so we can detect duplicates.
  const headingMatches: { index: number; line: string; exact: boolean }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const trimmed = line.trim();
    if (!trimmed.startsWith('## ')) continue;
    const headingText = trimmed.slice(3);
    if (trimmed === exactTarget) {
      headingMatches.push({ index: i, line: trimmed, exact: true });
    } else if (normalizeHeading(headingText) === normalizedTarget) {
      headingMatches.push({ index: i, line: trimmed, exact: false });
    }
  }

  if (headingMatches.length === 0) {
    throw new ReplaceSectionError('not_found', `No "## ${heading}" section found`);
  }

  // Any duplication of equivalent headings — whether exact duplicates or one
  // exact plus one normalized variant — is ambiguous. The Phase 57 live bug
  // showed that once duplicates exist on disk, silent replacement just makes
  // them harder to detect. Force the operator/agent to deduplicate first.
  if (headingMatches.length > 1) {
    throw new ReplaceSectionError(
      'ambiguous',
      `Multiple equivalent "## ${heading}" sections exist; refusing to guess. Deduplicate the record body first.`
    );
  }

  const match = headingMatches[0]!;
  const startIndex = match.index;

  // Find the end of this section (next ## heading or end of body)
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined && line.trim().startsWith('## ')) {
      endIndex = i;
      break;
    }
  }

  // Build the replacement using the matched heading's canonical line so we
  // never accidentally rewrite the heading spelling on replace.
  const before = lines.slice(0, startIndex);
  const after = lines.slice(endIndex);
  const replacement = [match.line, '', content, ''];

  return [...before, ...replacement, ...after].join('\n');
}

/**
 * Parse all `## Heading` sections from a markdown body and return those
 * matching any of the given topics via case-insensitive substring.
 *
 * Matching rules:
 * - Case-insensitive substring: topic "auth" matches "## Authentication"
 * - Multiple topics use OR logic: sections matching ANY topic are included
 * - The "## Overview" section is always included regardless of topics (exact heading match)
 * - Empty topics array returns all sections (no filtering)
 *
 * @param body - The markdown body string (without frontmatter)
 * @param topics - Array of topic strings to match against section headings
 * @returns Array of matching sections with heading name and trimmed content
 */
export function getSectionsByTopics(
  body: string,
  topics: string[]
): Array<{ heading: string; content: string }> {
  const lines = body.split('\n');
  const sections: Array<{ heading: string; content: string }> = [];

  // Parse all sections
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined && line.trim().startsWith('## ')) {
      // Save previous section if any
      if (currentHeading !== null) {
        sections.push({
          heading: currentHeading,
          content: currentLines.join('\n').trim(),
        });
      }
      currentHeading = line.trim().slice(3); // Remove '## ' prefix
      currentLines = [];
    } else if (currentHeading !== null) {
      currentLines.push(line ?? '');
    }
  }

  // Push final section
  if (currentHeading !== null) {
    sections.push({
      heading: currentHeading,
      content: currentLines.join('\n').trim(),
    });
  }

  // If no topics, return all sections
  if (topics.length === 0) {
    return sections;
  }

  // Filter by topics (case-insensitive substring) + always include "Overview"
  const lowerTopics = topics.map((t) => t.toLowerCase());

  return sections.filter((section) => {
    const lowerHeading = section.heading.toLowerCase();

    // Always include "Overview" (exact heading match, case-insensitive)
    if (lowerHeading === 'overview') {
      return true;
    }

    // Include if any topic is a substring of the heading
    return lowerTopics.some((topic) => lowerHeading.includes(topic));
  });
}

/**
 * Get a compact list of all `## Heading` names from a markdown body.
 * Useful for letting the agent know what sections exist without loading content.
 *
 * @param body - The markdown body string (without frontmatter)
 * @returns Array of heading names in document order (without `## ` prefix)
 */
export function getSectionHeadings(body: string): string[] {
  const headings: string[] = [];
  const lines = body.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined && line.trim().startsWith('## ')) {
      headings.push(line.trim().slice(3));
    }
  }

  return headings;
}