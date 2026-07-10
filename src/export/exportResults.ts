import type { LandmineResult } from "../eval/engine";
import type { VerdictKind } from "../eval/types";

export interface ExportedLandmineResult {
  id: string;
  verdict: VerdictKind;
  actual?: string;
  expected?: string;
  note: string;
}

export interface ExportedRun {
  corpusVersion: string;
  exportedAt: string;
  results: ExportedLandmineResult[];
}

/**
 * Builds the JSON-serializable export for a completed battery run (story
 * 3.2): every landmine's id, verdict, actual value, and expected-behavior
 * note, plus the corpus version and export timestamp so the file is
 * traceable to what produced it. `corpusVersion`/`exportedAt` are parameters
 * rather than read internally so this stays a pure, deterministic function to
 * test.
 */
export function buildExport(
  results: readonly LandmineResult[],
  corpusVersion: string,
  exportedAt: string,
): ExportedRun {
  return {
    corpusVersion,
    exportedAt,
    results: results.map(({ landmine, verdict }) => ({
      id: landmine.id,
      verdict: verdict.kind,
      actual: verdict.actual,
      expected: verdict.expected,
      note: verdict.detail,
    })),
  };
}
