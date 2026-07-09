/**
 * The pure evaluation core shared by the Web Worker (in the browser) and the
 * test suite (in Node). Keeping it worker-free means the exact semantics the
 * app runs — how a function's return value is stringified, how errors surface —
 * are the same ones the reference-implementation tests exercise.
 */

/** A normalized run result, structurally compatible with eval ProbeOutcome. */
export type EvalResult = { ok: true; value: string } | { ok: false; error: string };

/** Renders a function's return value to the string shown inline in a result row. */
export function toDisplayValue(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
  }
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Compiles the pasted source to a function and invokes it with the probe input.
 * A thrown error (including a bad paste that isn't a function) becomes an
 * errored result rather than propagating, so callers get a designed outcome,
 * never an uncaught exception.
 */
export function evaluateSource(source: string, isoInput: string, timeZone?: string): EvalResult {
  try {
    const factory = new Function(`"use strict"; return (${source});`);
    const fn = factory();
    if (typeof fn !== "function") {
      throw new TypeError("Pasted source did not evaluate to a function.");
    }
    return { ok: true, value: toDisplayValue(fn(isoInput, timeZone)) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
