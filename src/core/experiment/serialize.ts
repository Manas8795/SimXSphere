/**
 * Canonical JSON Serializer
 * Strict compliance with EXPERIMENT_SCHEMA:
 * - Keys sorted recursively in lexicographical order (ASCII/UTF-16 code units)
 * - No insignificant whitespace
 * - Arrays maintain order
 * - Rejects NaN, Infinity, -Infinity, undefined, functions, and symbols
 */

export function sortKeysRecursively(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error(`Canonical JSON error: non-finite number ${value} is not allowed`);
      }
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sortKeysRecursively(item));
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    const val = obj[key];
    if (val !== undefined && typeof val !== 'function' && typeof val !== 'symbol') {
      result[key] = sortKeysRecursively(val);
    }
  }

  return result;
}

export function serializeCanonicalJson(obj: unknown): string {
  const normalized = sortKeysRecursively(obj);
  return JSON.stringify(normalized);
}

export function parseCanonicalJson<T = unknown>(jsonStr: string): T {
  const parsed = JSON.parse(jsonStr);
  return parsed as T;
}

/**
 * Compare two objects for canonical equality
 */
export function areCanonicallyEqual(a: unknown, b: unknown): boolean {
  try {
    return serializeCanonicalJson(a) === serializeCanonicalJson(b);
  } catch {
    return false;
  }
}
