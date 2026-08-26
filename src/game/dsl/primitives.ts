/**
 * Shared primitives for the Beat Streets DSL.
 *
 * The game's data files are JSON; the DSL gives them types + runtime validation.
 * JSON-only limitations (string booleans, string keys) are normalised here so the
 * engine reads clean typed values.
 */

/** A position, either absolute numbers or a symbolic name resolved later. */
export type PosValue = number | 'MIN_WALK_Y';

/** A two-element position, e.g. [x, y]. */
export type Pos2 = [PosValue, PosValue];

/** Normalise a JSON string boolean ("True"/"False"/true/false) to a real boolean. */
export function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

/** Normalise a JSON string number to a real number (or pass through). */
export function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/** Convert a JSON object of string keys to a real (possibly numeric-keyed) object. */
export function toNumericKeys<T>(obj: Record<string, T>): Record<number, T> {
  const out: Record<number, T> = {};
  for (const key of Object.keys(obj)) {
    const num = Number(key);
    out[Number.isNaN(num) ? (key as unknown as number) : num] = obj[key];
  }
  return out;
}
