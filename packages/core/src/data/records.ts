/**
 * @module records
 * Core record read/write operations for CODA mdbase records.
 *
 * All CODA data is stored as markdown files with YAML frontmatter.
 * This module provides the fundamental CRUD operations for those records.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

/**
 * Parse a YAML string into a JavaScript object.
 * Handles the subset of YAML used in frontmatter: scalars, arrays, and nested objects.
 */
function parseYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    // Skip empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    const indent = line.search(/\S/);

    // Top-level key-value
    if (indent === 0) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) {
        i++;
        continue;
      }

      const key = line.slice(0, colonIndex).trim();
      const valueStr = line.slice(colonIndex + 1).trim();

      if (valueStr === '' || valueStr === '|' || valueStr === '>') {
        // Check if next line is an array item or nested object
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1] ?? '';
          const nextTrimmed = nextLine.trim();
          if (nextTrimmed.startsWith('- ')) {
            const arr = parseArray(lines, i + 1, 2);
            result[key] = arr.value;
            i = arr.nextIndex;
            continue;
          } else if (nextTrimmed !== '' && !nextTrimmed.startsWith('-')) {
            const obj = parseNestedObject(lines, i + 1, 2);
            result[key] = obj.value;
            i = obj.nextIndex;
            continue;
          }
        }
        result[key] = '';
        i++;
        continue;
      }

      // Inline array: [item1, item2]
      if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
        const inner = valueStr.slice(1, -1).trim();
        if (inner === '') {
          result[key] = [];
        } else {
          result[key] = inner.split(',').map((s) => parseScalar(s.trim()));
        }
        i++;
        continue;
      }

      result[key] = parseScalar(valueStr);
      i++;
      continue;
    }

    i++;
  }

  return result;
}

/**
 * Parse an array from YAML lines starting at the given index.
 */
function parseArray(
  lines: string[],
  startIndex: number,
  expectedIndent: number
): { value: unknown[]; nextIndex: number } {
  const arr: unknown[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim() === '') {
      i++;
      continue;
    }

    const indent = line.search(/\S/);
    if (indent < expectedIndent) break;

    const trimmed = line.trim();
    if (!trimmed.startsWith('- ')) break;

    const itemValue = trimmed.slice(2).trim();

    // Check if this array item has nested key-value pairs (object in array)
    if (itemValue.includes(':')) {
      const obj: Record<string, unknown> = {};
      const colonIdx = itemValue.indexOf(':');
      const firstKey = itemValue.slice(0, colonIdx).trim();
      const firstVal = itemValue.slice(colonIdx + 1).trim();
      obj[firstKey] = parseScalar(firstVal);

      // Check for continuation lines at deeper indent
      i++;
      while (i < lines.length) {
        const nextLine = lines[i] ?? '';
        if (nextLine.trim() === '') {
          i++;
          continue;
        }
        const nextIndent = nextLine.search(/\S/);
        if (nextIndent <= expectedIndent) break;
        const nextTrimmed = nextLine.trim();
        if (nextTrimmed.startsWith('- ')) break;

        const nextColon = nextTrimmed.indexOf(':');
        if (nextColon !== -1) {
          const nk = nextTrimmed.slice(0, nextColon).trim();
          const nv = nextTrimmed.slice(nextColon + 1).trim();

          if (nv === '' || nv === '[]') {
            if (nv === '[]') {
              obj[nk] = [];
            } else if (i + 1 < lines.length && (lines[i + 1] ?? '').trim().startsWith('- ')) {
              const subArr = parseArray(lines, i + 1, nextIndent + 2);
              obj[nk] = subArr.value;
              i = subArr.nextIndex;
              continue;
            } else {
              obj[nk] = '';
            }
          } else if (nv.startsWith('[') && nv.endsWith(']')) {
            const inner = nv.slice(1, -1).trim();
            obj[nk] = inner === '' ? [] : inner.split(',').map((s) => parseScalar(s.trim()));
          } else {
            obj[nk] = parseScalar(nv);
          }
        }
        i++;
      }

      arr.push(obj);
      continue;
    }

    // Simple scalar array item
    arr.push(parseScalar(itemValue));
    i++;
  }

  return { value: arr, nextIndex: i };
}

/**
 * Parse a nested object from YAML lines starting at the given index.
 */
function parseNestedObject(
  lines: string[],
  startIndex: number,
  expectedIndent: number
): { value: Record<string, unknown>; nextIndex: number } {
  const obj: Record<string, unknown> = {};
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim() === '') {
      i++;
      continue;
    }

    const indent = line.search(/\S/);
    if (indent < expectedIndent) break;

    const trimmed = line.trim();
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = trimmed.slice(0, colonIdx).trim();
    const valStr = trimmed.slice(colonIdx + 1).trim();

    if (valStr === '' || valStr === '[]') {
      if (valStr === '[]') {
        obj[key] = [];
      } else if (i + 1 < lines.length) {
        const nextLine = lines[i + 1] ?? '';
        const nextTrimmed = nextLine.trim();
        const nextIndent = nextLine.search(/\S/);
        if (nextIndent > indent && nextTrimmed.startsWith('- ')) {
          const subArr = parseArray(lines, i + 1, nextIndent);
          obj[key] = subArr.value;
          i = subArr.nextIndex;
          continue;
        } else if (nextIndent > indent) {
          const subObj = parseNestedObject(lines, i + 1, nextIndent);
          obj[key] = subObj.value;
          i = subObj.nextIndex;
          continue;
        } else {
          obj[key] = '';
        }
      } else {
        obj[key] = '';
      }
    } else if (valStr.startsWith('[') && valStr.endsWith(']')) {
      const inner = valStr.slice(1, -1).trim();
      obj[key] = inner === '' ? [] : inner.split(',').map((s) => parseScalar(s.trim()));
    } else {
      obj[key] = parseScalar(valStr);
    }

    i++;
  }

  return { value: obj, nextIndex: i };
}

