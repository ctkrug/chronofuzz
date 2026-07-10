import type { RunRequest, RunResult } from "./types";

// Pyodide's first load fetches and instantiates several megabytes of WASM,
// which routinely takes longer than the JS sandbox's 2s budget — give it
// enough room that a slow network doesn't get misreported as a hung function.
const DEFAULT_TIMEOUT_MS = 20000;

export class PySandboxTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Sandboxed Python function did not return within ${timeoutMs}ms.`);
    this.name = "PySandboxTimeoutError";
  }
}

export type WorkerFactory = () => Worker;

const defaultWorkerFactory: WorkerFactory = () =>
  new Worker(new URL("./pyWorker.ts", import.meta.url), { type: "module" });

/**
 * Runs pasted Python in a single persistent Web Worker that lazily loads
 * Pyodide on its first message. Unlike JsSandboxRunner's fresh-worker-per-run
 * (cheap to respawn for plain JS), Pyodide's WASM load is expensive enough
 * that reusing one worker across a whole battery run matters — a hang still
 * gets a clean kill via terminate(), which also drops the loaded runtime, so
 * the next call respawns and reloads Pyodide.
 */
export class PySandboxRunner {
  private worker: Worker | null = null;
  private cancelPending: (() => void) | null = null;

  constructor(
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
    private readonly createWorker: WorkerFactory = defaultWorkerFactory,
  ) {}

  run(source: string, isoInput: string, timeZone?: string): Promise<RunResult> {
    const id = crypto.randomUUID();
    if (!this.worker) {
      this.worker = this.createWorker();
    }
    const worker = this.worker;

    return new Promise<RunResult>((resolve) => {
      let settled = false;
      const settle = (result: RunResult): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        worker.removeEventListener("message", onMessage);
        this.cancelPending = null;
        resolve(result);
      };

      const timeout = setTimeout(() => {
        settle({
          id,
          ok: false,
          error: new PySandboxTimeoutError(this.timeoutMs).message,
          durationMs: this.timeoutMs,
        });
        this.terminate();
      }, this.timeoutMs);

      const onMessage = (event: MessageEvent<RunResult>) => {
        if (event.data.id !== id) return;
        settle(event.data);
      };
      worker.addEventListener("message", onMessage);

      // Lets terminate() settle this call immediately (rather than leaving
      // it to hang until the timeout above fires on a worker that's already
      // gone) when the UI cancels a run in flight, e.g. switching languages
      // mid-battery.
      this.cancelPending = () =>
        settle({
          id,
          ok: false,
          error: "Sandboxed Python run was cancelled.",
          durationMs: 0,
        });

      const request: RunRequest = { id, source, isoInput, timeZone };
      worker.postMessage(request);
    });
  }

  /**
   * Terminates the underlying worker, if any, discarding any in-flight run
   * and the loaded Pyodide runtime with it. Called on timeout and when the UI
   * cancels a run (e.g. switching away from Python mid-battery) so no
   * orphaned worker keeps running after the user has moved on. Also
   * immediately settles any pending run() promise (rather than leaving it to
   * hang until its own timeout), honoring the SandboxRunner.terminate()
   * contract.
   */
  terminate(): void {
    this.cancelPending?.();
    this.worker?.terminate();
    this.worker = null;
  }
}
