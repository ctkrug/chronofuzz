import { describe, expect, it } from "vitest";
import { LANDMINES } from "../src/corpus";
import { getEvaluator, hasEvaluator } from "../src/eval/evaluators";

describe("evaluator registry", () => {
  it("registers an evaluator for every landmine in the corpus", () => {
    for (const landmine of LANDMINES) {
      expect(hasEvaluator(landmine.id)).toBe(true);
    }
  });

  it("builds a single probe carrying the landmine's own input and zone", () => {
    for (const landmine of LANDMINES) {
      const evaluator = getEvaluator(landmine);
      expect(evaluator.probes).toHaveLength(1);
      expect(evaluator.probes[0]?.isoInput).toBe(landmine.isoInput);
      expect(evaluator.probes[0]?.timeZone).toBe(landmine.timezone);
    }
  });

  it("carries the landmine's note into the graded verdict detail", () => {
    const landmine = LANDMINES[0]!;
    const evaluator = getEvaluator(landmine);
    const verdict = evaluator.grade([{ ok: true, value: "whatever" }]);
    expect(verdict.detail).toBe(landmine.expectedNote);
  });

  it("throws for a landmine with no registered spec", () => {
    expect(() =>
      getEvaluator({
        id: "not-a-real-landmine",
        title: "x",
        category: "dst",
        isoInput: "2024-01-01T00:00:00Z",
        expectedNote: "x",
        context: "x",
      }),
    ).toThrow(/No evaluator registered/);
  });
});
