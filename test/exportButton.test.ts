import { describe, expect, it, vi } from "vitest";
import { mountApp } from "../src/ui/app";
import { LANDMINES, CORPUS_VERSION } from "../src/corpus";
import type { RunResult, SandboxRunner } from "../src/sandbox/types";

class InstantRunner implements SandboxRunner {
  async run(_source: string, isoInput: string): Promise<RunResult> {
    return { id: "x", ok: true, value: isoInput, durationMs: 0 };
  }
}

function mount(downloadFile: (filename: string, content: string) => void): HTMLElement {
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById("app");
  if (!root) throw new Error("test fixture missing #app");
  mountApp(root, { runners: { javascript: new InstantRunner() }, downloadFile });
  return root;
}

describe("export button", () => {
  it("starts disabled with no results yet", () => {
    const root = mount(vi.fn());

    const exportButton = root.querySelector<HTMLButtonElement>("#export-button");
    expect(exportButton?.disabled).toBe(true);
  });

  it("enables after a run completes and downloads valid JSON covering every landmine", async () => {
    const downloadFile = vi.fn();
    const root = mount(downloadFile);

    root.querySelector<HTMLButtonElement>("#run-button")?.click();
    const exportButton = root.querySelector<HTMLButtonElement>("#export-button")!;
    await vi.waitFor(() => expect(exportButton.disabled).toBe(false));

    exportButton.click();

    expect(downloadFile).toHaveBeenCalledTimes(1);
    const [filename, content] = downloadFile.mock.calls[0]!;
    expect(filename).toContain(CORPUS_VERSION);
    expect(filename).toMatch(/\.json$/);

    const parsed = JSON.parse(content);
    expect(parsed.corpusVersion).toBe(CORPUS_VERSION);
    expect(typeof parsed.exportedAt).toBe("string");
    expect(parsed.results).toHaveLength(LANDMINES.length);
    for (const result of parsed.results) {
      expect(["pass", "fail", "ambiguous"]).toContain(result.verdict);
      expect(typeof result.id).toBe("string");
      expect(typeof result.note).toBe("string");
    }
  });

  it("re-disables when a new run starts", async () => {
    const root = mount(vi.fn());

    root.querySelector<HTMLButtonElement>("#run-button")?.click();
    const exportButton = root.querySelector<HTMLButtonElement>("#export-button")!;
    await vi.waitFor(() => expect(exportButton.disabled).toBe(false));

    root.querySelector<HTMLButtonElement>("#run-button")?.click();
    expect(exportButton.disabled).toBe(true);
  });

  it("re-disables when the language is switched", async () => {
    const root = mount(vi.fn());

    root.querySelector<HTMLButtonElement>("#run-button")?.click();
    const exportButton = root.querySelector<HTMLButtonElement>("#export-button")!;
    await vi.waitFor(() => expect(exportButton.disabled).toBe(false));

    root.querySelector<HTMLButtonElement>('[data-lang="python"]')?.click();
    expect(exportButton.disabled).toBe(true);
  });

  it("clicking while disabled never triggers a download", () => {
    const downloadFile = vi.fn();
    const root = mount(downloadFile);

    root.querySelector<HTMLButtonElement>("#export-button")?.click();

    expect(downloadFile).not.toHaveBeenCalled();
  });
});
