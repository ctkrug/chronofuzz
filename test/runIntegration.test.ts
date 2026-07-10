import { describe, expect, it, vi } from "vitest";
import { mountApp } from "../src/ui/app";
import { LANDMINES } from "../src/corpus";
import type { RunResult, SandboxRunner } from "../src/sandbox/types";

/** Resolves every probe immediately with the probe's own isoInput as the value. */
class InstantRunner implements SandboxRunner {
  calls = 0;
  async run(_source: string, isoInput: string): Promise<RunResult> {
    this.calls += 1;
    return { id: String(this.calls), ok: true, value: isoInput, durationMs: 0 };
  }
}

/** A runner whose calls stay pending until the test explicitly resolves them. */
class DeferredRunner implements SandboxRunner {
  private pending: Array<(result: RunResult) => void> = [];

  run(_source: string, _isoInput: string): Promise<RunResult> {
    return new Promise((resolve) => this.pending.push(resolve));
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  resolveNext(value: string): void {
    const resolve = this.pending.shift();
    if (!resolve) throw new Error("no pending call to resolve");
    resolve({ id: "x", ok: true, value, durationMs: 0 });
  }
}

function mount(runners: { javascript?: SandboxRunner; python?: SandboxRunner }): HTMLElement {
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById("app");
  if (!root) throw new Error("test fixture missing #app");
  mountApp(root, { runners });
  return root;
}

describe("running the battery end-to-end (fake runner, no real Worker)", () => {
  it("renders one result row per landmine and a final tally", async () => {
    const runner = new InstantRunner();
    const root = mount({ javascript: runner });

    root.querySelector<HTMLButtonElement>("#run-button")?.click();

    await vi.waitFor(() => {
      expect(root.querySelectorAll("#results-list .result-item").length).toBe(LANDMINES.length);
    });

    const runButton = root.querySelector<HTMLButtonElement>("#run-button");
    expect(runButton?.disabled).toBe(false);
    expect(runButton?.textContent).toBe("Run against the battery");
    expect(root.querySelector("#results-summary")?.textContent).toContain(
      `(${LANDMINES.length} total)`,
    );
  });

  it("ignores a second click on the run button while a run is in flight", async () => {
    const runner = new DeferredRunner();
    const root = mount({ javascript: runner });
    const runButton = root.querySelector<HTMLButtonElement>("#run-button")!;

    runButton.click();
    expect(runButton.disabled).toBe(true);
    // A disabled button does not dispatch click activation behavior, so this
    // rapid second click (double-click, key-mash) must be a no-op rather than
    // starting a second concurrent run.
    runButton.click();

    while (runner.pendingCount > 0) {
      runner.resolveNext("2000-01-01T00:00:00Z");
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    await vi.waitFor(() => {
      expect(root.querySelectorAll("#results-list .result-item").length).toBe(LANDMINES.length);
    });
    expect(runButton.disabled).toBe(false);
  });

  it("stops appending rows once a language switch makes the run stale", async () => {
    const pyRunner = new DeferredRunner();
    const root = mount({ python: pyRunner });

    root.querySelector<HTMLButtonElement>('[data-lang="python"]')?.click();
    root.querySelector<HTMLButtonElement>("#run-button")?.click();

    await vi.waitFor(() => expect(pyRunner.pendingCount).toBeGreaterThan(0));
    pyRunner.resolveNext("2000-01-01T00:00:00Z");
    await vi.waitFor(() => {
      expect(root.querySelectorAll("#results-list .result-item").length).toBeGreaterThan(0);
    });
    const rowsBeforeSwitch = root.querySelectorAll("#results-list .result-item").length;

    // Switching languages mid-run must cancel the stale run (story 2.2): even
    // though the old run's remaining probes still get resolved below, none of
    // them should reach the DOM once the switch has happened.
    root.querySelector<HTMLButtonElement>('[data-lang="javascript"]')?.click();
    expect(root.querySelectorAll("#results-list .result-item").length).toBe(0);

    while (pyRunner.pendingCount > 0) {
      pyRunner.resolveNext("2000-01-01T00:00:00Z");
    }
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(root.querySelectorAll("#results-list .result-item").length).toBe(0);
    expect(rowsBeforeSwitch).toBeGreaterThan(0);
  });
});
