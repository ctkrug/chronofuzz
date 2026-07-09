/// <reference lib="webworker" />
import type { JsRunRequest, JsRunResult } from "./types";
import { evaluateSource } from "./evalCore";

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<JsRunRequest>) => {
  const { id, source, isoInput, timeZone } = event.data;
  const start = performance.now();
  const outcome = evaluateSource(source, isoInput, timeZone);
  const durationMs = performance.now() - start;
  const result: JsRunResult = outcome.ok
    ? { id, ok: true, value: outcome.value, durationMs }
    : { id, ok: false, error: outcome.error, durationMs };
  self.postMessage(result);
};
