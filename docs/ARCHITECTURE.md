# Chronofuzz — Architecture

A client-side-only TypeScript + Vite app. Paste a date-handling function, run it against a
curated battery of real date/time landmines, and get a per-landmine pass / fail / ambiguous
verdict with the wrong value shown inline. No backend — everything runs in the browser.

## Data flow

```
paste source ─▶ UI (ui/app.ts)
                  │  for each landmine:
                  ▼
            eval/engine.ts  evaluateLandmine(landmine, runProbe)
                  │            └─ getEvaluator(landmine)  (eval/evaluators.ts)
                  │                 └─ probes[] + grade()  (eval/strategies.ts)
                  ▼
            runProbe = jsProbeRunner (sandbox/probeRunner.ts)
                  │
                  ▼
            JsSandboxRunner (sandbox/runner.ts) ── fresh Web Worker per probe
                  │                                    (sandbox/jsWorker.ts)
                  ▼                                       └─ evaluateSource (sandbox/evalCore.ts)
            ProbeOutcome ─▶ grade() ─▶ Verdict ─▶ renderVerdictRow ─▶ result row
```

Each probe runs in a **fresh Web Worker** so an infinite loop or hang in pasted code can be
killed (`worker.terminate()` on timeout) without corrupting later runs. Probes run sequentially
to bound peak memory.

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

- `types.ts` — `JsRunRequest` (id, source, isoInput, optional `timeZone`), `JsRunResult`.
- `evalCore.ts` — worker-free `evaluateSource(source, isoInput, timeZone)` + `toDisplayValue`.
  Shared by the worker and the Node tests so run semantics are identical.
- `jsWorker.ts` — the Web Worker; owns message plumbing + timing, delegates to `evalCore`.
- `runner.ts` — `JsSandboxRunner`: spawns a fresh worker per `run()`, enforces a timeout.
- `probeRunner.ts` — `jsProbeRunner(runner, source)` adapts the runner to the engine's
  `ProbeRunner`.

### Pyodide — `src/pyodide/`

- `loader.ts` — `loadPyodideRuntime()` lazily loads Pyodide from a CDN on first use (Epic 2, not
  yet wired to execution).

### UI — `src/ui/app.ts`

- `mountApp(root)` builds the workbench (editor + results panes) and wires the run button.
- `runBattery` streams each landmine's verdict into the list and tallies the summary.
- `renderVerdictRow(landmine, verdict)` builds one row: badge, animated red strike on failures,
  the returned value inline, a collapsible actual-vs-expected diff for failures, and the note.
  All untrusted output is escaped.

Entry point `src/main.ts` mounts the app into `#app` (`index.html`). Styling and design tokens
live in `src/style.css` (see `docs/DESIGN.md`).

## Run / test / build

- `npm run dev` — Vite dev server.
- `npm test` — Vitest (happy-dom, pinned `TZ=UTC` for deterministic zone grading).
- `npm run typecheck` — `tsc` for app + worker projects.
- `npm run lint` / `npm run format:check` — ESLint + Prettier.
- `npm run build` — typecheck + `vite build` → `dist/` (static, base-path `./`, subpath-safe).
