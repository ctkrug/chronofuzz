export interface JsRunRequest {
  id: string;
  /** Source of a single function expression or declaration to evaluate. */
  source: string;
  /** ISO 8601 date/time string passed as the function's first argument. */
  isoInput: string;
  /** IANA timezone the input's wall-clock time should be read in, passed as
   * the function's second argument. A correct function honors it; a naive one
   * ignores it (which is exactly the bug several landmines probe for). */
  timeZone?: string;
}

export type JsRunResult =
  | { id: string; ok: true; value: string; durationMs: number }
  | { id: string; ok: false; error: string; durationMs: number };
