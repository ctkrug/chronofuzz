import { describe, expect, it } from "vitest";
import { renderVerdictRow } from "../src/ui/app";
import { fail, pass, ambiguous } from "../src/eval/grading";
import type { Landmine } from "../src/corpus";

const landmine: Landmine = {
  id: "dst-spring-forward-nonexistent",
  title: "DST spring-forward: the clock skips 2:00–3:00 AM",
  category: "dst",
  isoInput: "2023-03-12T02:30:00",
  timezone: "America/New_York",
  expectedNote: "2:30 AM never existed.",
  context: "US DST began at 2:00 AM.",
};

describe("renderVerdictRow", () => {
  it("marks a failing row and shows the wrong value inline", () => {
    const verdict = fail("Accepted a time that never existed", "note", "2023-03-12T02:30:00.000Z");
    verdict.expected = "rejection, or 2023-03-12T07:30:00Z";
    const row = renderVerdictRow(landmine, verdict);

    expect(row.classList.contains("result-fail")).toBe(true);
    expect(row.dataset.kind).toBe("fail");
    expect(row.querySelector(".verdict-badge")?.textContent).toBe("FAIL");
    expect(row.querySelector(".result-actual")?.textContent).toContain("2023-03-12T02:30:00.000Z");
  });

  it("draws a strike and an actual-vs-expected diff on a failing row (story 1.3)", () => {
    const verdict = fail("broke", "note", "2023-03-12T02:30:00.000Z");
    verdict.expected = "2023-03-12T07:30:00Z";
    const row = renderVerdictRow(landmine, verdict);

    expect(row.querySelector(".strike")).not.toBeNull();
    const diff = row.querySelector(".result-diff");
    expect(diff).not.toBeNull();
    expect(diff?.querySelector(".diff-actual")?.textContent).toContain("02:30");
    expect(diff?.querySelector(".diff-expected")?.textContent).toContain("07:30");
  });

  it("shows a passing row without a diff", () => {
    const row = renderVerdictRow(landmine, pass("Correct instant", "note", "value"));
    expect(row.classList.contains("result-pass")).toBe(true);
    expect(row.querySelector(".result-diff")).toBeNull();
  });

  it("shows an ambiguous row with the chosen value and no diff", () => {
    const row = renderVerdictRow(
      landmine,
      ambiguous("No single answer", "note", "2023-11-05T05:30:00.000Z"),
    );
    expect(row.classList.contains("result-ambiguous")).toBe(true);
    expect(row.querySelector(".verdict-badge")?.textContent).toBe("AMBIGUOUS");
    expect(row.querySelector(".result-diff")).toBeNull();
    expect(row.querySelector(".result-actual")?.textContent).toContain("2023-11-05T05:30:00.000Z");
  });

  it("escapes untrusted output values instead of injecting markup", () => {
    const row = renderVerdictRow(landmine, fail("x", "note", "<img src=x onerror=alert(1)>"));
    expect(row.querySelector("img")).toBeNull();
    expect(row.querySelector(".result-actual")?.textContent).toContain("<img");
  });
});
