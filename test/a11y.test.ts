import { describe, expect, it, vi } from "vitest";
import axe from "axe-core";
import { mountApp } from "../src/ui/app";
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

/** Interactive controls a keyboard user must be able to reach and operate. */
function interactiveElements(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>("button, textarea, a[href], [role='button']")];
}

describe("accessibility: automated audit (story 4.3)", () => {
  it("the initial workbench has zero axe violations", async () => {
    const root = mount();
    const results = await axe.run(root);
    expect(results.violations).toEqual([]);
  }, 30000);

  it("the workbench after a completed run has zero axe violations", async () => {
    const root = mount();
    root.querySelector<HTMLButtonElement>("#run-button")?.click();
    const exportButton = root.querySelector<HTMLButtonElement>("#export-button")!;
    await vi.waitFor(() => expect(exportButton.disabled).toBe(false));

    const results = await axe.run(root);
    expect(results.violations).toEqual([]);
  }, 30000);

  it("the size-limit share error state has zero axe violations", async () => {
    const root = mount();
    const textarea = root.querySelector<HTMLTextAreaElement>("#source-input")!;
    textarea.value = "a".repeat(7000);
    textarea.dispatchEvent(new Event("input"));
    root.querySelector<HTMLButtonElement>("#share-button")?.click();

    const results = await axe.run(root);
    expect(results.violations).toEqual([]);
  }, 30000);
});

describe("accessibility: keyboard reachability (story 4.3)", () => {
  it("every interactive control is reachable via Tab (no tabindex traps)", () => {
    const root = mount();
    const controls = interactiveElements(root);
    expect(controls.length).toBeGreaterThan(0);
    for (const el of controls) {
      const tabindex = el.getAttribute("tabindex");
      expect(
        tabindex,
        `${el.tagName}#${el.id || el.className} should not opt out of tab order`,
      ).not.toBe("-1");
      expect(el.tabIndex).toBeGreaterThanOrEqual(0);
    }
  });

  it("no control uses a positive tabindex that would fight natural DOM order", () => {
    const root = mount();
    for (const el of interactiveElements(root)) {
      const tabindex = el.getAttribute("tabindex");
      if (tabindex !== null) {
        expect(Number(tabindex)).toBeLessThanOrEqual(0);
      }
    }
  });

  it("the language toggle buttons expose aria-pressed for assistive tech", () => {
    const root = mount();
    for (const button of root.querySelectorAll<HTMLButtonElement>(".lang-button")) {
      expect(["true", "false"]).toContain(button.getAttribute("aria-pressed"));
    }
  });

  it("live regions announce run progress and share status without stealing focus", () => {
    const root = mount();
    const summary = root.querySelector("#results-summary");
    const shareStatus = root.querySelector("#share-status");
    expect(summary?.getAttribute("aria-live")).toBe("polite");
    expect(shareStatus?.getAttribute("aria-live")).toBe("polite");
  });
});
