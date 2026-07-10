# Chronofuzz — Backlog

Epics are ordered for build sequencing. The first story of Epic 1 is the wow moment and must
land before anything else — see `docs/VISION.md`.

## Epic 1 — Core diagnosis loop

- [x] **1.1 (WOW) Automated per-landmine evaluators produce real verdicts for JS functions.**
      Today the workbench shows raw actual-vs-expected text for the user to eyeball; this story adds
      a machine-checkable evaluator per landmine so each row gets a real pass/fail/ambiguous verdict.
  - Running the battery against the pre-filled sample function shows at least one failing (red)
    row and one passing (green) row without any manual interpretation.
  - The DST spring-forward landmine renders a failing verdict with the function's actual
    (wrong) output value shown inline, when tested against a naive `new Date(iso)` passthrough.
  - Ambiguous landmines (DST fall-back) render a distinct "ambiguous" state — never silently
    coerced into pass or fail.

- [x] **1.2 Expand the corpus to at least 20 landmines across all six categories.**
  - `LANDMINES.length >= 20`.
  - Each of the six categories (`dst`, `leap-day`, `leap-second`, `epoch-boundary`, `parsing`,
    `iso-week`) has at least 2 entries.
  - Each entry's `context` field cites a verifiable real-world fact (a specific date or rule),
    confirmed correct in review.

- [x] **1.3 Inline diff view for failing rows.**
  - A failing result row expands to show the actual value and the expected value side by side.
  - Long values wrap instead of causing horizontal scroll at 390px viewport width.

## Epic 2 — Python support via Pyodide

- [x] **2.1 Wire Pyodide execution mirroring the JS sandbox.**
  - Pasting a Python function and running it executes via `loadPyodideRuntime()` and returns a
    real per-landmine value for each result row. `pyWorker.ts` loads Pyodide, execs the pasted
    source, and calls its `normalize(iso, time_zone)` via `pyEvalCore.evaluatePySource`; results
    render through the same `renderVerdictRow` as JS since the grading engine only ever sees the
    language-agnostic `ProbeOutcome` shape.
  - Pyodide is not fetched on initial page load in JS mode. `PySandboxRunner` only spawns its
    worker (and that worker only imports Pyodide) inside `run()`, which is called exclusively
    from a Run click while in Python mode — stricter than "not fetched until switching to
    Python": switching alone doesn't fetch it either.

- [x] **2.2 Add a language toggle to the UI.**
  - A toggle switches the editor's sample source and syntax hint between JS and Python, with
    each language keeping its own edit buffer across switches.
  - Switching languages mid-run cancels any in-flight run cleanly: a run-generation counter is
    bumped on every switch and checked by `runBattery` after each await, so a stale run stops
    touching the DOM; `PySandboxRunner.terminate()` is also called so no orphaned worker keeps
    running in the background.

- [x] **2.3 Timeout and error handling parity between JS and Python paths.**
  - A pasted function that infinite-loops in Python is interrupted within a bounded time and
    reported as a timeout, not a hung UI. `PySandboxRunner` mirrors `JsSandboxRunner`'s
    timeout-then-terminate mechanism (a longer 20s default budget, since Pyodide's WASM load is
    slower than spinning up a plain JS worker); `worker.terminate()` forcibly kills the worker
    thread from the main thread regardless of what synchronous Python code it's stuck running.
  - Python exceptions (e.g. `ValueError`) are caught by `evaluatePySource` and displayed with the
    exception message, not swallowed — verified against a fake `PyodideRuntime` in
    `pyEvalCore.test.ts`.

## Epic 3 — Product polish and shareability

- [x] **3.1 Shareable permalink for a paste and its results.**
  - Clicking "Share" produces a URL that, when opened fresh, restores the same pasted source
    and automatically re-runs the battery. `encodeShareHash`/`decodeShareHash`
    (`src/share/permalink.ts`) round-trip `{language, source}` through a `#lang=&src=` URL hash
    (client-side only, never sent to a server); `mountApp` decodes it on mount and calls the same
    `triggerRun` the Run button uses.
  - Pasting source beyond a defined size limit shows a clear inline error instead of silently
    truncating or producing a broken link. `MAX_SHARE_SOURCE_LENGTH` (6,000 chars) is enforced by
    `encodeShareHash`, which throws `ShareSourceTooLargeError`; the Share button catches it and
    renders the message in `#share-status` without writing the hash.

- [x] **3.2 Export results as JSON.**
  - An "Export" action downloads a file containing every landmine's id, verdict, actual value,
    and expected-behavior note. `buildExport` maps every completed `LandmineResult`; the button
    is enabled only once a run finishes (and re-disabled on a new run or language switch).
  - The exported file is valid JSON and includes a corpus version/date field — `CORPUS_VERSION`
    plus an `exportedAt` timestamp, both verified round-trippable through `JSON.parse`.

- [ ] **3.3 Design polish pass against docs/DESIGN.md.**
  - Page verified at 390/768/1440 widths per `docs/DESIGN.md`'s D3 self-review checklist, with
    no horizontal scroll or clipped content at any of the three.
  - Every interactive control (button, toggle, textarea) has themed hover, focus-visible,
    active, and disabled states — none left as unstyled native defaults.

- [ ] **3.4 Landing page (`site/`) sharing the same design system.**
  - The landing page states the wow moment above the fold and links directly into the
    workbench.
  - The landing page uses the same tokens, fonts, and favicon as the app — verified as one
    brand, not two.

## Epic 4 — Hardening and correctness

- [ ] **4.1 Network lockdown for the JS sandbox.**
  - The JS Worker is constrained (CSP and/or sandboxed-iframe boundary) so pasted code cannot
    call `fetch`/`XMLHttpRequest`/`WebSocket`.
  - A test asserts that a pasted function attempting `fetch(...)` is blocked/throws rather than
    succeeding.

- [x] **4.2 Corpus regression tests with reference implementations.**
  - A reference "correct" implementation and a reference "naive/buggy" implementation are
    checked into the test suite. `test/corpusRegression.test.ts` — the correct one resolves IANA
    zone offsets via `Intl.DateTimeFormat` with spring-forward gap detection; the buggy one
    embodies each category's documented anti-pattern (timezone-blindness, silent leap-second
    coercion, int32/unsigned/falsy-zero epoch truncation).
  - The evaluator suite verifies the buggy implementation fails and the correct implementation
    passes, for every landmine in the corpus. Precisely: the correct implementation never fails
    any of the 20 landmines; the buggy one fails exactly the 12 where its bug class applies, and
    is asserted not to regress the corpus's paired control/ambiguous cases.

- [ ] **4.3 Accessibility pass.**
  - All interactive elements are reachable and operable via keyboard alone (sane tab order, no
    keyboard traps).
  - An automated accessibility check (e.g. axe) run in CI, or a documented manual check, finds
    zero critical violations.
