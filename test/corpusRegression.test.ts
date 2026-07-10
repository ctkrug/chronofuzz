import { describe, expect, it } from "vitest";
import { LANDMINES } from "../src/corpus";
import { evaluateBattery, type ProbeRunner } from "../src/eval/engine";
import { evaluateSource } from "../src/sandbox/evalCore";

/**
 * A reference implementation that gets every landmine right (or, for the
 * inherently ambiguous ones, is explicit about the ambiguity rather than
 * picking silently). It resolves the target IANA zone with the Intl tzdata
 * "guess and check" technique: format a UTC guess back into the zone, and
 * iterate until the offset stabilizes. When it never stabilizes, the wall
 * clock names a spring-forward gap (a skipped hour) — the offset in effect
 * just before the gap (the smaller of the two candidates) is used, which is
 * arithmetically identical to shifting the wall clock forward by the gap and
 * reading it in the post-transition offset.
 */
const CORRECT_SOURCE = `(function () {
  function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }
  function isValidCalendarDate(y, mo, d) {
    if (mo < 1 || mo > 12) return false;
    var days = [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return d >= 1 && d <= days[mo - 1];
  }
  function offsetAt(utcMs, timeZone) {
    var dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    var parts = dtf.formatToParts(new Date(utcMs));
    var m = {};
    for (var i = 0; i < parts.length; i++) m[parts[i].type] = parts[i].value;
    var hour = Number(m.hour);
    if (hour === 24) hour = 0;
    var asUtc = Date.UTC(Number(m.year), Number(m.month) - 1, Number(m.day), hour, Number(m.minute), Number(m.second));
    return asUtc - utcMs;
  }
  function convertLocalToUtc(y, mo, d, h, mi, s, ms, timeZone) {
    var naiveUtc = Date.UTC(y, mo - 1, d, h, mi, s, ms);
    if (!timeZone || timeZone === "UTC") return naiveUtc;
    var o1 = offsetAt(naiveUtc, timeZone);
    var utc1 = naiveUtc - o1;
    var o2 = offsetAt(utc1, timeZone);
    var utc2 = naiveUtc - o2;
    if (o1 === o2) return utc2;
    var o3 = offsetAt(utc2, timeZone);
    if (o3 !== o2) {
      var preOffset = Math.min(o1, o2);
      return naiveUtc - preOffset;
    }
    return utc2;
  }
  return function normalize(iso, timeZone) {
    var m = iso.match(/^(\\d{4})-(\\d{2})-(\\d{2})(?:[T ](\\d{2}):(\\d{2}):(\\d{2})(?:\\.(\\d+))?)?(Z)?$/);
    if (!m) {
      var fallback = new Date(iso);
      if (Number.isNaN(fallback.getTime())) throw new Error("Unparseable date: " + iso);
      return fallback.toISOString();
    }
    var year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
    var hour = Number(m[4] || "0"), minute = Number(m[5] || "0"), second = Number(m[6] || "0");
    var fracStr = m[7] || "";
    var ms = fracStr ? Number((fracStr + "000").slice(0, 3)) : 0;
    if (second === 60) throw new Error("Leap seconds are not representable.");
    if (!isValidCalendarDate(year, month, day)) {
      throw new Error(year + "-" + month + "-" + day + " is not a valid calendar date.");
    }
    if (m[8]) {
      return new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms)).toISOString();
    }
    var zone = timeZone || "UTC";
    var utcMs = convertLocalToUtc(year, month, day, hour, minute, second, ms, zone);
    return new Date(utcMs).toISOString();
  };
})()`;

/**
 * A reference implementation that embodies the specific classic bug each
 * category's `expectedNote` describes: it ignores the target zone entirely,
 * silently coerces a leap second to `:59` instead of rejecting it, and
 * reconstructs the instant through a whole-second, signed-32-bit epoch —
 * reproducing the falsy-zero bug, the unsigned/clamped-negative bug, and the
 * Year 2038 overflow in one pass.
 */
const BUGGY_SOURCE = `function normalize(iso, timeZone) {
  var patched = iso.replace(":60", ":59");
  var d = new Date(patched);
  if (Number.isNaN(d.getTime())) return d;
  var sec = Math.floor(d.getTime() / 1000);
  if (sec === 0) return "unknown";
  if (sec < 0) sec = 0;
  sec = sec | 0;
  return new Date(sec * 1000).toISOString();
}`;

const runCorrect: ProbeRunner = (probe) =>
  Promise.resolve(evaluateSource(CORRECT_SOURCE, probe.isoInput, probe.timeZone));
const runBuggy: ProbeRunner = (probe) =>
  Promise.resolve(evaluateSource(BUGGY_SOURCE, probe.isoInput, probe.timeZone));

async function verdictsFor(runProbe: ProbeRunner) {
  const results = await evaluateBattery(LANDMINES, runProbe);
  return new Map(results.map((r) => [r.landmine.id, r.verdict]));
}

/**
 * Every landmine where a timezone-blind, whole-second-epoch implementation
 * exhibits its classic bug. The remaining landmines are either inherently
 * ambiguous (never fail, by grading design) or "control" cases the corpus
 * pairs alongside a broken counterpart specifically so a naive implementation
 * that gets the easy half right can't be mistaken for a correct one.
 */
const BUGGY_SHOULD_FAIL = new Set([
  "dst-spring-forward-nonexistent",
  "dst-spring-forward-sydney",
  "leap-day-non-leap-year-rollover",
  "leap-day-century-1900-non-leap",
  "leap-second-1972-06-30",
  "leap-second-2015-06-30",
  "leap-second-2016-12-31",
  "epoch-2038-signed-32-bit-overflow",
  "epoch-unix-zero",
  "epoch-negative-pre-1970",
  "parsing-date-only-string-timezone-shift",
  "parsing-fractional-microseconds",
]);

describe("corpus regression: correct vs. buggy reference implementations (story 4.2)", () => {
  it("registers a fail expectation for every landmine id that actually exists", () => {
    const ids = new Set(LANDMINES.map((l) => l.id));
    for (const id of BUGGY_SHOULD_FAIL) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it("the correct implementation never exhibits the classic bug on any landmine", async () => {
    const verdicts = await verdictsFor(runCorrect);
    expect(verdicts.size).toBe(LANDMINES.length);
    for (const [id, verdict] of verdicts) {
      expect(verdict.kind, `landmine "${id}" should not fail against a correct implementation`).not.toBe(
        "fail",
      );
    }
  });

  it("the buggy implementation fails every landmine with a known classic bug", async () => {
    const verdicts = await verdictsFor(runBuggy);
    for (const id of BUGGY_SHOULD_FAIL) {
      expect(verdicts.get(id)?.kind, `landmine "${id}" should fail against the buggy implementation`).toBe(
        "fail",
      );
    }
  });

  it("the buggy implementation does not falsely fail the corpus's control and ambiguous cases", async () => {
    const verdicts = await verdictsFor(runBuggy);
    for (const [id, verdict] of verdicts) {
      if (BUGGY_SHOULD_FAIL.has(id)) continue;
      expect(verdict.kind, `landmine "${id}" is a control/ambiguous case`).not.toBe("fail");
    }
  });

  it("the buggy fail set spans every category except iso-week", async () => {
    const failingCategories = new Set(
      LANDMINES.filter((l) => BUGGY_SHOULD_FAIL.has(l.id)).map((l) => l.category),
    );
    expect([...failingCategories].sort()).toEqual(
      ["dst", "epoch-boundary", "leap-day", "leap-second", "parsing"].sort(),
    );
  });
});
