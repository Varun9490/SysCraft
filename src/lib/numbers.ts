/**
 * Parse a numeric input's raw string into a finite number.
 *
 * `Number("")` is 0 and `Number("12e")` is NaN, both of which poison
 * downstream math (NaN spreads through Math.min/max and into layout).
 * Falls back to `fallback` for empty or invalid input — prefer the
 * previous state as the fallback so typing stays forgiving.
 */
export function parseFiniteNumber(raw: string, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}
