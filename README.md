# Chronofuzz

Paste a JavaScript or Python date-handling function. Chronofuzz runs it against a curated
battery of real date/time landmines — DST fallback, nonexistent spring-forward times, Feb 29,
the 2038 signed-32-bit rollover, leap seconds, ISO week-year boundaries — and shows you exactly
which line breaks and what wrong value it produced.

No test file to write, no timezone database to install, no toy examples. Paste, run, see the
red strike next to the broken line.

## Why

Date bugs are notoriously easy to miss in code review and notoriously expensive in production —
they're rare, timezone-dependent, and often invisible until a specific calendar date arrives.
Most engineers have never written a DST-fallback test, not because they don't know DST exists,
but because building the fixture (which offset, which zone, which exact instant) is its own
research project. Chronofuzz does that research once, packages it as a runnable corpus, and
lets you point your function at it in seconds.

## How it works

1. Paste a function `fn(isoInput, timeZone)` that takes an ISO date/time string and a target
   IANA timezone and returns a normalized instant — or throws / returns `Invalid Date` for input
   that denotes an impossible time. The pre-filled sample is the naive
   `new Date(iso).toISOString()` passthrough, so you can hit run immediately and watch it break.
2. Chronofuzz executes it once per landmine, in an isolated sandbox:
   - **JavaScript** runs in a fresh dedicated Web Worker per landmine (so a hang can be killed by
     terminating the worker) with no access to the DOM or the host page's state (network lockdown
     via CSP is tracked in the backlog).
   - **Python** via [Pyodide](https://pyodide.org) (CPython on WebAssembly), loaded lazily from a
     CDN, is planned — see the backlog.
3. Each landmine has an automated **evaluator** that grades your function's output as **pass**,
   **fail**, or **ambiguous** — a real machine-checkable verdict, not a raw output dump. Inputs
   with no single correct answer (a DST fall-back hour, a locale-ambiguous slash date) are marked
   ambiguous rather than silently coerced.
4. Failing rows draw a red strike over the landmine and show the wrong value your function
   returned inline, expanding to an actual-vs-expected diff, alongside the landmine's real-world
   context.

Everything runs client-side. No code you paste is ever sent to a server.

## Status

Early scaffold — see [`docs/VISION.md`](docs/VISION.md) for the full plan and
[`docs/BACKLOG.md`](docs/BACKLOG.md) for what's built vs. planned.

## Stack

- TypeScript, built with [Vite](https://vitejs.dev) as a static, self-contained site
- [Vitest](https://vitest.dev) for unit tests
- Web Workers for sandboxed JS execution; [Pyodide](https://pyodide.org) for sandboxed Python
- Zero backend — deployable as static files to any host or subpath

## Developing

```sh
npm install
npm run dev      # local dev server
npm test         # run the test suite
npm run build    # production build to dist/
```

## License

MIT — see [LICENSE](LICENSE).
