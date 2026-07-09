/**
 * A verdict is the machine-checkable outcome of running a function under test
 * against one landmine. Unlike a raw actual-vs-expected dump, a verdict is a
 * decided grade: the function either handled the landmine correctly (`pass`),
 * exhibited the classic bug (`fail`), or hit an inherently ambiguous case where
 * the "correct" answer is context-dependent (`ambiguous`) — never silently
 * coerced into pass or fail.
 */
export type VerdictKind = "pass" | "fail" | "ambiguous";

export interface Verdict {
  kind: VerdictKind;
  /** A short, scannable summary of what happened. */
  headline: string;
  /** The full explanation, citing the real-world reason and the wrong value. */
  detail: string;
  /** The function's observed output (or error), shown inline. */
  actual?: string;
  /** The correct value the actual is measured against, for the inline diff.
   * Absent when there is no single correct answer (ambiguous verdicts). */
  expected?: string;
}

/**
 * One invocation the evaluator wants performed. Most landmines need a single
 * probe; a few (e.g. detecting timezone-blindness) declare several so the
 * evaluator can compare outputs across inputs.
 */
export interface Probe {
  isoInput: string;
  /** Passed to the function as its second argument (an IANA zone or "UTC"). */
  timeZone?: string;
  /** Optional human label distinguishing probes of the same landmine. */
  label?: string;
}

/** The result of a single probe, normalized for grading (no ids/timings). */
export type ProbeOutcome = { ok: true; value: string } | { ok: false; error: string };

/**
 * The grading strategy for one landmine: which probes to run, and how to turn
 * their outcomes into a verdict. Kept separate from the corpus metadata so the
 * corpus stays pure data (exportable, serializable) and the grading logic stays
 * pure and unit-testable in isolation.
 */
export interface LandmineEvaluator {
  probes: Probe[];
  grade: (outcomes: ProbeOutcome[]) => Verdict;
}