/**
 * Parse a YAML scalar value into the appropriate JS type.
 */
function parseScalar(value: string): string | number | boolean | null {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;

  // Remove surrounding quotes
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  // Try number
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

  return value;
}

/**
 * Serialize a JavaScript value to a YAML string (for frontmatter).
 */
function serializeYaml(obj: Record<string, unknown>, indent: number = 0): string {
  const prefix = ' '.repeat(indent);
  const lines: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;

    if (value === null) {
      lines.push(`${prefix}${key}: null`);
    } else if (typeof value === 'boolean') {
      lines.push(`${prefix}${key}: ${String(value)}`);
    } else if (typeof value === 'number') {
      lines.push(`${prefix}${key}: ${String(value)}`);
    } else if (typeof value === 'string') {
      if (
        value === '' ||
        value === 'true' ||
        value === 'false' ||
        value === 'null' ||
        /^[\d]/.test(value) ||
        value.includes(':') ||
        value.includes('#')
      ) {
        lines.push(`${prefix}${key}: "${value.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${prefix}${key}: ${value}`);
      }
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${prefix}${key}: []`);
      } else if (typeof value[0] === 'object' && value[0] !== null) {
        // Array of objects
        lines.push(`${prefix}${key}:`);
        for (const item of value) {
          const entries = Object.entries(item as Record<string, unknown>);
          const first = entries[0];
          if (first) {
            const [firstKey, firstVal] = first;
            lines.push(`${prefix}  - ${firstKey}: ${serializeScalar(firstVal)}`);
            for (let j = 1; j < entries.length; j++) {
              const entry = entries[j];
              if (!entry) continue;
              const [k, v] = entry;
              if (Array.isArray(v) && v.length === 0) {
                lines.push(`${prefix}    ${k}: []`);
              } else if (Array.isArray(v)) {
                lines.push(`${prefix}    ${k}:`);
                for (const arrItem of v) {
                  lines.push(`${prefix}      - ${serializeScalar(arrItem)}`);
                }
              } else {
                lines.push(`${prefix}    ${k}: ${serializeScalar(v)}`);
              }
            }
          }
        }
      } else {
        // Array of scalars
        lines.push(`${prefix}${key}:`);
        for (const item of value) {
          lines.push(`${prefix}  - ${serializeScalar(item)}`);
        }
      }
    } else if (typeof value === 'object') {
      lines.push(`${prefix}${key}:`);
      lines.push(serializeYaml(value as Record<string, unknown>, indent + 2));
    }
  }

  return lines.join('\n');
}

/**
 * Serialize a single scalar value for YAML output.
 */
function serializeScalar(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (
      value === '' ||
      value === 'true' ||
      value === 'false' ||
      value === 'null' ||
      /^[\d]/.test(value) ||
      value.includes(':') ||
      value.includes('#')
    ) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  return String(value);
}

/**
 * Read a markdown record file and parse its YAML frontmatter and body.
 *
 * @param path - Path to the markdown file
 * @returns An object with typed frontmatter and body string
 * @throws If the file does not exist or has no valid frontmatter
 */
export function readRecord<T>(path: string): { frontmatter: T; body: string } {
  const content = readFileSync(path, 'utf-8');

  if (!content.startsWith('---')) {
    throw new Error(`File ${path} does not start with YAML frontmatter delimiter`);
  }

  const secondDelimiter = content.indexOf('---', 3);
  if (secondDelimiter === -1) {
    throw new Error(`File ${path} has no closing YAML frontmatter delimiter`);
  }

  const yamlStr = content.slice(3, secondDelimiter).trim();
  const body = content.slice(secondDelimiter + 3).replace(/^\n/, '');

  const frontmatter = parseYaml(yamlStr) as T;

  return { frontmatter, body };
}

/**
 * Write a markdown record file with YAML frontmatter and body.
 *
 * @param path - Path to write the file
 * @param frontmatter - Typed frontmatter object to serialize as YAML
 * @param body - Markdown body content
 */
export function writeRecord<T>(
  path: string,
  frontmatter: T,
  body: string
): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const yaml = serializeYaml(frontmatter as unknown as Record<string, unknown>);
  const content = `---\n${yaml}\n---\n${body}`;

  writeFileSync(path, content, 'utf-8');
}

/**
 * Update specific frontmatter fields in an existing record without touching the body.
 *
 * @param path - Path to the existing markdown file
 * @param updates - Partial frontmatter fields to merge
 * @throws If the file does not exist
 */
export function updateFrontmatter<T>(
  path: string,
  updates: Partial<T>
): void {
  const { frontmatter, body } = readRecord<Record<string, unknown>>(path);
  const merged = { ...frontmatter, ...updates };
  writeRecord(path, merged, body);
}
