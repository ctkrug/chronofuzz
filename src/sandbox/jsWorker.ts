/// <reference lib="webworker" />
import type { JsRunRequest, JsRunResult } from "./types";

declare const self: DedicatedWorkerGlobalScope;

function toDisplayValue(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
  }
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function evaluate(source: string, isoInput: string, timeZone?: string): unknown {
  const factory = new Function(`"use strict"; return (${source});`);
  const fn = factory();
  if (typeof fn !== "function") {
    throw new TypeError("Pasted source did not evaluate to a function.");
  }
  return fn(isoInput, timeZone);
}

self.onmessage = (event: MessageEvent<JsRunRequest>) => {
  const { id, source, isoInput, timeZone } = event.data;
  const start = performance.now();
  try {
    const value = evaluate(source, isoInput, timeZone);
    const result: JsRunResult = {
      id,
      ok: true,
      value: toDisplayValue(value),
      durationMs: performance.now() - start,
    };
    self.postMessage(result);
  } catch (error) {
    const result: JsRunResult = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: performance.now() - start,
    };
    self.postMessage(result);
  }
};
