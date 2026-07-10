/** The wire request/result shapes both the JS and Python sandbox workers use. */
export interface RunRequest {
  id: string;
  /** Source of a single function (JS) or a `normalize`-defining script (Python) to evaluate. */
  source: string;
  /** ISO 8601 date/time string passed as the function's first argument. */
  isoInput: string;
  /** IANA timezone the input's wall-clock time should be read in, passed as
   * the function's second argument. A correct function honors it; a naive one
   * ignores it (which is exactly the bug several landmines probe for). */
  timeZone?: string;
}

export type RunResult =
  | { id: string; ok: true; value: string; durationMs: number }
  | { id: string; ok: false; error: string; durationMs: number };
