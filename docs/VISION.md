# Chronofuzz — Vision

## The problem

Date and time handling bugs are among the cheapest to prevent and most expensive to discover in
production. They share three properties that make them slip through normal review and testing:

1. **They're rare in wall-clock time.** A DST-fallback bug only reproduces on the one Sunday a
   year clocks change; a leap-day bug only reproduces once every four years; the 2038 rollover
   reproduces exactly once, ever. Code review happens on an ordinary Tuesday, so the bug is
   invisible at review time.
2. **They require domain research to even construct a test case.** Writing
   `expect(fn("2023-03-12T02:30:00")).toThrow()` requires already knowing that 2:30 AM didn't
   exist that day in that zone. Most engineers reach for `moment()`/`Date` intuitively and never
   learn the specific landmine dates.
3. **They're timezone- and locale-dependent**, so a bug that reproduces reliably in CI (running
   in UTC) can be invisible until a user in `America/Los_Angeles` hits it.

The result: almost nobody writes a DST test, not out of negligence, but because building the
fixture is its own research project.

## Who it's for

Any engineer writing code that touches dates — scheduling systems, billing/invoicing, calendar
integrations, log timestamping, cron-adjacent logic — who wants a fast, zero-setup sanity check
before it ships. The audience is deliberately broad: this isn't a specialist tool for people who
already know to test DST edge cases; it's for the much larger group who wouldn't have thought to.

## The core idea

Chronofuzz inverts the usual test-writing burden. Instead of asking the engineer to write test
cases, it ships a pre-built, research-backed battery of real date/time failure modes and runs
the engineer's function against all of them in one click. No test file, no timezone database
lookup, no remembering which years are leap years — paste, run, see exactly which landmine broke
and what wrong value came out.

## The wow moment

Hit Run and get an immediate, specific diagnosis: a red strike next to the DST fallback case
with "your function returned 2023-11-05T01:30:00, but this instant is ambiguous" shown inline —
not a generic pass/fail, but the actual wrong value next to the real-world reason it's wrong.
This has to work in the very first release; everything else (Python support, richer corpus,
sharing/export) is secondary to landing this moment reliably.

## Key design decisions

- **Client-side only, zero backend.** Nobody should have to trust a server with code they paste.
  Everything — JS execution, Python execution via Pyodide, corpus data — runs in the browser.
  This also makes the product trivially cheap to host (static files, any CDN).
- **A fresh Web Worker per JS run.** An infinite loop or hang in pasted code should be
  killable (terminate the worker) without corrupting the state of later runs or freezing the UI
  thread.
- **Pyodide loaded lazily from a CDN**, not bundled. Most sessions only test JavaScript; paying
  Pyodide's multi-megabyte download cost only when Python mode is actually used keeps the base
  app fast.
- **Curated over generated.** The corpus is hand-researched, real, and cited in its own
  commentary (why the date matters), not machine-generated boilerplate edge cases. Depth and
  accuracy of the corpus _is_ the product's credibility.
- **Grading is per-landmine, not one-size-fits-all.** Some landmines have one unambiguous correct
  answer (leap day validity); others are inherently ambiguous (DST fall-back) and the "correct"
  behavior is being explicit about the ambiguity rather than picking silently. The grading
  mechanism has to represent both, not force everything into equals-this-exact-value.

## What "v1 done" looks like

- The full landmine corpus (see `docs/BACKLOG.md` for the target count and category spread) is
  runnable end-to-end for both JavaScript and Python functions.
- Every landmine has an automated evaluator, not just a human-readable note — running the
  battery produces a real pass/fail/ambiguous verdict per row, not just raw output for the user
  to eyeball.
- The wow moment (a failing DST case flagged with the actual wrong value) is reachable within
  seconds of landing on the page, with the sample function pre-filled.
- The page is deployable as a static site to `apps.charliekrug.com/chronofuzz` with no server.
- Design matches `docs/DESIGN.md`'s blueprint/technical direction end-to-end, including the
  landing page.
