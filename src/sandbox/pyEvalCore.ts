import type { PyodideRuntime } from "../pyodide/loader";

/**
 * The pure Python evaluation core shared by pyWorker (in the browser) and
 * this module's own tests (against a fake PyodideRuntime, so behavior is
 * exercised without downloading the real WASM runtime). Mirrors
 * sandbox/evalCore's role for the JS path.
 */
export type PyEvalResult = { ok: true; value: string } | { ok: false; error: string };

/** The name the pasted Python source must define its function under. */
export const PY_ENTRY_POINT = "normalize";

/** Renders a Python return value to the string shown inline in a result row. */
function toDisplayValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "None";
  }
  return String(value);
}

/**
 * Execs the pasted Python source, then calls its `normalize(iso, time_zone)`
 * function with the probe input. A thrown error — a syntax error, a missing
 * `normalize` definition, or a raised Python exception — becomes an errored
 * result rather than propagating, so callers get a designed outcome, never an
 * uncaught exception.
 */
export function evaluatePySource(
  pyodide: PyodideRuntime,
  source: string,
  isoInput: string,
  timeZone?: string,
): PyEvalResult {
  try {
    pyodide.runPython(source);
    const fn = pyodide.globals.get(PY_ENTRY_POINT);
    if (typeof fn !== "function") {
      throw new Error(`Pasted source did not define a \`${PY_ENTRY_POINT}\` function.`);
    }
    const callable = fn as (...args: unknown[]) => unknown;
    try {
      const result = callable(isoInput, timeZone ?? null);
      return { ok: true, value: toDisplayValue(result) };
    } finally {
      (fn as { destroy?: () => void }).destroy?.();
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
