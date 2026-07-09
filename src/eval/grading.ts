import type { ProbeOutcome, Verdict } from "./types";

/** Verdict constructor: the function handled the landmine correctly. */
export function pass(headline: string, detail: string, actual?: string): Verdict {
  return { kind: "pass", headline, detail, actual };
}

/** Verdict constructor: the function exhibited the landmine's classic bug. */
export function fail(headline: string, detail: string, actual?: string): Verdict {
  return { kind: "fail", headline, detail, actual };
}

/** Verdict constructor: the landmine has no single correct answer. */
export function ambiguous(headline: string, detail: string, actual?: string): Verdict {
  return { kind: "ambiguous", headline, detail, actual };
}

/**
 * True when two ISO-8601 strings denote the same absolute instant. Compares by
 * epoch milliseconds, so it is independent of the runtime's local timezone and
 * of formatting differences (trailing `.000`, `+00:00` vs `Z`). Returns false
 * if either string is unparseable.
 */
export function sameInstant(a: string, b: string): boolean {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  return Number.isFinite(ta) && Number.isFinite(tb) && ta === tb;
}

/**
 * The UTC calendar fields of an ISO instant, or null if unparseable. Used to
 * detect silent rollovers (e.g. Feb 29 → Mar 1) without any timezone ambiguity,
 * since UTC fields are stable across runtimes.
 */
export function utcFields(iso: string): { year: number; month: number; day: number } | null {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Extracts the observed output string from an outcome, for inline display. */
export function observed(outcome: ProbeOutcome): string {
  return outcome.ok ? outcome.value : outcome.error;
}

/**
 * True when the function refused the input rather than silently producing a
 * value — either it threw (an errored outcome) or it returned a JS `Invalid
 * Date`, whose display value is the literal string "Invalid Date". For inputs
 * that denote a nonexistent instant, refusing is the correct, safe behavior.
 */
export function isRejection(outcome: ProbeOutcome): boolean {
  return !outcome.ok || outcome.value.trim() === "Invalid Date";
}
