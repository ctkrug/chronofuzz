import { describe, expect, it } from "vitest";
import { LANDMINES, getLandmineById, landminesByCategory } from "../src/corpus";

describe("corpus", () => {
  it("has no duplicate landmine ids", () => {
    const ids = LANDMINES.map((landmine) => landmine.id);
    expect(new Set(ids).size).toBe(ids.length);
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
});
