export interface PyodideRuntime {
  runPython(code: string): unknown;
}

const PYODIDE_CDN_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";

declare global {
  interface Window {
    loadPyodide?: (config?: { indexURL?: string }) => Promise<PyodideRuntime>;
  }
}

let pyodideLoadPromise: Promise<PyodideRuntime> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Lazily loads Pyodide from a CDN on first use so the base app bundle stays
 * small — sessions that only test JavaScript never pay this cost. Python
 * execution wiring (mirroring JsSandboxRunner) lands in BUILD; this loader is
 * the foundation it will call into.
 */
export function loadPyodideRuntime(): Promise<PyodideRuntime> {
  if (!pyodideLoadPromise) {
    pyodideLoadPromise = loadScript(PYODIDE_CDN_URL).then(() => {
      if (!window.loadPyodide) {
        throw new Error("Pyodide script loaded but window.loadPyodide is unavailable.");
      }
      return window.loadPyodide();
    });
  }
  return pyodideLoadPromise;
}
