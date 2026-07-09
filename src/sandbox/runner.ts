import type { JsRunRequest, JsRunResult } from "./types";

const DEFAULT_TIMEOUT_MS = 2000;

export class JsSandboxTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Sandboxed function did not return within ${timeoutMs}ms.`);
    this.name = "JsSandboxTimeoutError";
  }
}

/**
 * Runs pasted JavaScript in a fresh Web Worker per call. A fresh worker (rather
 * than a reused one) means a hung/infinite-looping function can be discarded
 * by terminating its worker without corrupting shared state for later runs.
 */
export class JsSandboxRunner {
  constructor(private readonly timeoutMs = DEFAULT_TIMEOUT_MS) {}

  run(source: string, isoInput: string, timeZone?: string): Promise<JsRunResult> {
    const id = crypto.randomUUID();
    const worker = new Worker(new URL("./jsWorker.ts", import.meta.url), {
      type: "module",
    });

    return new Promise<JsRunResult>((resolve) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        resolve({
          id,
          ok: false,
          error: new JsSandboxTimeoutError(this.timeoutMs).message,
          durationMs: this.timeoutMs,
        });
      }, this.timeoutMs);

      worker.onmessage = (event: MessageEvent<JsRunResult>) => {
        clearTimeout(timeout);
        worker.terminate();
        resolve(event.data);
      };

      const request: JsRunRequest = { id, source, isoInput, timeZone };
      worker.postMessage(request);
    });
  }
}
