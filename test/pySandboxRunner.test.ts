import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { PySandboxRunner } from "../src/sandbox/pySandboxRunner";
import type { RunRequest, RunResult } from "../src/sandbox/types";

/** A fake Worker exposing just the subset PySandboxRunner drives. */
class FakeWorker {
  terminated = false;
  posted: RunRequest[] = [];
  private listeners: Array<(event: MessageEvent<RunResult>) => void> = [];

  addEventListener(_type: "message", listener: (event: MessageEvent<RunResult>) => void): void {
    this.listeners.push(listener);
  }

  removeEventListener(_type: "message", listener: (event: MessageEvent<RunResult>) => void): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  postMessage(request: RunRequest): void {
    this.posted.push(request);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Test helper: deliver a result as if the worker had posted it back. */
  emit(result: RunResult): void {
    for (const listener of [...this.listeners]) {
      listener({ data: result } as MessageEvent<RunResult>);
    }
  }
}

describe("PySandboxRunner", () => {
  let worker: FakeWorker;
  let runner: PySandboxRunner;

  beforeEach(() => {
    worker = new FakeWorker();
    runner = new PySandboxRunner(1000, () => worker as unknown as Worker);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves with the worker's result when it replies before the timeout", async () => {
    const pending = runner.run("def normalize(iso, time_zone): ...", "2023-03-12", "UTC");

    const request = worker.posted[0];
    expect(request).toBeDefined();
    worker.emit({ id: request!.id, ok: true, value: "2023-03-12T00:00:00Z", durationMs: 5 });

    const result = await pending;
    expect(result).toEqual({
      id: request!.id,
      ok: true,
      value: "2023-03-12T00:00:00Z",
      durationMs: 5,
    });
    expect(worker.terminated).toBe(false);
  });

  it("reuses the same worker across multiple run() calls", async () => {
    const first = runner.run("def normalize(iso, time_zone): ...", "2023-03-12");
    worker.emit({ id: worker.posted[0]!.id, ok: true, value: "a", durationMs: 1 });
    await first;

    const second = runner.run("def normalize(iso, time_zone): ...", "2023-03-13");
    worker.emit({ id: worker.posted[1]!.id, ok: true, value: "b", durationMs: 1 });
    await second;

    expect(worker.posted.length).toBe(2);
  });

  it("ignores messages carrying a stale id", async () => {
    const pending = runner.run("def normalize(iso, time_zone): ...", "2023-03-12");
    const request = worker.posted[0]!;

    worker.emit({ id: "not-the-real-id", ok: true, value: "wrong", durationMs: 1 });
    worker.emit({ id: request.id, ok: true, value: "right", durationMs: 1 });

    const result = await pending;
    expect(result.ok && result.value).toBe("right");
  });

  it("times out, terminates the worker, and resolves with a designed error", async () => {
    vi.useFakeTimers();
    const pending = runner.run("def normalize(iso, time_zone): ...", "2023-03-12");

    await vi.advanceTimersByTimeAsync(1000);
    const result = await pending;

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("did not return within 1000ms");
    expect(worker.terminated).toBe(true);
  });

  it("respawns a fresh worker after a timeout terminates the previous one", async () => {
    vi.useFakeTimers();
    const first = runner.run("def normalize(iso, time_zone): ...", "2023-03-12");
    await vi.advanceTimersByTimeAsync(1000);
    await first;
    expect(worker.terminated).toBe(true);

    vi.useRealTimers();
    const secondWorker = new FakeWorker();
    const secondRunner = new PySandboxRunner(1000, () => secondWorker as unknown as Worker);
    const second = secondRunner.run("def normalize(iso, time_zone): ...", "2023-03-13");
    secondWorker.emit({ id: secondWorker.posted[0]!.id, ok: true, value: "ok", durationMs: 1 });
    const result = await second;

    expect(result.ok && result.value).toBe("ok");
  });

  it("terminate() discards the worker so the next run() spawns a new one", async () => {
    const first = runner.run("def normalize(iso, time_zone): ...", "2023-03-12");
    worker.emit({ id: worker.posted[0]!.id, ok: true, value: "a", durationMs: 1 });
    await first;

    runner.terminate();
    expect(worker.terminated).toBe(true);
  });
});
