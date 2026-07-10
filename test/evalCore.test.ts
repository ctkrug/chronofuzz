import { describe, expect, it } from "vitest";
import { evaluateSource, toDisplayValue } from "../src/sandbox/evalCore";

describe("toDisplayValue", () => {
  it("renders a valid Date as its ISO string", () => {
    expect(toDisplayValue(new Date("2024-01-01T00:00:00Z"))).toBe("2024-01-01T00:00:00.000Z");
  });

  it("renders an invalid Date as the literal 'Invalid Date'", () => {
    expect(toDisplayValue(new Date("not-a-date"))).toBe("Invalid Date");
  });

  it("renders a plain object via JSON.stringify", () => {
    expect(toDisplayValue({ year: 2024, month: 1 })).toBe('{"year":2024,"month":1}');
  });

  it("falls back to String() when JSON.stringify throws (circular reference)", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(toDisplayValue(circular)).toBe(String(circular));
  });

  it("renders primitives via String()", () => {
    expect(toDisplayValue(42)).toBe("42");
    expect(toDisplayValue("hello")).toBe("hello");
    expect(toDisplayValue(true)).toBe("true");
    expect(toDisplayValue(null)).toBe("null");
    expect(toDisplayValue(undefined)).toBe("undefined");
  });
});

describe("evaluateSource", () => {
  it("invokes the pasted function and displays its return value", () => {
    const result = evaluateSource("(iso) => new Date(iso)", "2024-01-01T00:00:00Z", undefined);
    expect(result).toEqual({ ok: true, value: "2024-01-01T00:00:00.000Z" });
  });

  it("passes the time zone through as the function's second argument", () => {
    const result = evaluateSource(
      "(iso, tz) => tz ?? 'no-tz'",
      "2024-01-01T00:00:00Z",
      "America/Chicago",
    );
    expect(result).toEqual({ ok: true, value: "America/Chicago" });
  });

  it("errors cleanly when the pasted source is not a function", () => {
    const result = evaluateSource("42", "2024-01-01T00:00:00Z", undefined);
    expect(result).toEqual({
      ok: false,
      error: "Pasted source did not evaluate to a function.",
    });
  });

  it("errors cleanly when the pasted source is unparseable syntax", () => {
    const result = evaluateSource("this is not valid js (((", "2024-01-01T00:00:00Z", undefined);
    expect(result.ok).toBe(false);
  });

  it("catches a thrown Error and surfaces its message", () => {
    const result = evaluateSource(
      "() => { throw new RangeError('boom'); }",
      "2024-01-01T00:00:00Z",
      undefined,
    );
    expect(result).toEqual({ ok: false, error: "boom" });
  });

  it("catches a non-Error throw and stringifies it", () => {
    const result = evaluateSource(
      "() => { throw 'a string throw'; }",
      "2024-01-01T00:00:00Z",
      undefined,
    );
    expect(result).toEqual({ ok: false, error: "a string throw" });
  });
});
