export interface PyodideRuntime {
  runPython(code: string): unknown;
  globals: { get(name: string): unknown };
}

export type PyodideModule = {
  loadPyodide: (config?: { indexURL?: string }) => Promise<PyodideRuntime>;
};

export type PyodideModuleImporter = () => Promise<PyodideModule>;

const PYODIDE_CDN_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.mjs";

const defaultImporter: PyodideModuleImporter = () => import(/* @vite-ignore */ PYODIDE_CDN_URL);

let pyodideLoadPromise: Promise<PyodideRuntime> | null = null;

/**
 * Lazily imports Pyodide's ESM build from a CDN on first use so sessions that
 * only test JavaScript never pay the multi-megabyte WASM download. Uses
 * dynamic `import()` of the ESM build (not a `<script>` tag) so the same
 * loader works from both the main thread and a module Worker, neither of
 * which the previous `document.createElement("script")` approach supported
 * inside a Worker. The importer is injectable so tests can supply a fake
 * module instead of hitting the real CDN.
 */
export function loadPyodideRuntime(
  importModule: PyodideModuleImporter = defaultImporter,
): Promise<PyodideRuntime> {
  if (!pyodideLoadPromise) {
    pyodideLoadPromise = importModule().then((module) => module.loadPyodide());
  }
  return pyodideLoadPromise;
}

/** Test-only: clears the cached load promise so a fresh importer can be injected. */
export function resetPyodideRuntimeCache(): void {
  pyodideLoadPromise = null;
}
