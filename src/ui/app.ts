import { LANDMINES } from "../corpus";
import { JsSandboxRunner } from "../sandbox/runner";

const SAMPLE_SOURCE = `function normalize(iso) {
  const d = new Date(iso);
  return d.toISOString();
}`;

export function mountApp(root: HTMLElement): void {
  root.innerHTML = "";

  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <div class="wordmark">
      <span>Chr</span><span class="clock-o" aria-hidden="true"><span class="clock-hand"></span></span><span>nofuzz</span>
    </div>
    <p class="tagline">Paste a date function. Find out where it breaks.</p>
  `;

  const workbench = document.createElement("main");
  workbench.className = "workbench";

  const editorPane = document.createElement("section");
  editorPane.className = "pane editor-pane";
  editorPane.innerHTML = `
    <label for="source-input">JavaScript function under test</label>
    <textarea id="source-input" spellcheck="false"></textarea>
    <button id="run-button" type="button">Run against the battery</button>
  `;

  const resultsPane = document.createElement("section");
  resultsPane.className = "pane results-pane";
  resultsPane.innerHTML = `
    <h2>Results</h2>
    <p class="results-hint">Automatic pass/fail grading arrives with per-landmine evaluators
      (see docs/BACKLOG.md) — for now each row shows your function's actual output next to
      the documented correct behavior so you can compare by eye.</p>
    <ol id="results-list" class="results-list" aria-live="polite"></ol>
  `;

  workbench.append(editorPane, resultsPane);
  root.append(header, workbench);

  const textarea = editorPane.querySelector<HTMLTextAreaElement>("#source-input");
  const runButton = editorPane.querySelector<HTMLButtonElement>("#run-button");
  const resultsList = resultsPane.querySelector<HTMLOListElement>("#results-list");
  if (!textarea || !runButton || !resultsList) {
    throw new Error("Workbench failed to render its required controls.");
  }
  textarea.value = SAMPLE_SOURCE;

  const runner = new JsSandboxRunner();

  runButton.addEventListener("click", () => {
    void runBattery(textarea, runButton, resultsList, runner);
  });
}

async function runBattery(
  textarea: HTMLTextAreaElement,
  runButton: HTMLButtonElement,
  resultsList: HTMLOListElement,
  runner: JsSandboxRunner,
): Promise<void> {
  runButton.disabled = true;
  runButton.textContent = "Running…";
  resultsList.innerHTML = "";

  for (const landmine of LANDMINES) {
    const result = await runner.run(textarea.value, landmine.isoInput);
    const item = document.createElement("li");
    item.className = `result-item ${result.ok ? "result-ok" : "result-error"}`;
    const outcome = result.ok ? result.value : `Error: ${result.error}`;
    item.innerHTML = `
      <strong>${escapeHtml(landmine.title)}</strong>
      <div class="result-output">${escapeHtml(outcome)}</div>
      <div class="result-note">${escapeHtml(landmine.expectedNote)}</div>
    `;
    resultsList.append(item);
  }

  runButton.disabled = false;
  runButton.textContent = "Run against the battery";
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
