import type { Landmine } from "./types";

/**
 * The curated landmine battery. Every entry is a real, documented date/time
 * failure mode with a citable real-world fact in its `context`, not a synthetic
 * edge case. Grading for each id lives in ../eval/evaluators.ts, kept separate
 * so the corpus stays pure, serializable data.
 */
export const LANDMINES: Landmine[] = [
  // ── DST ────────────────────────────────────────────────────────────────
  {
    id: "dst-spring-forward-nonexistent",
    title: "DST spring-forward: the clock skips 2:00–3:00 AM",
    category: "dst",
    isoInput: "2023-03-12T02:30:00",
    timezone: "America/New_York",
    expectedNote:
      "2:30 AM never occurred on this date in this zone — clocks jumped from 1:59:59 to " +
      "3:00:00. A correct implementation should reject the input or normalize it forward to " +
      "3:30 AM EDT (07:30 UTC), not accept a wall-clock time that never existed.",
    context:
      "US DST began at 2:00 AM local time on 2023-03-12. Naive wall-clock arithmetic that " +
      "ignores the zone transition constructs a Date for a time that was never real.",
  },
  {
    id: "dst-fall-back-ambiguous",
    title: "DST fall-back: 1:00–2:00 AM happens twice",
    category: "dst",
    isoInput: "2023-11-05T01:30:00",
    timezone: "America/New_York",
    expectedNote:
      "1:30 AM occurred twice on this date — once at UTC-4 (05:30 UTC) and again at UTC-5 " +
      "(06:30 UTC). There is no single correct instant; a correct implementation is explicit " +
      "about which occurrence it means rather than silently picking one.",
    context: "US DST ended at 2:00 AM local time on 2023-11-05, when clocks fell back to 1:00 AM.",
  },
  {
    id: "dst-spring-forward-sydney",
    title: "Southern-hemisphere spring-forward (Sydney, October)",
    category: "dst",
    isoInput: "2023-10-01T02:30:00",
    timezone: "Australia/Sydney",
    expectedNote:
      "Sydney clocks jumped from 2:00 to 3:00 AM on 2023-10-01, so 2:30 AM never existed. A " +
      "correct implementation rejects it or shifts forward to 3:30 AM AEDT (2023-09-30 16:30 " +
      "UTC). DST logic that only ever tested northern-hemisphere March transitions misses this.",
    context:
      "Australian Eastern DST starts on the first Sunday of October; on 2023-10-01 clocks " +
      "advanced from AEST (UTC+10) to AEDT (UTC+11) at 2:00 AM.",
  },

  // ── Leap day ───────────────────────────────────────────────────────────
  {
    id: "leap-day-non-leap-year-rollover",
    title: "Feb 29 on a non-leap year silently rolls to March 1",
    category: "leap-day",
    isoInput: "2023-02-29T12:00:00Z",
    expectedNote:
      "2023 is not a leap year, so Feb 29 does not exist. JavaScript's Date silently rolls " +
      "the input forward to 2023-03-01 instead of rejecting it — a correct implementation " +
      "validates the day against the year rather than trusting the constructor's rollover.",
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
      "2024 is a leap year, so Feb 29 is a real, valid date and must round-trip to " +
      "2024-02-29T12:00:00Z. Code that special-cases or rejects Feb 29 entirely (rather than " +
      "validating per-year) incorrectly fails this paired counterpart.",
    context: "The valid partner to the non-leap-year case — both must be handled correctly.",
  },
  {
    id: "leap-day-century-1900-non-leap",
    title: "1900 was NOT a leap year (the century rule)",
    category: "leap-day",
    isoInput: "1900-02-29T12:00:00Z",
    expectedNote:
      "1900 is divisible by 100 but not 400, so it is not a leap year and Feb 29, 1900 never " +
      "existed. Simplistic 'divisible by 4' leap checks — and JavaScript's Date, which rolls " +
      "this to 1900-03-01 — get this wrong.",
    context:
      "The Gregorian century exception: 1700, 1800, and 1900 were common years; 1600 and " +
      "2000 were leap years. Spreadsheet epochs famously mishandle this.",
  },
  {
    id: "leap-day-century-2000-valid",
    title: "2000 WAS a leap year (the 400-year exception)",
    category: "leap-day",
    isoInput: "2000-02-29T12:00:00Z",
    expectedNote:
      "2000 is divisible by 400, so it is a leap year and Feb 29, 2000 is valid — it must " +
      "round-trip to 2000-02-29T12:00:00Z. Code that applies only the 'not divisible by 100' " +
      "exception wrongly rejects this date.",
    context:
      "The 400-year rule is why 2000 was a leap year while 1900 and 2100 are not — the reason " +
      "leap-year math needs all three divisibility checks, not one.",
  },

  // ── Leap second ────────────────────────────────────────────────────────
  {
    id: "leap-second-1972-06-30",
    title: "The first-ever leap second: 23:59:60 UTC",
    category: "leap-second",
    isoInput: "1972-06-30T23:59:60Z",
    expectedNote:
      "This is the first UTC leap second ever inserted. JavaScript's Date cannot represent " +
      "`:60` and returns Invalid Date — a correct implementation handles it explicitly or " +
      "fails loudly, rather than silently truncating to `:59` or rolling into the next minute.",
    context:
      "Leap seconds are inserted irregularly by the IERS to keep UTC within 0.9s of UT1; the " +
      "first was added at the end of 1972-06-30.",
  },
  {
    id: "leap-second-2015-06-30",
    title: "The 2015 mid-year leap second",
    category: "leap-second",
    isoInput: "2015-06-30T23:59:60Z",
    expectedNote:
      "A leap second was inserted at 2015-06-30 23:59:60 UTC. Systems that assumed every " +
      "minute has exactly 60 seconds mishandled it; a correct implementation must not silently " +
      "coerce the value away.",
    context:
      "The 2015-06-30 leap second caused outages at several large platforms (Reddit, " +
      "Netflix, and others) whose software assumed a fixed 86,400 seconds per day.",
  },
  {
    id: "leap-second-2016-12-31",
    title: "The most recent leap second (2016)",
    category: "leap-second",
    isoInput: "2016-12-31T23:59:60Z",
    expectedNote:
      "The most recent leap second to date was inserted at 2016-12-31 23:59:60 UTC. As with " +
      "the others, JavaScript's Date rejects `:60`; a correct implementation should account " +
      "for it rather than assume it can never appear in input.",
    context:
      "As of 2024 no leap second has been added since 2016-12-31; in 2022 the CGPM voted to " +
      "retire leap seconds by 2035, but historical timestamps still contain them.",
  },

  // ── Epoch boundary ─────────────────────────────────────────────────────
  {
    id: "epoch-2038-signed-32-bit-overflow",
    title: "The Year 2038 problem: signed 32-bit Unix time overflows",
    category: "epoch-boundary",
    isoInput: "2038-01-19T03:14:08Z",
    expectedNote:
      "The largest signed 32-bit Unix time is 2,147,483,647 = 2038-01-19T03:14:07Z; one " +
      "second later it overflows to -2,147,483,648, wrapping to 1901-12-13. JavaScript's " +
      "64-bit Date handles this instant fine, so it must round-trip — the danger is any layer " +
      "that serializes to an int32.",
    context:
      "JavaScript's Date uses a 64-bit float millisecond epoch and lacks this bug natively, " +
      "but code serializing to a 32-bit integer (some databases, C structs, binary formats) " +
      "does not.",
  },
  {
    id: "epoch-unix-zero",
    title: "The Unix epoch itself: 1970-01-01T00:00:00Z",
    category: "epoch-boundary",
    isoInput: "1970-01-01T00:00:00Z",
    expectedNote:
      "Epoch zero must round-trip to 1970-01-01T00:00:00Z. A falsy-zero bug — treating a " +
      "timestamp of 0 as 'missing' because `if (timestamp)` is false — makes the one genuinely " +
      "valid zero instant disappear.",
    context:
      "Unix time counts seconds since 1970-01-01T00:00:00Z; the value 0 is a real, valid " +
      "instant that `if (!ts)` guards routinely discard.",
  },
  {
    id: "epoch-negative-pre-1970",
    title: "Dates before 1970 are negative Unix time",
    category: "epoch-boundary",
    isoInput: "1969-12-31T23:59:59Z",
    expectedNote:
      "One second before the epoch is Unix time -1, and must round-trip to 1969-12-31T23:59:59Z. " +
      "Code that stores time in an unsigned integer, or clamps negatives to 0, misreads every " +
      "pre-1970 date (birthdays, historical records) as 1970 or later.",
    context:
      "time_t is signed precisely so instants before 1970 are representable as negative " +
      "values; unsigned storage silently corrupts them.",
  },

  // ── Parsing ────────────────────────────────────────────────────────────
  {
    id: "parsing-date-only-string-timezone-shift",
    title: '"2024-01-01" parses as UTC midnight, not local midnight',
    category: "parsing",
    isoInput: "2024-01-01",
    timezone: "America/New_York",
    expectedNote:
      "A bare date string is parsed as UTC midnight per ES2015, but read in America/New_York " +
      "the intended instant is local midnight — 2024-01-01T05:00:00Z. Using the UTC parse and " +
      "then formatting locally shows Dec 31, 2023: the classic off-by-one-day bug west of UTC.",
    context:
      "One of the most commonly filed 'off by one day' bugs against date libraries; the fix " +
      "is to parse date-only strings in the intended zone, not UTC.",
  },
  {
    id: "parsing-slash-mdy-ambiguous",
    title: '"01/02/2024" — is it Jan 2 or Feb 1?',
    category: "parsing",
    isoInput: "01/02/2024",
    expectedNote:
      "Slash-separated dates are locale-ambiguous: US reads MM/DD/YYYY (Jan 2), most of the " +
      "world reads DD/MM/YYYY (Feb 1). JavaScript's Date guesses US order. There is no single " +
      "correct instant without knowing the source locale, so a correct tool surfaces the " +
      "ambiguity rather than guessing silently.",
    context:
      "ISO 8601 exists precisely to end this ambiguity; slash dates remain the top source of " +
      "cross-locale off-by-a-month errors in imported data.",
  },
  {
    id: "parsing-space-separator-nonstandard",
    title: 'Space instead of "T": implementation-defined parsing',
    category: "parsing",
    isoInput: "2024-01-01 00:00:00",
    expectedNote:
      "Replacing the ISO 'T' with a space is not valid ES Date-Time-String-Format input, so " +
      "parsing falls back to implementation-specific heuristics — the same string can parse as " +
      "UTC in one engine and local in another, or fail entirely. Its instant is not reliably " +
      "defined.",
    context:
      "The ES spec only guarantees the exact ISO 8601 grammar; SQL-style 'YYYY-MM-DD HH:MM:SS' " +
      "strings parse differently across V8, JavaScriptCore, and older browsers.",
  },
  {
    id: "parsing-fractional-microseconds",
    title: "Sub-millisecond precision is silently truncated",
    category: "parsing",
    isoInput: "2024-01-01T00:00:00.123456Z",
    expectedNote:
      "JavaScript's Date has millisecond resolution, so microsecond input is truncated to " +
      "2024-01-01T00:00:00.123Z — the .456 microseconds are lost. Round-tripping a database " +
      "timestamp through Date therefore silently drops precision.",
    context:
      "PostgreSQL, many logging systems, and `performance.now()` expose microsecond or " +
      "nanosecond precision that JavaScript's millisecond Date cannot preserve.",
  },

  // ── ISO week ───────────────────────────────────────────────────────────
  {
    id: "iso-week-year-boundary",
    title: "Jan 1 can belong to the previous ISO week-year",
    category: "iso-week",
    isoInput: "2023-01-01T00:00:00Z",
    expectedNote:
      "2023-01-01 falls in ISO week 52 of 2022, not week 1 of 2023, because the ISO week-year " +
      "is defined by which year contains that week's Thursday. This instant is unambiguous, but " +
      "code that assumes isoWeekYear === calendarYear mislabels it.",
    context:
      "ISO 8601 weeks start Monday and week 1 is the week containing the year's first Thursday; " +
      "early-January days frequently belong to the prior week-year.",
  },
  {
    id: "iso-week-53-long-year",
    title: "A 53-week year (2020 has an ISO week 53)",
    category: "iso-week",
    isoInput: "2020-12-31T00:00:00Z",
    expectedNote:
      "2020-12-31 falls in ISO week 53 of 2020 — a week that only exists in 'long' years. " +
      "Code that hard-codes 52 weeks, or renders a year grid assuming 52 rows, drops or " +
      "misplaces this date.",
    context:
      "An ISO year has 53 weeks when it starts on a Thursday, or on a Wednesday in a leap year; " +
      "2020 (a leap year starting Wednesday) is one such year.",
  },
  {
    id: "iso-week-late-december-next-year",
    title: "Late December can belong to next year's ISO week 1",
    category: "iso-week",
    isoInput: "2019-12-30T00:00:00Z",
    expectedNote:
      "2019-12-30 falls in ISO week 1 of 2020, not week 52/53 of 2019, because its week's " +
      "Thursday (2020-01-02) lands in 2020. The mirror image of the Jan-1 case — the week-year " +
      "runs ahead of the calendar year at the end of December.",
    context:
      "ISO week 1 is the week with the year's first Thursday, so the last days of December " +
      "often carry the following year's week-numbering.",
  },
];
