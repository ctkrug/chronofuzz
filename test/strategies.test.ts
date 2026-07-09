import { describe, expect, it } from "vitest";
import {
  expectInstant,
  expectRejection,
  expectShiftOrReject,
  alwaysAmbiguous,
} from "../src/eval/strategies";
import type { ProbeOutcome } from "../src/eval/types";

const ok = (value: string): ProbeOutcome[] => [{ ok: true, value }];
const err = (error: string): ProbeOutcome[] => [{ ok: false, error }];

describe("expectInstant", () => {
  const grade = expectInstant("2024-02-29T12:00:00Z", "must round-trip");

  it("passes when the output is the same instant in any format", () => {
    const verdict = grade(ok("2024-02-29T12:00:00.000Z"));
    expect(verdict.kind).toBe("pass");
    expect(verdict.actual).toBe("2024-02-29T12:00:00.000Z");
  });

  it("fails on a different instant and reports actual + expected", () => {
    const verdict = grade(ok("2024-03-01T12:00:00.000Z"));
    expect(verdict.kind).toBe("fail");
    expect(verdict.actual).toBe("2024-03-01T12:00:00.000Z");
    expect(verdict.expected).toBe("2024-02-29T12:00:00Z");
  });

  it("fails when the function rejects a valid input", () => {
    expect(grade(err("Invalid time value")).kind).toBe("fail");
  });
});

describe("expectRejection", () => {
  const grade = expectRejection("Feb 29 2023 does not exist");

  it("passes when the function throws", () => {
    expect(grade(err("RangeError: Invalid time value")).kind).toBe("pass");
  });

  it("passes when the function returns Invalid Date", () => {
    expect(grade(ok("Invalid Date")).kind).toBe("pass");
  });

  it("fails when the function silently rolls the date over", () => {
    const verdict = grade(ok("2023-03-01T12:00:00.000Z"));
    expect(verdict.kind).toBe("fail");
    expect(verdict.actual).toBe("2023-03-01T12:00:00.000Z");
  });
});

describe("expectShiftOrReject", () => {
  const grade = expectShiftOrReject("2023-03-12T07:30:00Z", "2:30 AM was skipped");

  it("passes when the function rejects the skipped time", () => {
    expect(grade(err("nonexistent local time")).kind).toBe("pass");
  });

  it("passes when the function normalizes forward to the expected instant", () => {
    expect(grade(ok("2023-03-12T07:30:00.000Z")).kind).toBe("pass");
  });

  it("fails when the function accepts the nonexistent wall-clock time", () => {
    const verdict = grade(ok("2023-03-12T02:30:00.000Z"));
    expect(verdict.kind).toBe("fail");
    expect(verdict.actual).toBe("2023-03-12T02:30:00.000Z");
    expect(verdict.expected).toContain("2023-03-12T07:30:00Z");
  });
});

describe("alwaysAmbiguous", () => {
  const grade = alwaysAmbiguous("1:30 AM happened twice");

  it("is ambiguous regardless of the output and never coerces", () => {
    expect(grade(ok("2023-11-05T05:30:00.000Z")).kind).toBe("ambiguous");
    expect(grade(err("boom")).kind).toBe("ambiguous");
  });

  it("surfaces the chosen value inline", () => {
    expect(grade(ok("2023-11-05T05:30:00.000Z")).actual).toBe("2023-11-05T05:30:00.000Z");
  });

  it("leaves expected unset because there is no single right answer", () => {
    expect(grade(ok("x")).expected).toBeUndefined();
  });
});
