import { describe, expect, it } from "vitest";
import { mountApp } from "../src/ui/app";

describe("mountApp", () => {
  it("renders the wordmark, a prefilled editor, and a run button", () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.getElementById("app");
    if (!root) throw new Error("test fixture missing #app");

    mountApp(root);

    expect(root.querySelector(".wordmark")?.textContent).toContain("Chr");
    expect(root.querySelector(".wordmark")?.textContent).toContain("nofuzz");

    const textarea = root.querySelector<HTMLTextAreaElement>("#source-input");
    expect(textarea?.value).toContain("function normalize");

    const runButton = root.querySelector<HTMLButtonElement>("#run-button");
    expect(runButton?.textContent).toBe("Run against the battery");
    expect(runButton?.disabled).toBe(false);
  });

  it("starts with an empty results list until Run is clicked", () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.getElementById("app");
    if (!root) throw new Error("test fixture missing #app");

    mountApp(root);

    expect(root.querySelectorAll("#results-list .result-item").length).toBe(0);
  });
});
