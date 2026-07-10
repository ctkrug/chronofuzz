import { describe, expect, it } from "vitest";
import { evaluatePySource } from "../src/sandbox/pyEvalCore";
import type { PyodideRuntime } from "../src/pyodide/loader";

/**
 * A fake PyodideRuntime: `runPython` records the last exec'd source and lets
 * the test decide what `globals.get("normalize")` returns afterward, so these
 * tests exercise evaluatePySource's control flow without a real WASM runtime.
 */
function fakeRuntime(onRunPython: (source: string) => unknown): PyodideRuntime {
  let entry: unknown;
  return {
    runPython(source) {
      entry = onRunPython(source);
      return undefined;
    },
    globals: {
      get(name) {
        return name === "normalize" ? entry : undefined;
      },
    },
  };
}

describe("evaluatePySource", () => {
  it("execs the source, calls normalize(iso, time_zone), and returns its value", () => {
    const pyodide = fakeRuntime(() => (iso: string, tz: string | null) => `${iso}|${tz}`);

    const result = evaluatePySource(
      pyodide,
      "def normalize(iso, time_zone): ...",
      "2023-03-12",
      "UTC",
    );

    expect(result).toEqual({ ok: true, value: "2023-03-12|UTC" });
  });

  it("passes null when no timezone is provided", () => {
    const pyodide = fakeRuntime(() => (_iso: string, tz: string | null) => String(tz));

    const result = evaluatePySource(pyodide, "def normalize(iso, time_zone): ...", "2023-03-12");

    expect(result).toEqual({ ok: true, value: "null" });
  });

  it("renders a None return value as the string 'None'", () => {
    const pyodide = fakeRuntime(() => () => null);

    const result = evaluatePySource(
      pyodide,
      "def normalize(iso, time_zone): return None",
      "2023-03-12",
    );

    expect(result).toEqual({ ok: true, value: "None" });
  });

  it("errors when the source does not define a normalize function", () => {
    const pyodide = fakeRuntime(() => undefined);

    const result = evaluatePySource(pyodide, "x = 1", "2023-03-12");

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("did not define a `normalize` function");
  });

  it("catches a syntax/exec error raised by runPython", () => {
    const pyodide: PyodideRuntime = {
      runPython() {
        throw new Error("SyntaxError: invalid syntax");
      },
      globals: { get: () => undefined },
    };

    const result = evaluatePySource(pyodide, "def normalize(", "2023-03-12");

    expect(result).toEqual({ ok: false, error: "SyntaxError: invalid syntax" });
  });

  it("catches an exception raised inside normalize itself", () => {
    const pyodide = fakeRuntime(() => () => {
      throw new Error("ValueError: bad input");
    });

    const result = evaluatePySource(
      pyodide,
      "def normalize(iso, time_zone): raise ValueError(...)",
      "2023-03-12",
    );

    expect(result).toEqual({ ok: false, error: "ValueError: bad input" });
  });

  it("stringifies a non-Error throw (Pyodide can surface plain strings/objects)", () => {
    const pyodide: PyodideRuntime = {
      runPython() {
        throw "a raw string exception";
      },
      globals: { get: () => undefined },
    };

    const result = evaluatePySource(pyodide, "def normalize(", "2023-03-12");

    expect(result).toEqual({ ok: false, error: "a raw string exception" });
  });

  it("calls destroy() on the function proxy after invoking it, when present", () => {
    let destroyed = false;
    const fn = Object.assign((_iso: string) => "ok", { destroy: () => (destroyed = true) });
    const pyodide = fakeRuntime(() => fn);

    evaluatePySource(pyodide, "def normalize(iso, time_zone): ...", "2023-03-12");

    expect(destroyed).toBe(true);
  });
});
