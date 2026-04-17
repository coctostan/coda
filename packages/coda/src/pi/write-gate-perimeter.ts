/**
 * @module pi/write-gate-perimeter
 * Perimeter detectors for the Pi write-gate hook.
 *
 * Extracted from `pi/hooks.ts` to keep the hook dispatcher focused on
 * lifecycle glue. These helpers detect `.coda/` mutation attempts that
 * bypass the built-in write/edit tool intercepts:
 *
 *   - `isBashWriteToCoda` — any bash command writing into `.coda/`
 *       (redirects, compound/subshell/here-doc, `sh -c` / `bash -c` wrappers,
 *        `tee`/`cp`/`mv`/`ln`/`install`/`touch`/`mkdir`/`rm`/`truncate`/`chmod`/`chown`/`sed -i`/`perl -i`)
 *   - `inputReferencesCoda` — recursive scan for `.coda/` in custom-tool inputs
 *
 * Phase 53 decision held: pure `checkWriteGate` in `tools/write-gate.ts`
 * stays untouched; perimeter lives here.
 */

/** Regex matching any string containing a `.coda/` reference as a path segment. */
const CODA_PATH_PATTERN = /(?:^|[\\/\s])\.coda(?:[\\/]|$)/;
// ──────────────────────────────────────────────────────────────────────────
// Shell tokenization helpers (used by bash-command-name-based detectors).
// ──────────────────────────────────────────────────────────────────────────

function tokenizeShellCommand(command: string): string[] {
  return command.match(/"[^"]*"|'[^']*'|`[^`]*`|[^\s]+/g) ?? [];
}

function normalizeShellToken(token: string): string {
  let normalized = token.trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"'))
    || (normalized.startsWith("'") && normalized.endsWith("'"))
    || (normalized.startsWith('`') && normalized.endsWith('`'))
  ) {
    normalized = normalized.slice(1, -1);
  }
  return normalized.replace(/[;|&]+$/g, '');
}

function tokenTargetsCodaPath(token: string): boolean {
  return /(^|[\\/])\.coda(?:[\\/]|$)/.test(normalizeShellToken(token));
}

function findTargetPathToken(commandName: string, args: string[]): string | null {
  const normalizedArgs = args.map((arg) => normalizeShellToken(arg));
  const targetDirFlagIndex = normalizedArgs.findIndex((arg) => arg === '-t' || arg === '--target-directory');
  if (targetDirFlagIndex >= 0) {
    return normalizedArgs[targetDirFlagIndex + 1] ?? null;
  }

  if (commandName === 'cp' || commandName === 'mv' || commandName === 'install' || commandName === 'ln') {
    for (let index = normalizedArgs.length - 1; index >= 0; index -= 1) {
      const token = normalizedArgs[index];
      if (!token || token === '--') continue;
      if (token.startsWith('-')) continue;
      return token;
    }
  }

  return null;
}

