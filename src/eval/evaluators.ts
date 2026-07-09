import type { Landmine } from "../corpus/types";
import type { LandmineEvaluator, Probe } from "./types";
import {
  expectInstant,
  expectRejection,
  expectShiftOrReject,
  alwaysAmbiguous,
  type GradeFn,
} from "./strategies";

/**
 * The machine-checkable facts for each landmine — the one datum a strategy
 * can't derive from the corpus prose. Kept as a tiny table so grading stays in
 * sync with the corpus (every landmine id must appear here; a test enforces it)
 * while the human-readable note comes from the landmine itself.
 */
type Spec =
  | { kind: "instant"; expected: string }
  | { kind: "reject" }
  | { kind: "shiftOrReject"; forward: string }
  | { kind: "ambiguous" };

const SPECS: Record<string, Spec> = {
  // DST
  "dst-spring-forward-nonexistent": { kind: "shiftOrReject", forward: "2023-03-12T07:30:00Z" },
  "dst-fall-back-ambiguous": { kind: "ambiguous" },
  "dst-spring-forward-sydney": { kind: "shiftOrReject", forward: "2023-09-30T16:30:00Z" },

  // Leap day
  "leap-day-non-leap-year-rollover": { kind: "reject" },
  "leap-day-valid": { kind: "instant", expected: "2024-02-29T12:00:00Z" },
  "leap-day-century-1900-non-leap": { kind: "reject" },
  "leap-day-century-2000-valid": { kind: "instant", expected: "2000-02-29T12:00:00Z" },

  // Leap second
  "leap-second-1972-06-30": { kind: "reject" },
  "leap-second-2015-06-30": { kind: "reject" },
  "leap-second-2016-12-31": { kind: "reject" },

  // Epoch boundary
  "epoch-2038-signed-32-bit-overflow": { kind: "instant", expected: "2038-01-19T03:14:08Z" },
  "epoch-unix-zero": { kind: "instant", expected: "1970-01-01T00:00:00Z" },
  "epoch-negative-pre-1970": { kind: "instant", expected: "1969-12-31T23:59:59Z" },

  // Parsing
  "parsing-date-only-string-timezone-shift": { kind: "instant", expected: "2024-01-01T05:00:00Z" },
  "parsing-slash-mdy-ambiguous": { kind: "ambiguous" },
  "parsing-space-separator-nonstandard": { kind: "ambiguous" },
  "parsing-fractional-microseconds": { kind: "instant", expected: "2024-01-01T00:00:00.123Z" },

  // ISO week
  "iso-week-year-boundary": { kind: "instant", expected: "2023-01-01T00:00:00Z" },
  "iso-week-53-long-year": { kind: "instant", expected: "2020-12-31T00:00:00Z" },
  "iso-week-late-december-next-year": { kind: "instant", expected: "2019-12-30T00:00:00Z" },
};

function buildGrade(spec: Spec, note: string): GradeFn {
  switch (spec.kind) {
    case "instant":
      return expectInstant(spec.expected, note);
    case "reject":
      return expectRejection(note);
    case "shiftOrReject":
      return expectShiftOrReject(spec.forward, note);
    case "ambiguous":
      return alwaysAmbiguous(note);
  }
}

/** True once every landmine id has a grading spec. Guards against drift. */
export function hasEvaluator(id: string): boolean {
  return id in SPECS;
}

/**
 * Builds the evaluator for a landmine: a single probe feeding the landmine's
 * own input and target zone into the function, plus the grade strategy chosen
 * by its spec. Throws if the corpus adds a landmine without a matching spec, so
 * an ungraded landmine can never silently ship.
 */
export function getEvaluator(landmine: Landmine): LandmineEvaluator {
  const spec = SPECS[landmine.id];
  if (!spec) {
    throw new Error(`No evaluator registered for landmine "${landmine.id}".`);
  }
  const probes: Probe[] = [{ isoInput: landmine.isoInput, timeZone: landmine.timezone }];
  return { probes, grade: buildGrade(spec, landmine.expectedNote) };
}
