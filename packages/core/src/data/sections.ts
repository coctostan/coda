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
 * Replace the content of an existing `## Heading` section, or append if not found.
 *
 * @param body - The existing markdown body string
 * @param heading - The heading name to replace
 * @param content - The new content for the section
 * @returns The updated body string with the section replaced or appended
 */
export function replaceSection(body: string, heading: string, content: string): string {
  const lines = body.split('\n');
  const target = `## ${heading}`;
  let startIndex = -1;

  // Find the heading line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined && line.trim() === target) {
      startIndex = i;
      break;
    }
  }

  // If not found, append
  if (startIndex === -1) {
    return appendSection(body, heading, content);
  }

  // Find the end of this section (next ## heading or end of body)
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined && line.trim().startsWith('## ')) {
      endIndex = i;
      break;
    }
  }

  // Build the replacement
  const before = lines.slice(0, startIndex);
  const after = lines.slice(endIndex);
  const replacement = [`## ${heading}`, '', content, ''];

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