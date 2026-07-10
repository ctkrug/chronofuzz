import { describe, expect, it, vi } from "vitest";
import { mountApp } from "../src/ui/app";
import { LANDMINES, landminesByCategory } from "../src/corpus";
import type { RunResult, SandboxRunner } from "../src/sandbox/types";

class InstantRunner implements SandboxRunner {
  async run(_source: string, isoInput: string): Promise<RunResult> {
    return { id: "x", ok: true, value: isoInput, durationMs: 0 };
  }
}

function mount(): HTMLElement {
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById("app");
  if (!root) throw new Error("test fixture missing #app");
  mountApp(root, { runners: { javascript: new InstantRunner() } });
  return root;
}

describe("results pane empty state (story 3.3)", () => {
  it("is visible before the first run and previews every category with its count", () => {
    const root = mount();

    const emptyState = root.querySelector<HTMLDivElement>("#empty-state");
    expect(emptyState?.hidden).toBe(false);

    const chips = [...root.querySelectorAll(".category-chip")];
    expect(chips).toHaveLength(landminesByCategory().size);

    const totalFromChips = chips.reduce((sum, chip) => {
      const count = Number(chip.querySelector(".category-chip-count")?.textContent);
      return sum + count;
    }, 0);
    expect(totalFromChips).toBe(LANDMINES.length);
  });

  it("hides once a run starts and stays hidden while results stream in", async () => {
    const root = mount();

    root.querySelector<HTMLButtonElement>("#run-button")?.click();

    const emptyState = root.querySelector<HTMLDivElement>("#empty-state")!;
    expect(emptyState.hidden).toBe(true);

    const exportButton = root.querySelector<HTMLButtonElement>("#export-button")!;
    await vi.waitFor(() => expect(exportButton.disabled).toBe(false));
    expect(emptyState.hidden).toBe(true);
  });

  it("reappears when the language is switched, clearing stale results", async () => {
    const root = mount();
    root.querySelector<HTMLButtonElement>("#run-button")?.click();
    const exportButton = root.querySelector<HTMLButtonElement>("#export-button")!;
    await vi.waitFor(() => expect(exportButton.disabled).toBe(false));

    root.querySelector<HTMLButtonElement>('[data-lang="python"]')?.click();

    const emptyState = root.querySelector<HTMLDivElement>("#empty-state");
    expect(emptyState?.hidden).toBe(false);
  });
});
