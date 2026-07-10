# Chronofuzz

**▶ Live demo — [apps.charliekrug.com/chronofuzz](https://apps.charliekrug.com/chronofuzz/)**

_See exactly where your date code breaks._

[![CI](https://github.com/ctkrug/chronofuzz/actions/workflows/ci.yml/badge.svg)](https://github.com/ctkrug/chronofuzz/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Paste a JavaScript or Python date-handling function. Chronofuzz runs it against a curated
battery of real date/time landmines (DST fallback, nonexistent spring-forward times, Feb 29,
the 2038 signed-32-bit rollover, leap seconds, ISO week-year boundaries) and shows you exactly
which one breaks and what wrong value it produced.

No test file to write, no timezone database to install, no toy examples. Paste, run, read the red
strike next to the broken line.

## Who it's for

Anyone shipping code that touches dates: scheduling and billing systems, calendar sync, log
timestamps, cron-adjacent logic. Most engineers have never written a DST-fallback test, not
because they don't know DST exists, but because building the fixture (which offset, which zone,
which exact instant) is its own research project. Chronofuzz does that research once, packages it
as a runnable corpus, and lets you point your function at it in seconds.

## What it catches

The corpus is 20 hand-researched landmines, at least three per category, each with a real-world
citation for why it matters:

| Category           | Example landmine                                                            |
| ------------------ | --------------------------------------------------------------------------- |
| **DST**            | 2:30 AM on a US spring-forward Sunday, a wall-clock time that never existed |
| **Leap day**       | Feb 29 1900 (not a leap year) vs. Feb 29 2000 (the 400-year exception)      |
| **Leap second**    | `1972-06-30T23:59:60Z`, the first leap second ever inserted                 |
| **Epoch boundary** | `2038-01-19T03:14:08Z`, one second past the signed 32-bit rollover          |
| **Parsing**        | `01/02/2024`: is it Jan 2 or Feb 1? (locale-ambiguous, no single answer)    |
| **ISO week**       | Jan 1 2023 belongs to ISO week 52 of **2022**                               |

## How it works

1. Pick JavaScript or Python, then paste a function that takes an ISO date/time string and a
   target IANA timezone and returns a normalized instant (or throws / returns `Invalid Date` for
   input that denotes an impossible time). JavaScript is a function expression called as
   `fn(isoInput, timeZone)`; Python is a `def normalize(iso, time_zone):`. Each language starts
   pre-filled with a naive passthrough sample, so you can hit run immediately and watch it break.
2. Chronofuzz executes your function once per landmine, in an isolated sandbox with no access to
   the DOM, the host page's state, or the network:
   - **JavaScript** runs in a fresh dedicated Web Worker per landmine, so a hang can be killed by
     terminating the worker without corrupting later runs. Outbound `fetch` / `XMLHttpRequest` /
     `WebSocket` are blocked at the worker level, backed by a scoped Content-Security-Policy.
   - **Python** runs via [Pyodide](https://pyodide.org) (CPython on WebAssembly) in one persistent
     worker reused across a run, loaded lazily from a CDN on first use. Sessions that only test
     JavaScript never pay the download.
3. Each landmine has an automated **evaluator** that grades your output as **pass**, **fail**, or
   **ambiguous**, a real machine-checkable verdict rather than a raw output dump. Inputs with no
   single correct answer (a DST fall-back hour, a locale-ambiguous slash date) are marked
   ambiguous rather than silently coerced.
4. Failing rows draw a red strike over the landmine and show the wrong value your function
   returned inline, expanding to an actual-vs-expected diff alongside the real-world context.

Everything runs client-side. No code you paste is ever sent to a server, and a shared permalink
keeps the paste in the URL hash, so a link stays fully local too.

## Example

Paste the naive JavaScript sample (pre-filled on load):

```js
function normalize(iso, timeZone) {
  // Naive: trusts new Date and ignores the target zone.
  const d = new Date(iso);
  return d.toISOString();
}
```

Hit run, and the DST spring-forward row comes back red:

```
FAIL  DST spring-forward: the clock skips 2:00–3:00 AM              dst
      Accepted a time that never existed
      returned  2023-03-12T02:30:00.000Z
      ▸ What it should have returned
```

The `1900-02-29` leap-day row goes red too (JavaScript's `Date` silently rolls it to March 1),
while `2000-02-29` and `2024-02-29` pass, because a correct implementation validates the day
against the year rather than trusting the constructor.

## Developing

```sh
npm install
npm run dev             # local dev server (app at /, landing page at /site/)
npm test                # run the test suite
npm run test:coverage   # run the suite with a coverage report and threshold gate
npm run build           # production build to dist/
```

The test suite is 154 tests across pure core logic, an `axe-core` accessibility audit of both the
app and the landing page, and end-to-end run/export/share flows driven through injected fakes.
Coverage is gated at 90% (lines/statements/branches) in `vitest.config.ts`; every pure core-logic
module sits at 100%.

See [`docs/VISION.md`](docs/VISION.md) for the product vision, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
for the module map, and [`docs/DESIGN.md`](docs/DESIGN.md) for the visual direction.

## License

MIT license. See [LICENSE](LICENSE).

---

More of Charlie's projects → [apps.charliekrug.com](https://apps.charliekrug.com)
</content>
</invoke>
