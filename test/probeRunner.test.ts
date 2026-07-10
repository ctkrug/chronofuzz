import { describe, expect, it } from "vitest";
import { sandboxProbeRunner } from "../src/sandbox/probeRunner";
import type { RunResult, SandboxRunner } from "../src/sandbox/types";

class RecordingRunner implements SandboxRunner {
  calls: Array<{ source: string; isoInput: string; timeZone?: string }> = [];
  constructor(private readonly result: RunResult) {}

  async run(source: string, isoInput: string, timeZone?: string): Promise<RunResult> {
    this.calls.push({ source, isoInput, timeZone });
    return this.result;
  }
}

describe("sandboxProbeRunner", () => {
  it("forwards the source and the probe's own input/zone to the runner", async () => {
    const runner = new RecordingRunner({ id: "x", ok: true, value: "v", durationMs: 1 });
    const runProbe = sandboxProbeRunner(runner, "the pasted source");

    await runProbe({ isoInput: "2024-01-01T00:00:00Z", timeZone: "America/Chicago" });

    expect(runner.calls).toEqual([
      {
        source: "the pasted source",
        isoInput: "2024-01-01T00:00:00Z",
        timeZone: "America/Chicago",
      },
    ]);
  });

  it("narrows a successful RunResult into an ok ProbeOutcome", async () => {
    const runner = new RecordingRunner({
      id: "x",
      ok: true,
      value: "2024-01-01T00:00:00.000Z",
      durationMs: 1,
    });
    const runProbe = sandboxProbeRunner(runner, "src");

    const outcome = await runProbe({ isoInput: "2024-01-01T00:00:00Z" });

    expect(outcome).toEqual({ ok: true, value: "2024-01-01T00:00:00.000Z" });
  });

  it("narrows a failed RunResult into an errored ProbeOutcome", async () => {
    const runner = new RecordingRunner({ id: "x", ok: false, error: "boom", durationMs: 1 });
    const runProbe = sandboxProbeRunner(runner, "src");

    const outcome = await runProbe({ isoInput: "2024-01-01T00:00:00Z" });

    expect(outcome).toEqual({ ok: false, error: "boom" });
  });
});
