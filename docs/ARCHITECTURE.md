# Chronofuzz — Architecture

A client-side-only TypeScript + Vite app. Paste a date-handling function, run it against a
curated battery of real date/time landmines, and get a per-landmine pass / fail / ambiguous
verdict with the wrong value shown inline. No backend — everything runs in the browser.

## Data flow

```
paste source ─▶ UI (ui/app.ts)  ── language toggle picks the runner
                  │  for each landmine:
                  ▼
            eval/engine.ts  evaluateLandmine(landmine, runProbe)
                  │            └─ getEvaluator(landmine)  (eval/evaluators.ts)
                  │                 └─ probes[] + grade()  (eval/strategies.ts)
                  ▼
            runProbe = sandboxProbeRunner(runner, source)  (sandbox/probeRunner.ts)
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
  JsSandboxRunner      PySandboxRunner (sandbox/pySandboxRunner.ts)
  (sandbox/runner.ts)  ── one persistent Web Worker, reused across calls
  ── fresh Worker           (sandbox/pyWorker.ts)
     per probe                 └─ loadPyodideRuntime() (pyodide/loader.ts, lazy CDN import)
     (sandbox/jsWorker.ts)     └─ evaluatePySource (sandbox/pyEvalCore.ts)
        └─ evaluateSource
           (sandbox/evalCore.ts)
        └───────────┬───────┘
                     ▼
            RunResult ─▶ ProbeOutcome ─▶ grade() ─▶ Verdict ─▶ renderVerdictRow ─▶ result row
```

The JS path spins up a **fresh Web Worker per probe** — cheap, so an infinite loop or hang can be
killed (`worker.terminate()` on timeout) without corrupting later runs. The Python path instead
reuses **one persistent Worker across a whole run**, because Pyodide's WASM load is too expensive
to pay per-landmine; a hang still gets killed via `terminate()`, which also drops the loaded
runtime, so the next call respawns and reloads Pyodide. Probes run sequentially in both paths to
bound peak memory. Both runners implement the same `SandboxRunner` interface
(`run(source, isoInput, timeZone) → Promise<RunResult>`, `sandbox/types.ts`), so the grading
engine and `sandboxProbeRunner` never need to know which language they're driving.

## Modules

### Corpus — `src/corpus/`

- `types.ts` — `Landmine` (id, title, category, `isoInput`, optional `timezone`, `expectedNote`,
  `context`) and the six `LandmineCategory` values.
- `landmines.ts` — the curated battery (≥20 entries, ≥2 per category), pure data. Each cites a
  real-world fact in `context`.
- `index.ts` — `LANDMINES`, `getLandmineById`, `landminesByCategory`.

### Evaluation — `src/eval/`

- `types.ts` — `Verdict` (kind `pass`/`fail`/`ambiguous`, headline, detail, `actual?`,
  `expected?`), `Probe`, `ProbeOutcome`, `LandmineEvaluator`.
- `grading.ts` — pure helpers: `pass`/`fail`/`ambiguous` constructors, `sameInstant` (instant
  equality independent of format/zone), `utcFields`, `observed`, `isRejection`.
- `strategies.ts` — four grade-function factories: `expectInstant`, `expectRejection`,
  `expectShiftOrReject` (DST spring-forward), `alwaysAmbiguous`. Pure; unit-tested in isolation.
