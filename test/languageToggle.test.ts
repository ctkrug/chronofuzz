import { describe, expect, it } from "vitest";
import { mountApp } from "../src/ui/app";

function mount(): HTMLElement {
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById("app");
  if (!root) throw new Error("test fixture missing #app");
  mountApp(root);
  return root;
}

describe("language toggle", () => {
  it("starts in JavaScript mode with the JS sample and label", () => {
    const root = mount();

    const jsButton = root.querySelector<HTMLButtonElement>('[data-lang="javascript"]');
    const pyButton = root.querySelector<HTMLButtonElement>('[data-lang="python"]');
    expect(jsButton?.classList.contains("is-active")).toBe(true);
    expect(jsButton?.getAttribute("aria-pressed")).toBe("true");
    expect(pyButton?.classList.contains("is-active")).toBe(false);
    expect(pyButton?.getAttribute("aria-pressed")).toBe("false");

    expect(root.querySelector("#source-label")?.innerHTML).toContain("JavaScript function");
  });

  it("switches the sample source and label when Python is selected", () => {
    const root = mount();

    root.querySelector<HTMLButtonElement>('[data-lang="python"]')?.click();

    const textarea = root.querySelector<HTMLTextAreaElement>("#source-input");
    expect(textarea?.value).toContain("def normalize");

    const pyButton = root.querySelector<HTMLButtonElement>('[data-lang="python"]');
    const jsButton = root.querySelector<HTMLButtonElement>('[data-lang="javascript"]');
    expect(pyButton?.classList.contains("is-active")).toBe(true);
    expect(pyButton?.getAttribute("aria-pressed")).toBe("true");
    expect(jsButton?.classList.contains("is-active")).toBe(false);
    expect(root.querySelector("#source-label")?.innerHTML).toContain("Python function");
  });

  it("preserves each language's edited source across switches", () => {
    const root = mount();
    const textarea = root.querySelector<HTMLTextAreaElement>("#source-input")!;

    textarea.value = "function normalize() { return 'edited-js'; }";
    textarea.dispatchEvent(new Event("input"));

    root.querySelector<HTMLButtonElement>('[data-lang="python"]')?.click();
    expect(textarea.value).toContain("def normalize");

    textarea.value = "def normalize(): return 'edited-py'";
    textarea.dispatchEvent(new Event("input"));

    root.querySelector<HTMLButtonElement>('[data-lang="javascript"]')?.click();
    expect(textarea.value).toBe("function normalize() { return 'edited-js'; }");

    root.querySelector<HTMLButtonElement>('[data-lang="python"]')?.click();
    expect(textarea.value).toBe("def normalize(): return 'edited-py'");
  });

  it("clicking the already-active language button is a no-op", () => {
    const root = mount();
    const textarea = root.querySelector<HTMLTextAreaElement>("#source-input")!;
    const before = textarea.value;

    root.querySelector<HTMLButtonElement>('[data-lang="javascript"]')?.click();

    expect(textarea.value).toBe(before);
  });

  it("resets a stuck run button and clears stale results when switching mid-run", () => {
    // A real run drives Web Workers, which aren't practical to exercise in
    // this DOM test environment — instead this simulates exactly the DOM
    // state runBattery leaves mid-flight, and asserts the language switch's
    // cancellation cleanup (story 2.2) restores it.
    const root = mount();
    const runButton = root.querySelector<HTMLButtonElement>("#run-button")!;
    const resultsList = root.querySelector<HTMLOListElement>("#results-list")!;
    const summary = root.querySelector<HTMLParagraphElement>("#results-summary")!;

    runButton.disabled = true;
    runButton.textContent = "Running…";
    resultsList.innerHTML = '<li class="result-item">stale from the previous run</li>';
    summary.textContent = "Running 20 landmines…";

    root.querySelector<HTMLButtonElement>('[data-lang="python"]')?.click();

    expect(runButton.disabled).toBe(false);
    expect(runButton.textContent).toBe("Run against the battery");
    expect(resultsList.querySelectorAll(".result-item").length).toBe(0);
    expect(summary.textContent).toContain("Hit run");
  });
});
