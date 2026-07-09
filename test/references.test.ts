import { describe, expect, it } from "vitest";
import { LANDMINES } from "../src/corpus";
import { evaluateBattery, type ProbeRunner } from "../src/eval/engine";
import { evaluateSource } from "../src/sandbox/evalCore";

/**
 * The naive passthrough that the app pre-fills: it ignores the target zone and
 * trusts JavaScript's Date constructor. This is the reference "buggy"
 * implementation whose failures the whole product exists to surface.
 */
const NAIVE_SOURCE = `function normalize(iso) {
  const d = new Date(iso);
  return d.toISOString();
}`;

/** Backs the grading engine with the real evalCore, running in Node under TZ=UTC. */
const runNaive: ProbeRunner = (probe) =>
  Promise.resolve(evaluateSource(NAIVE_SOURCE, probe.isoInput, probe.timeZone));

async function gradeAll() {
  const results = await evaluateBattery(LANDMINES, runNaive);
  return new Map(results.map((r) => [r.landmine.id, r.verdict]));
}

describe("naive reference against the full battery", () => {
  it("produces at least one failing and one passing row (story 1.1)", async () => {
    const verdicts = [...(await gradeAll()).values()];
    expect(verdicts.some((v) => v.kind === "fail")).toBe(true);
    expect(verdicts.some((v) => v.kind === "pass")).toBe(true);
  });

  it("flags DST spring-forward as failing with the wrong wall-clock time inline", async () => {
    const verdict = (await gradeAll()).get("dst-spring-forward-nonexistent");
    expect(verdict?.kind).toBe("fail");
    expect(verdict?.actual).toContain("02:30");
  });

  it("renders DST fall-back as a distinct ambiguous state, never coerced", async () => {
    const verdict = (await gradeAll()).get("dst-fall-back-ambiguous");
    expect(verdict?.kind).toBe("ambiguous");
  });

  it("catches the Feb 29 non-leap-year silent rollover to March 1", async () => {
    const verdict = (await gradeAll()).get("leap-day-non-leap-year-rollover");
    expect(verdict?.kind).toBe("fail");
    expect(verdict?.actual).toContain("2023-03-01");
  });

  it("passes the valid leap day", async () => {
    expect((await gradeAll()).get("leap-day-valid")?.kind).toBe("pass");
  });

  it("catches the date-only UTC-vs-local timezone shift", async () => {
    expect((await gradeAll()).get("parsing-date-only-string-timezone-shift")?.kind).toBe("fail");
  });

  it("grades every landmine without throwing", async () => {
    const verdicts = await gradeAll();
    expect(verdicts.size).toBe(LANDMINES.length);
    for (const verdict of verdicts.values()) {
      expect(["pass", "fail", "ambiguous"]).toContain(verdict.kind);
    }
  });
});
