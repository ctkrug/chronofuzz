import { describe, expect, it, beforeEach } from "vitest";
import {
  loadPyodideRuntime,
  resetPyodideRuntimeCache,
  type PyodideModule,
  type PyodideRuntime,
} from "../src/pyodide/loader";

function fakeModule(runtime: PyodideRuntime): PyodideModule {
  return { loadPyodide: () => Promise.resolve(runtime) };
}

describe("loadPyodideRuntime", () => {
  beforeEach(() => {
    resetPyodideRuntimeCache();
  });

  it("resolves with the runtime the injected module produces", async () => {
    const runtime: PyodideRuntime = {
      runPython: () => undefined,
      globals: { get: () => undefined },
    };

    const result = await loadPyodideRuntime(() => Promise.resolve(fakeModule(runtime)));

    expect(result).toBe(runtime);
  });

  it("imports the module at most once across repeated calls (lazy + cached)", async () => {
    const runtime: PyodideRuntime = {
      runPython: () => undefined,
      globals: { get: () => undefined },
    };
    let importCount = 0;
    const importModule = () => {
      importCount += 1;
      return Promise.resolve(fakeModule(runtime));
    };

    await loadPyodideRuntime(importModule);
    await loadPyodideRuntime(importModule);
    await loadPyodideRuntime(importModule);

    expect(importCount).toBe(1);
  });

  it("retries the import on the next call after a failed load, instead of caching the rejection forever", async () => {
    const runtime: PyodideRuntime = {
      runPython: () => undefined,
      globals: { get: () => undefined },
    };
    let attempt = 0;
    const importModule = () => {
      attempt += 1;
      return attempt === 1
        ? Promise.reject(new Error("network error"))
        : Promise.resolve(fakeModule(runtime));
    };

    await expect(loadPyodideRuntime(importModule)).rejects.toThrow("network error");
    // A transient failure (e.g. a CDN blip) must not permanently wedge Python
    // mode for the rest of the session — the next call should retry, not
    // replay the same cached rejection.
    const result = await loadPyodideRuntime(importModule);

    expect(result).toBe(runtime);
    expect(attempt).toBe(2);
  });

  it("reloads after resetPyodideRuntimeCache", async () => {
    const runtimeA: PyodideRuntime = {
      runPython: () => undefined,
      globals: { get: () => undefined },
    };
    const runtimeB: PyodideRuntime = {
      runPython: () => undefined,
      globals: { get: () => undefined },
    };

    const first = await loadPyodideRuntime(() => Promise.resolve(fakeModule(runtimeA)));
    resetPyodideRuntimeCache();
    const second = await loadPyodideRuntime(() => Promise.resolve(fakeModule(runtimeB)));

    expect(first).toBe(runtimeA);
    expect(second).toBe(runtimeB);
  });
});
