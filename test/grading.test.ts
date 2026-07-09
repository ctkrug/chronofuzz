import { describe, expect, it } from "vitest";
import { sameInstant, utcFields, observed, isRejection } from "../src/eval/grading";

describe("sameInstant", () => {
  it("treats equal instants in different formats as the same", () => {
    expect(sameInstant("2024-01-01T00:00:00Z", "2024-01-01T00:00:00.000+00:00")).toBe(true);
  });

  it("distinguishes different instants", () => {
    expect(sameInstant("2024-01-01T00:00:00Z", "2024-01-01T01:00:00Z")).toBe(false);
  });

  it("returns false when either side is unparseable", () => {
    expect(sameInstant("not-a-date", "2024-01-01T00:00:00Z")).toBe(false);
    expect(sameInstant("2024-01-01T00:00:00Z", "Invalid Date")).toBe(false);
  });
});

describe("utcFields", () => {
  it("exposes stable UTC calendar fields (1-indexed month)", () => {
    expect(utcFields("2023-03-01T12:00:00Z")).toEqual({ year: 2023, month: 3, day: 1 });
  });

  it("returns null for an unparseable instant", () => {
    expect(utcFields("Invalid Date")).toBeNull();
  });
});

describe("observed", () => {
  it("returns the value for a successful outcome", () => {
    expect(observed({ ok: true, value: "42" })).toBe("42");
  });

  it("returns the error for a failed outcome", () => {
    expect(observed({ ok: false, error: "boom" })).toBe("boom");
  });
});

describe("isRejection", () => {
  it("treats a thrown error as a rejection", () => {
    expect(isRejection({ ok: false, error: "RangeError: Invalid time value" })).toBe(true);
  });

  it("treats a returned Invalid Date as a rejection", () => {
    expect(isRejection({ ok: true, value: "Invalid Date" })).toBe(true);
    expect(isRejection({ ok: true, value: "  Invalid Date  " })).toBe(true);
  });

  it("does not treat a real value as a rejection", () => {
    expect(isRejection({ ok: true, value: "2023-03-01T12:00:00.000Z" })).toBe(false);
  });
});