function hasRedirectWriteToCoda(command: string): boolean {
  return /(?:^|[^\w])(?:1>>?|>>?)\s*['"]?(?:[^\s'"`]*[\\/])?\.coda(?:[\\/]|$)/.test(command);
}

/**
 * Detect bash compound/subshell/here-doc patterns writing into `.coda/`:
 *   `cd .coda && echo x > state.json`
 *   `(cd .coda && printf '' > state.json)`
 *   `cat > .coda/state.json <<EOF`
 */
function hasCompoundWriteToCoda(command: string): boolean {
  // `cd .coda` (relative or via subshell/logical-op) followed anywhere later
  // by a redirect token `>`/`>>`/`1>`/`1>>`.
  if (/(?:^|[\s;(&|])cd\s+\.?['"]?\.coda(?:\b|['"/\\])/.test(command)
      && /(?:1>>?|>>?)/.test(command)) {
    return true;
  }
  // Here-doc target .coda/: `cat > .coda/foo <<EOF`.
  if (/>\s*['"]?(?:[^\s'"`]*[\\/])?\.coda[^\s'"`]*[\s\S]*?<<\s*['"]?\w+/.test(command)) {
    return true;
  }
  return false;
}

/**
 * Recursively apply a bash-write detector to the `-c` payload of a `sh -c '…'`
 * or `bash -c '…'` wrapper. One level deep; avoids unbounded recursion.
 *
 * @param detect - The outer `isBashWriteToCoda` predicate (passed in to avoid a
 *                 circular import between `hooks.ts` and this module).
 */
function isWrappedBashWriteToCoda(command: string, depth: number): boolean {
  if (depth > 1) return false;
  const match = command.match(/^\s*(?:sh|bash)\s+-c\s+(['"])([\s\S]*)\1\s*$/);
  if (!match) return false;
  const inner = match[2];
  if (!inner) return false;
  return isBashWriteToCodaInternal(inner, depth + 1);
}

/**
 * Recursively scan a tool_call input payload for any string value that
 * references `.coda/`. Used to default-deny custom (extension-registered)
 * tools whose shape we don't know at audit time.
 *
 * Bounded at depth 10 to avoid pathological payloads. Handles strings,
 * arrays, and plain objects.
 */
/**
 * Detect bash commands that write to `.coda/` via redirection or common write patterns.
 *
 * Catches: `> .coda/`, `>> .coda/`, `1> .coda/`, `tee .coda/`, `cp ... .coda/`,
 * `mv ... .coda/`, `touch .coda/`, `mkdir .coda/`, `printf ... > .coda/`,
 * interpreter stdout redirects like `python -c ... > .coda/` or `node -e ... > .coda/`,
 * `sed -i .coda/`, `perl -i .coda/`, `truncate .coda/`, `chmod .coda/`,
 * `chown .coda/`, `ln ... .coda/`, and `install ... .coda/`.
 *
 * Also catches Phase 55 additions: bash compound/subshell/here-doc and `sh -c`/`bash -c` wrappers.
 */
export function isBashWriteToCoda(command: string): boolean {
  return isBashWriteToCodaInternal(command, 0);
}

function isBashWriteToCodaInternal(command: string, depth: number): boolean {
  if (hasRedirectWriteToCoda(command)) return true;
  if (hasCompoundWriteToCoda(command)) return true;
  if (isWrappedBashWriteToCoda(command, depth)) return true;
  if (/\btee\b[\s\S]*\.coda(?:[\\/]|$)/.test(command)) return true;
  if (/\bsed\b[\s\S]*\s-i(?:\s|$|['".]|[^a-zA-Z])[\s\S]*\.coda(?:[\\/]|$)/.test(command)) return true;
  if (/\bperl\b[\s\S]*\s-i(?:\S*)?(?:\s|$)[\s\S]*\.coda(?:[\\/]|$)/.test(command)) return true;

  const tokens = tokenizeShellCommand(command);
  const commandName = normalizeShellToken(tokens[0] ?? '');
  const args = tokens.slice(1);

  if (commandName === 'tee') {
    return args.some((arg) => tokenTargetsCodaPath(arg));
  }
  if (commandName === 'cp' || commandName === 'mv' || commandName === 'install' || commandName === 'ln') {
    const targetPath = findTargetPathToken(commandName, args);
    return targetPath !== null && tokenTargetsCodaPath(targetPath);
  }
  if (commandName === 'touch' || commandName === 'mkdir') {
    return args
      .filter((arg) => !normalizeShellToken(arg).startsWith('-'))
      .some((arg) => tokenTargetsCodaPath(arg));
  }
  if (
    commandName === 'rm'
    || commandName === 'truncate'
    || commandName === 'chmod'
    || commandName === 'chown'
  ) {
    return args.some((arg) => tokenTargetsCodaPath(arg));
  }
  return false;
}
export function inputReferencesCoda(value: unknown, depth = 0): boolean {
  if (depth > 10) return false;
  if (value === null || value === undefined) return false;

  if (typeof value === 'string') {
    return CODA_PATH_PATTERN.test(value);
  }

  if (Array.isArray(value)) {
    return value.some((item) => inputReferencesCoda(item, depth + 1));
  }

  if (typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      if (inputReferencesCoda(nested, depth + 1)) return true;
    }
  }

  return false;
}
