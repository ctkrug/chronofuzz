import { describe, expect, it } from "vitest";
import { buildExport } from "../src/export/exportResults";
import { LANDMINES } from "../src/corpus";
import type { LandmineResult } from "../src/eval/engine";

function resultFor(id: string, verdict: LandmineResult["verdict"]): LandmineResult {
  const landmine = LANDMINES.find((l) => l.id === id);
  if (!landmine) throw new Error(`fixture landmine "${id}" not found`);
  return { landmine, verdict };
}

describe("buildExport", () => {
  it("includes the corpus version and export timestamp verbatim", () => {
    const exported = buildExport([], "2026-07-10", "2026-07-10T12:00:00.000Z");

    expect(exported.corpusVersion).toBe("2026-07-10");
    expect(exported.exportedAt).toBe("2026-07-10T12:00:00.000Z");
  });

  it("maps each result's id, verdict kind, actual, expected, and note", () => {
    const results: LandmineResult[] = [
      resultFor("leap-day-valid", {
        kind: "pass",
        headline: "Handled",
        detail: "Correctly returned the valid leap day.",
        actual: "2024-02-29T12:00:00.000Z",
        expected: "2024-02-29T12:00:00.000Z",
      }),
      resultFor("dst-fall-back-ambiguous", {
        kind: "ambiguous",
        headline: "Ambiguous",
        detail: "This instant occurs twice; no single correct answer.",
        actual: "2023-11-05T01:30:00.000Z",
      }),
    ];

    const exported = buildExport(results, "2026-07-10", "2026-07-10T12:00:00.000Z");

    expect(exported.results).toEqual([
      {
        id: "leap-day-valid",
        verdict: "pass",
        actual: "2024-02-29T12:00:00.000Z",
        expected: "2024-02-29T12:00:00.000Z",
        note: "Correctly returned the valid leap day.",
      },
      {
        id: "dst-fall-back-ambiguous",
        verdict: "ambiguous",
        actual: "2023-11-05T01:30:00.000Z",
        expected: undefined,
        note: "This instant occurs twice; no single correct answer.",
      },
    ]);
  });

  it("produces valid, round-trippable JSON", () => {
    const results: LandmineResult[] = [
      resultFor("leap-day-valid", {
        kind: "pass",
        headline: "Handled",
        detail: "Correctly returned the valid leap day.",
        actual: "2024-02-29T12:00:00.000Z",
      }),
    ];

    const json = JSON.stringify(buildExport(results, "2026-07-10", "2026-07-10T12:00:00.000Z"));
    const parsed = JSON.parse(json);

    expect(parsed.corpusVersion).toBe("2026-07-10");
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].id).toBe("leap-day-valid");
  });

  it("returns an empty results array for an empty input, still carrying version/date", () => {
    const exported = buildExport([], "2026-07-10", "2026-07-10T12:00:00.000Z");

    expect(exported.results).toEqual([]);
    expect(exported.corpusVersion).toBe("2026-07-10");
  });
});