- `evaluators.ts` — `SPECS` maps each landmine id to its grading strategy + expected instant;
  `getEvaluator(landmine)` builds the probe (from the landmine's own input/zone) and grade fn.
  Throws if a landmine has no spec.
- `engine.ts` — `evaluateLandmine` / `evaluateBattery` run a landmine's probes through an
  injectable `ProbeRunner` and grade the outcomes. No Worker/DOM dependency.

### Sandbox — `src/sandbox/`

- `types.ts` — `RunRequest` (id, source, isoInput, optional `timeZone`), `RunResult`; the
  language-agnostic wire shape both workers use. `SandboxRunner` — the `run()` interface both
  `JsSandboxRunner` and `PySandboxRunner` implement.
- `evalCore.ts` — worker-free `evaluateSource(source, isoInput, timeZone)` + `toDisplayValue` for
  JS. Shared by `jsWorker` and the Node tests so run semantics are identical.
- `jsWorker.ts` — the JS Web Worker; owns message plumbing + timing, delegates to `evalCore`.
- `runner.ts` — `JsSandboxRunner`: spawns a fresh worker per `run()`, enforces a timeout.
- `pyEvalCore.ts` — worker-free `evaluatePySource(pyodide, source, isoInput, timeZone)`: execs
  the pasted source, looks up its `normalize` function, calls it, normalizes both a return value
  and a raised exception into a designed `PyEvalResult`. Tested against a fake `PyodideRuntime`
  so it doesn't need the real WASM runtime.
- `pyWorker.ts` — the Python Web Worker; lazily loads Pyodide on its first message (once per
  worker lifetime, not per landmine), then delegates to `pyEvalCore`.
- `pySandboxRunner.ts` — `PySandboxRunner`: reuses one worker across calls (see data-flow note
  above), `terminate()`s it on timeout or external cancellation, and respawns lazily on the next
  `run()`. Takes an injectable `WorkerFactory` for testability.
- `probeRunner.ts` — `sandboxProbeRunner(runner, source)` adapts either `SandboxRunner` to the
  engine's `ProbeRunner`.

### Export — `src/export/`

- `exportResults.ts` — `buildExport(results, corpusVersion, exportedAt)`: pure mapping from a
  completed run's `LandmineResult[]` to a JSON-serializable `ExportedRun` (id/verdict/actual/
  expected/note per landmine, plus the corpus version and export timestamp). Version and
  timestamp are parameters, not read internally, so the function stays deterministic to test.

### Pyodide — `src/pyodide/`

- `loader.ts` — `loadPyodideRuntime(importModule?)` lazily `import()`s Pyodide's ESM CDN build on
  first use and caches the result. Dynamic `import()` (not a `<script>` tag) so the same loader
  works from both the main thread and a module Worker — `pyWorker.ts` calls it directly. The
  importer is injectable so tests supply a fake module instead of hitting the CDN.

### UI — `src/ui/app.ts`

- `mountApp(root)` builds the workbench (language toggle + editor + results panes) and wires the
  toggle and run buttons. Each language keeps its own edit buffer so switching back and forth
  doesn't lose in-progress edits.
- A `runGeneration` counter is bumped on every new run and every language switch; `runBattery`
  checks it after each `await` and stops touching the DOM the moment it goes stale, so a run
  left in flight by a language switch can't overwrite results from a newer one. Switching away
  from Python also calls `PySandboxRunner.terminate()` so no worker keeps running in the
  background.
- `runBattery` streams each landmine's verdict into the list, tallies the summary, and — once the
  full battery completes for the current generation — hands the accumulated `LandmineResult[]` to
  an `onComplete` callback that enables the Export button.
- `renderVerdictRow(landmine, verdict)` builds one row: badge, animated red strike on failures,
  the returned value inline, a collapsible actual-vs-expected diff for failures, and the note.
  All untrusted output is escaped.
- The Export button is disabled until a run completes (and re-disabled on a new run or language
  switch); clicking it calls `buildExport` and hands the JSON to an injectable `downloadFile` — a
  real Blob/anchor download in production, a spy in tests.
- `mountApp(root, options)` accepts optional `runners` and `downloadFile` overrides so tests can
  drive a full run (and export) end-to-end with a fake `SandboxRunner` instead of a real Worker;
  production never passes these, so it always gets the real runners and a real download.

Entry point `src/main.ts` mounts the app into `#app` (`index.html`). Styling and design tokens
live in `src/style.css` (see `docs/DESIGN.md`).

## Run / test / build

- `npm run dev` — Vite dev server.
- `npm test` — Vitest (happy-dom, pinned `TZ=UTC` for deterministic zone grading).
- `npm run typecheck` — `tsc` for app + worker projects.
- `npm run lint` / `npm run format:check` — ESLint + Prettier.
- `npm run build` — typecheck + `vite build` → `dist/` (static, base-path `./`, subpath-safe).
