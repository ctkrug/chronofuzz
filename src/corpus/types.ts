export type LandmineCategory =
  "dst" | "leap-day" | "leap-second" | "epoch-boundary" | "parsing" | "iso-week";

/**
 * A single curated real-world date/time failure mode. `isoInput` is fed to the
 * function under test; `expectedIso` (when the correct behavior has one true
 * answer) or `expectedNote` (when the "correct" answer is context-dependent,
 * e.g. an ambiguous DST fall-back instant) describes what a correct
 * implementation should do with it.
 */
export interface Landmine {
  id: string;
  title: string;
  category: LandmineCategory;
  isoInput: string;
  timezone?: string;
  expectedNote: string;
  context: string;
}
