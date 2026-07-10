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
