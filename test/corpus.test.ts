import { describe, expect, it } from "vitest";
import { LANDMINES, CORPUS_VERSION, getLandmineById, landminesByCategory } from "../src/corpus";
import type { LandmineCategory } from "../src/corpus";

const ALL_CATEGORIES: LandmineCategory[] = [
  "dst",
  "leap-day",
  "leap-second",
  "epoch-boundary",
  "parsing",
  "iso-week",
];

describe("corpus", () => {
  it("has no duplicate landmine ids", () => {
    const ids = LANDMINES.map((landmine) => landmine.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("holds at least 20 landmines (story 1.2 target)", () => {
    expect(LANDMINES.length).toBeGreaterThanOrEqual(20);
  });

  it("covers every category with at least two entries", () => {
    const grouped = landminesByCategory();
    for (const category of ALL_CATEGORIES) {
      expect(grouped.get(category)?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
  });

  it("uses only known categories", () => {
    for (const landmine of LANDMINES) {
      expect(ALL_CATEGORIES).toContain(landmine.category);
    }
  });

  it("gives every landmine a non-empty cited context", () => {
    for (const landmine of LANDMINES) {
      expect(landmine.context.trim().length).toBeGreaterThan(0);
    }
  });

  it("gives every landmine a parseable ISO input", () => {
    for (const landmine of LANDMINES) {
      expect(landmine.isoInput.length).toBeGreaterThan(0);
    }
  });

  it("gives every landmine a non-empty title and expected-behavior note", () => {
    for (const landmine of LANDMINES) {
      expect(landmine.title.trim().length).toBeGreaterThan(0);
      expect(landmine.expectedNote.trim().length).toBeGreaterThan(0);
    }
  });

  it("looks up a known landmine by id", () => {
    const landmine = getLandmineById("leap-day-valid");
    expect(landmine?.category).toBe("leap-day");
  });

  it("returns undefined for an unknown id", () => {
    expect(getLandmineById("does-not-exist")).toBeUndefined();
  });

  it("groups landmines by category, covering every entry exactly once", () => {
    const grouped = landminesByCategory();
    const total = [...grouped.values()].reduce((sum, bucket) => sum + bucket.length, 0);
    expect(total).toBe(LANDMINES.length);
  });

  it("includes at least one DST landmine for each transition direction", () => {
    const dstTitles = LANDMINES.filter((l) => l.category === "dst").map((l) => l.id);
    expect(dstTitles).toContain("dst-spring-forward-nonexistent");
    expect(dstTitles).toContain("dst-fall-back-ambiguous");
  });

  it("exposes CORPUS_VERSION as a plain YYYY-MM-DD date (story 3.2)", () => {
    expect(CORPUS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
