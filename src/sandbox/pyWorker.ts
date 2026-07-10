/// <reference lib="webworker" />
import type { RunRequest, RunResult } from "./types";
import { loadPyodideRuntime } from "../pyodide/loader";
import { evaluatePySource } from "./pyEvalCore";

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async (event: MessageEvent<RunRequest>) => {
  const { id, source, isoInput, timeZone } = event.data;
  const start = performance.now();
  try {
    const pyodide = await loadPyodideRuntime();
    const outcome = evaluatePySource(pyodide, source, isoInput, timeZone);
    const durationMs = performance.now() - start;
    const result: RunResult = outcome.ok
      ? { id, ok: true, value: outcome.value, durationMs }
      : { id, ok: false, error: outcome.error, durationMs };
    self.postMessage(result);
  } catch (error) {
    const result: RunResult = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: performance.now() - start,
    };
    self.postMessage(result);
  }
};
