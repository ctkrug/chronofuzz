import { describe, expect, it, vi, afterEach } from "vitest";
import { JsSandboxRunner } from "../src/sandbox/runner";
import type { RunRequest, RunResult } from "../src/sandbox/types";

/** A fake Worker exposing just the subset JsSandboxRunner drives. */
class FakeWorker {
  terminated = false;
  posted: RunRequest[] = [];
  onmessage: ((event: MessageEvent<RunResult>) => void) | null = null;

  postMessage(request: RunRequest): void {
    this.posted.push(request);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Test helper: deliver a result as if the worker had posted it back. */
  emit(result: RunResult): void {
    this.onmessage?.({ data: result } as MessageEvent<RunResult>);
  }
}

describe("JsSandboxRunner", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves with the worker's result when it replies before the timeout", async () => {
    const worker = new FakeWorker();
    const runner = new JsSandboxRunner(1000, () => worker as unknown as Worker);

    const pending = runner.run("(iso) => iso", "2023-03-12");
    const request = worker.posted[0];
    expect(request).toBeDefined();
    worker.emit({ id: request!.id, ok: true, value: "2023-03-12", durationMs: 3 });

    const result = await pending;
    expect(result).toEqual({ id: request!.id, ok: true, value: "2023-03-12", durationMs: 3 });
    expect(worker.terminated).toBe(true);
  });

  it("spawns a fresh worker for every call", async () => {
    const workers: FakeWorker[] = [];
    const runner = new JsSandboxRunner(1000, () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker as unknown as Worker;
    });

    const first = runner.run("(iso) => iso", "2023-03-12");
    workers[0]!.emit({ id: workers[0]!.posted[0]!.id, ok: true, value: "a", durationMs: 1 });
    await first;

    const second = runner.run("(iso) => iso", "2023-03-13");
    workers[1]!.emit({ id: workers[1]!.posted[0]!.id, ok: true, value: "b", durationMs: 1 });
    await second;

    expect(workers.length).toBe(2);
    expect(workers[0]!.terminated).toBe(true);
    expect(workers[1]!.terminated).toBe(true);
  });

  it("times out, terminates the worker, and resolves with a designed error", async () => {
    vi.useFakeTimers();
    const worker = new FakeWorker();
    const runner = new JsSandboxRunner(1000, () => worker as unknown as Worker);

    const pending = runner.run("(iso) => iso", "2023-03-12");
    await vi.advanceTimersByTimeAsync(1000);
    const result = await pending;

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("did not return within 1000ms");
    expect(worker.terminated).toBe(true);
  });

  it("does not resolve twice when a message arrives after the timeout fires", async () => {
    vi.useFakeTimers();
    const worker = new FakeWorker();
    const runner = new JsSandboxRunner(1000, () => worker as unknown as Worker);

    const pending = runner.run("(iso) => iso", "2023-03-12");
    const request = worker.posted[0]!;
    await vi.advanceTimersByTimeAsync(1000);
    worker.emit({ id: request.id, ok: true, value: "too-late", durationMs: 1200 });

    const result = await pending;
    expect(result.ok).toBe(false);
  });
});
