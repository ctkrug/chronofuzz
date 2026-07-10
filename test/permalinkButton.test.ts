import { describe, expect, it, vi } from "vitest";
import { mountApp } from "../src/ui/app";
import { decodeShareHash, MAX_SHARE_SOURCE_LENGTH } from "../src/share/permalink";
import type { RunResult, SandboxRunner } from "../src/sandbox/types";

class InstantRunner implements SandboxRunner {
  runCount = 0;
  async run(_source: string, isoInput: string): Promise<RunResult> {
    this.runCount += 1;
    return { id: "x", ok: true, value: isoInput, durationMs: 0 };
  }
}

function fakeLocationHash(initial = "") {
  let hash = initial;
  return {
    read: () => hash,
    write: vi.fn((next: string) => {
      hash = next;
    }),
    buildUrl: vi.fn((h: string) => `https://example.test/chronofuzz/${h}`),
  };
}

function mount(
  locationHash: ReturnType<typeof fakeLocationHash>,
  runners: { javascript?: SandboxRunner; python?: SandboxRunner } = {
    javascript: new InstantRunner(),
  },
): HTMLElement {
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById("app");
  if (!root) throw new Error("test fixture missing #app");
  mountApp(root, { runners, locationHash });
  return root;
}

describe("share button", () => {
  it("writes a permalink hash encoding the current source and language", () => {
    const locationHash = fakeLocationHash();
    const root = mount(locationHash);
    const textarea = root.querySelector<HTMLTextAreaElement>("#source-input")!;
    textarea.value = "function normalize(iso) { return iso; }";
    textarea.dispatchEvent(new Event("input"));

    root.querySelector<HTMLButtonElement>("#share-button")?.click();

    expect(locationHash.write).toHaveBeenCalledTimes(1);
    const hash = locationHash.write.mock.calls[0]![0] as string;
    expect(decodeShareHash(hash)).toEqual({ language: "javascript", source: textarea.value });
  });

  it("shows the resulting shareable URL in the status region", () => {
    const locationHash = fakeLocationHash();
    const root = mount(locationHash);

    root.querySelector<HTMLButtonElement>("#share-button")?.click();

    const status = root.querySelector<HTMLParagraphElement>("#share-status");
    expect(status?.textContent).toContain("https://example.test/chronofuzz/");
  });

  it("shows an inline error and never writes the hash when source exceeds the size limit", () => {
    const locationHash = fakeLocationHash();
    const root = mount(locationHash);
    const textarea = root.querySelector<HTMLTextAreaElement>("#source-input")!;
    textarea.value = "a".repeat(MAX_SHARE_SOURCE_LENGTH + 1);
    textarea.dispatchEvent(new Event("input"));

    root.querySelector<HTMLButtonElement>("#share-button")?.click();

    expect(locationHash.write).not.toHaveBeenCalled();
    const status = root.querySelector<HTMLParagraphElement>("#share-status");
    expect(status?.textContent).toMatch(/characters/);
    expect(status?.classList.contains("share-status-error")).toBe(true);
  });
});

describe("permalink restore on mount", () => {
  it("restores the pasted source and language and auto-runs the battery", async () => {
    const source = "function normalize(iso) { return iso; }";
    const hash = `#lang=javascript&src=${encodeURIComponent(source)}`;
    const runner = new InstantRunner();
    const root = mount(fakeLocationHash(hash), { javascript: runner });

    const textarea = root.querySelector<HTMLTextAreaElement>("#source-input");
    expect(textarea?.value).toBe(source);

    const summary = root.querySelector<HTMLParagraphElement>("#results-summary");
    await vi.waitFor(() => expect(summary?.textContent).toMatch(/broke|ambiguous|handled/));
    expect(runner.runCount).toBeGreaterThan(0);
  });

  it("restores Python and marks its toggle active", () => {
    const hash = `#lang=python&src=${encodeURIComponent("def normalize(iso, time_zone):\n    return iso")}`;
    const root = mount(fakeLocationHash(hash), { python: new InstantRunner() });

    const pythonButton = root.querySelector<HTMLButtonElement>('[data-lang="python"]');
    expect(pythonButton?.classList.contains("is-active")).toBe(true);
    expect(pythonButton?.getAttribute("aria-pressed")).toBe("true");
  });

  it("leaves the default sample in place when there is no share hash", () => {
    const root = mount(fakeLocationHash(""));
    const textarea = root.querySelector<HTMLTextAreaElement>("#source-input");
    expect(textarea?.value).toContain("Naive");
  });

  it("ignores a malformed hash instead of throwing", () => {
    expect(() => mount(fakeLocationHash("#not-a-share-link"))).not.toThrow();
  });
});
