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

- [ ] **2.1 Wire Pyodide execution mirroring the JS sandbox.**
  - Pasting a Python function and running it executes via `loadPyodideRuntime()` and returns a
    real per-landmine value for each result row.
  - Pyodide is not fetched on initial page load in JS mode — confirmed via network inspection
    that no Pyodide request fires until the user switches to Python.

- [ ] **2.2 Add a language toggle to the UI.**
  - A toggle switches the editor's sample source and syntax hint between JS and Python.
  - Switching languages mid-run cancels any in-flight run cleanly — no orphaned worker or
    Pyodide call updates the UI after the switch.

- [ ] **2.3 Timeout and error handling parity between JS and Python paths.**
  - A pasted function that infinite-loops in Python is interrupted within a bounded time and
    reported as a timeout, not a hung UI.
  - Python exceptions (e.g. `ValueError`) are caught and displayed with the exception message,
    not swallowed.

## Epic 3 — Product polish and shareability

- [ ] **3.1 Shareable permalink for a paste and its results.**
  - Clicking "Share" produces a URL that, when opened fresh, restores the same pasted source
    and automatically re-runs the battery.
  - Pasting source beyond a defined size limit shows a clear inline error instead of silently
    truncating or producing a broken link.

- [ ] **3.2 Export results as JSON.**
  - An "Export" action downloads a file containing every landmine's id, verdict, actual value,
    and expected-behavior note.
  - The exported file is valid JSON and includes a corpus version/date field.

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

- [ ] **4.2 Corpus regression tests with reference implementations.**
  - A reference "correct" implementation and a reference "naive/buggy" implementation are
    checked into the test suite.
  - The evaluator suite verifies the buggy implementation fails and the correct implementation
    passes, for every landmine in the corpus.

- [ ] **4.3 Accessibility pass.**
  - All interactive elements are reachable and operable via keyboard alone (sane tab order, no
    keyboard traps).
  - An automated accessibility check (e.g. axe) run in CI, or a documented manual check, finds
    zero critical violations.
