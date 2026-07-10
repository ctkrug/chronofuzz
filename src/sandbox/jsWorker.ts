/// <reference lib="webworker" />
import type { RunRequest, RunResult } from "./types";
import { evaluateSource } from "./evalCore";
import { lockdownNetworkGlobals } from "./networkLockdown";

declare const self: DedicatedWorkerGlobalScope;

lockdownNetworkGlobals(self as unknown as Record<string, unknown>);

self.onmessage = (event: MessageEvent<RunRequest>) => {
  const { id, source, isoInput, timeZone } = event.data;
  const start = performance.now();
  const outcome = evaluateSource(source, isoInput, timeZone);
  const durationMs = performance.now() - start;
  const result: RunResult = outcome.ok
    ? { id, ok: true, value: outcome.value, durationMs }
    : { id, ok: false, error: outcome.error, durationMs };
  self.postMessage(result);
};
