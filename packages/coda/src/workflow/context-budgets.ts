/**
 * @module workflow/context-budgets
 * Per-phase context budget management.
 *
 * Provides budget-aware assembly of context sections — the builder targets
 * a token budget per phase, including/excluding whole sections by priority.
 * Budgets are advisory: required sections always pass, and sections are
 * never truncated mid-content.
 */

/**
 * A single context section with priority for budget-aware assembly.
 */
export interface ContextSection {
  /** Human-readable label for logging (e.g., "ref-system (auth section)"). */
  label: string;
  /** The actual content to include. */
  content: string;
  /** Inclusion priority: required sections always pass, others compete for budget. */
  priority: 'required' | 'high' | 'medium' | 'low';
  /** Estimated token count — caller can use `estimateTokens()` to compute. */
  estimatedTokens: number;
}

/**
 * Result of budget-aware assembly, including metadata for observability.
 */
export interface BudgetResult {
  /** Assembled context string. */
  content: string;
  /** Total estimated tokens included. */
  usedTokens: number;
  /** Number of sections included. */
  includedCount: number;
  /** Number of sections omitted. */
  excludedCount: number;
  /** Labels of included sections, in assembly order. */
  includedLabels: string[];
  /** Labels of excluded sections. */
  excludedLabels: string[];
}

/**
 * Default token budgets per lifecycle phase.
 *
 * | Phase   | Budget  | Rationale                                    |
 * |---------|---------|----------------------------------------------|
 * | specify | 4000    | Issue + relevant ref sections + ref-prd       |
 * | plan    | 6000    | Issue + ACs + architecture + conventions      |
 * | review  | 4000    | Plan + tasks + AC list                       |
 * | build   | 4000    | Task record + topic-matched conventions      |
 * | verify  | 6000    | Issue ACs + all task summaries + plan         |
 * | unify   | 8000    | Issue + plan + all summaries + ref docs       |
 */
export const PHASE_BUDGETS: Record<string, number> = {
  specify: 4000,
  plan: 6000,
  review: 4000,
  build: 4000,
  verify: 6000,
  unify: 8000,
};

/**
 * Estimate token count from a text string.
 * Uses a simple chars/4 approximation (ceiling).
 *
 * @param text - The text to estimate
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Map priority to sort order (lower = higher priority). */
function priorityOrder(priority: ContextSection['priority']): number {
  switch (priority) {
    case 'required': return 0;
    case 'high': return 1;
    case 'medium': return 2;
    case 'low': return 3;
  }
}

/**
 * Assemble context sections within a token budget.
 *
 * Sections are sorted by priority (required > high > medium > low).
 * Within the same priority, original order is preserved.
 * Required sections are always included regardless of budget.
 * Non-required sections are included whole or excluded whole — never truncated.
 *
 * @param sections - Context sections with priority and token estimates
 * @param targetTokens - Target token budget
 * @returns Assembled content with metadata
 */
export function assembleWithinBudget(
  sections: ContextSection[],
  targetTokens: number
): BudgetResult {
  if (sections.length === 0) {
    return {
      content: '',
      usedTokens: 0,
      includedCount: 0,
      excludedCount: 0,
      includedLabels: [],
      excludedLabels: [],
    };
  }

  // Stable sort by priority (preserve original order within same priority)
  const indexed = sections.map((s, i) => ({ section: s, index: i }));
  indexed.sort((a, b) => {
    const pDiff = priorityOrder(a.section.priority) - priorityOrder(b.section.priority);
    if (pDiff !== 0) return pDiff;
    return a.index - b.index;
  });

  let usedTokens = 0;
  const includedLabels: string[] = [];
  const excludedLabels: string[] = [];
  const parts: string[] = [];

  for (const { section } of indexed) {
    if (section.priority === 'required') {
      parts.push(section.content);
      usedTokens += section.estimatedTokens;
      includedLabels.push(section.label);
    } else if (usedTokens + section.estimatedTokens <= targetTokens) {
      parts.push(section.content);
      usedTokens += section.estimatedTokens;
      includedLabels.push(section.label);
    } else {
      excludedLabels.push(section.label);
    }
  }

  return {
    content: parts.join('\n\n'),
    usedTokens,
    includedCount: includedLabels.length,
    excludedCount: excludedLabels.length,
    includedLabels,
    excludedLabels,
  };
}
