import type { Landmine } from "./types";

/**
 * Seed corpus for the v1 scaffold. Each entry is a real, documented failure
 * mode, not a synthetic edge case — see docs/BACKLOG.md for the plan to grow
 * this into a much larger, categorized battery.
 */
export const LANDMINES: Landmine[] = [
  {
    id: "dst-spring-forward-nonexistent",
    title: "DST spring-forward: the clock skips 2:00–3:00 AM",
    category: "dst",
    isoInput: "2023-03-12T02:30:00",
    timezone: "America/New_York",
    expectedNote:
      "2:30 AM never occurred on this date in this zone — clocks jumped from 1:59:59 to " +
      "3:00:00. A correct implementation should normalize to 3:30 AM (or explicitly reject the " +
      "input), not silently accept a wall-clock time that never existed.",
    context:
      "US DST began at 2:00 AM local time on 2023-03-12. Naive wall-clock arithmetic that " +
      "ignores the zone transition will construct a Date for a time that was never real.",
  },
  {
    id: "dst-fall-back-ambiguous",
    title: "DST fall-back: 1:00–2:00 AM happens twice",
    category: "dst",
    isoInput: "2023-11-05T01:30:00",
    timezone: "America/New_York",
    expectedNote:
      "1:30 AM occurred twice on this date (once at UTC-4, once at UTC-5). A correct " +
      "implementation should be explicit about which occurrence it means, rather than " +
      "silently picking one and treating the instant as unambiguous.",
    context:
      "US DST ended at 2:00 AM local time on 2023-11-05, when clocks fell back to 1:00 AM.",
  },
  {
    id: "leap-day-non-leap-year-rollover",
    title: "Feb 29 on a non-leap year silently rolls to March 1",
    category: "leap-day",
    isoInput: "2023-02-29T12:00:00Z",
    expectedNote:
      "2023 is not a leap year, so Feb 29 does not exist. `new Date(2023, 1, 29)` in " +
      "JavaScript silently normalizes to March 1, 2023 instead of throwing — a correct " +
      "implementation should validate the day-of-month against the year, not trust the " +
      "constructor's rollover.",
    context:
      "A year is a leap year iff divisible by 4, except centuries not divisible by 400 " +
      "(1900 was not a leap year; 2000 was).",
  },
  {
    id: "leap-day-valid",
    title: "Feb 29 on an actual leap year",
    category: "leap-day",
    isoInput: "2024-02-29T12:00:00Z",
    expectedNote:
      "2024 is a leap year, so Feb 29 is a real, valid date. Code that special-cases or " +
      "rejects Feb 29 entirely (rather than validating per-year) will incorrectly fail here.",
    context: "The paired counterpart to the previous landmine — the valid case must also pass.",
  },
  {
    id: "epoch-2038-signed-32-bit-overflow",
    title: "The Year 2038 problem: signed 32-bit Unix time overflows",
    category: "epoch-boundary",
    isoInput: "2038-01-19T03:14:08Z",
    expectedNote:
      "One second past this instant, a signed 32-bit second-precision Unix timestamp " +
      "overflows (2,147,483,647 → -2,147,483,648), wrapping to 1901-12-13. Systems that " +
      "still store epoch seconds in an `int32` will misread this date as being in 1901.",
    context:
      "JavaScript's Date uses a 64-bit float millisecond epoch and doesn't have this bug " +
      "natively, but code that serializes to a 32-bit integer (some databases, C structs, " +
      "binary file formats) does.",
  },
  {
    id: "leap-second-1972-06-30",
    title: "A leap second: 23:59:60 UTC",
    category: "leap-second",
    isoInput: "1972-06-30T23:59:60Z",
    expectedNote:
      "This is the first UTC leap second ever inserted. Almost no runtime date library, " +
      "including JavaScript's Date, can represent `:60` — a correct implementation should " +
      "either handle it explicitly or fail loudly (throw/reject), rather than silently " +
      "truncating to `:59` or rolling over to the next minute unnoticed.",
    context:
      "Leap seconds are inserted irregularly by the IERS to keep UTC aligned with Earth's " +
      "rotation; there is no fixed schedule, which is why they can't be handled by a simple " +
      "arithmetic rule.",
  },
  {
    id: "parsing-date-only-string-timezone-shift",
    title: "\"2024-01-01\" parses as UTC midnight, not local midnight",
    category: "parsing",
    isoInput: "2024-01-01",
    expectedNote:
      "A bare date string (no time or offset) is parsed by JavaScript's Date constructor as " +
      "UTC midnight per the ES2015 spec. In any timezone west of UTC, formatting it with " +
      "local-time methods will display December 31, 2023 — an off-by-one-day bug that only " +
      "reproduces west of Greenwich.",
    context:
      "This is one of the most commonly filed 'off by one day' bugs against date libraries; " +
      "the fix is to parse date-only strings as local, not UTC, when that's the intent.",
  },
  {
    id: "iso-week-year-boundary",
    title: "Jan 1 can belong to the previous ISO week-year",
    category: "iso-week",
    isoInput: "2023-01-01T00:00:00Z",
    expectedNote:
      "2023-01-01 falls in ISO week 52 of 2022, not week 1 of 2023, because the ISO 8601 " +
      "week-numbering year is defined by which year contains that week's Thursday. Code that " +
      "assumes `isoWeekYear === calendarYear` will mislabel this date.",
    context:
      "ISO 8601 weeks start Monday and week 1 is the week containing the year's first " +
      "Thursday; the first days of January frequently belong to the prior week-year.",
  },
];
