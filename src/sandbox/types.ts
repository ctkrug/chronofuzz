export interface JsRunRequest {
  id: string;
  /** Source of a single function expression or declaration to evaluate. */
  source: string;
  /** ISO 8601 date/time string passed as the function's sole argument. */
  isoInput: string;
}

export type JsRunResult =
  | { id: string; ok: true; value: string; durationMs: number }
  | { id: string; ok: false; error: string; durationMs: number };
