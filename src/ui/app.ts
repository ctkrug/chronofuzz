import { LANDMINES } from "../corpus";
import type { Landmine } from "../corpus";
import type { Verdict, VerdictKind } from "../eval/types";
import { evaluateLandmine } from "../eval/engine";
import { JsSandboxRunner } from "../sandbox/runner";
import { sandboxProbeRunner } from "../sandbox/probeRunner";

const SAMPLE_SOURCE = `function normalize(iso, timeZone) {
  // Naive: trusts new Date and ignores the target zone.
  const d = new Date(iso);
  return d.toISOString();
}`;

const VERDICT_LABEL: Record<VerdictKind, string> = {
  pass: "PASS",
  fail: "FAIL",
  ambiguous: "AMBIGUOUS",
};

export function mountApp(root: HTMLElement): void {
  root.innerHTML = "";

  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <div class="wordmark">
      <span>Chr</span><span class="clock-o" aria-hidden="true"><span class="clock-hand"></span></span><span>nofuzz</span>
    </div>
    <p class="tagline">Paste a date function. Find out exactly where it breaks.</p>
  `;

  const workbench = document.createElement("main");
  workbench.className = "workbench";

  const editorPane = document.createElement("section");
  editorPane.className = "pane editor-pane";
  editorPane.innerHTML = `
    <label for="source-input">JavaScript function under test — <code>fn(isoInput, timeZone)</code></label>
    <textarea id="source-input" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
    <button id="run-button" type="button">Run against the battery</button>
  `;

  const resultsPane = document.createElement("section");
  resultsPane.className = "pane results-pane";
  resultsPane.innerHTML = `
    <div class="results-header">
      <h2>Results</h2>
      <p id="results-summary" class="results-summary" role="status" aria-live="polite">
        ${LANDMINES.length} landmines armed. Hit run.
      </p>
    </div>
    <ol id="results-list" class="results-list" aria-live="polite"></ol>
  `;

  workbench.append(editorPane, resultsPane);
  root.append(header, workbench);

  const textarea = editorPane.querySelector<HTMLTextAreaElement>("#source-input");
  const runButton = editorPane.querySelector<HTMLButtonElement>("#run-button");
  const resultsList = resultsPane.querySelector<HTMLOListElement>("#results-list");
  const summary = resultsPane.querySelector<HTMLParagraphElement>("#results-summary");
  if (!textarea || !runButton || !resultsList || !summary) {
    throw new Error("Workbench failed to render its required controls.");
  }
  textarea.value = SAMPLE_SOURCE;

  const runner = new JsSandboxRunner();

  runButton.addEventListener("click", () => {
    void runBattery(textarea.value, runButton, resultsList, summary, runner);
  });
}

async function runBattery(
  source: string,
  runButton: HTMLButtonElement,
  resultsList: HTMLOListElement,
  summary: HTMLParagraphElement,
  runner: JsSandboxRunner,
): Promise<void> {
  runButton.disabled = true;
  runButton.textContent = "Running…";
  resultsList.innerHTML = "";
  summary.textContent = `Running ${LANDMINES.length} landmines…`;

  const runProbe = sandboxProbeRunner(runner, source);
  const tally: Record<VerdictKind, number> = { pass: 0, fail: 0, ambiguous: 0 };

  for (const landmine of LANDMINES) {
    const verdict = await evaluateLandmine(landmine, runProbe);
    tally[verdict.kind] += 1;
    resultsList.append(renderVerdictRow(landmine, verdict));
  }

  summary.textContent =
    `${tally.fail} broke · ${tally.ambiguous} ambiguous · ${tally.pass} handled ` +
    `(${LANDMINES.length} total)`;
  runButton.disabled = false;
  runButton.textContent = "Run against the battery";
}

/**
 * Builds one result row. A failing row draws a red strike over the landmine
 * title and shows the wrong value inline, expanding to an actual-vs-expected
 * diff — the product's core moment. Ambiguous rows surface the chosen value
 * without a pass/fail claim.
 */
export function renderVerdictRow(landmine: Landmine, verdict: Verdict): HTMLLIElement {
  const item = document.createElement("li");
  item.className = `result-item result-${verdict.kind}`;
  item.dataset.kind = verdict.kind;

  const head = document.createElement("div");
  head.className = "result-head";
  head.innerHTML = `
    <span class="verdict-badge">${VERDICT_LABEL[verdict.kind]}</span>
    <span class="result-title">${escapeHtml(landmine.title)}<span class="strike" aria-hidden="true"></span></span>
    <span class="result-category">${escapeHtml(landmine.category)}</span>
  `;

  const headline = document.createElement("p");
  headline.className = "verdict-headline";
  headline.textContent = verdict.headline;

  item.append(head, headline);

  if (verdict.actual !== undefined) {
    const actual = document.createElement("div");
    actual.className = "result-actual";
    actual.innerHTML = `<span class="io-label">returned</span><code>${escapeHtml(verdict.actual)}</code>`;
    item.append(actual);
  }

  if (verdict.kind === "fail" && verdict.expected !== undefined) {
    const diff = document.createElement("details");
    diff.className = "result-diff";
    diff.innerHTML = `
      <summary>What it should have returned</summary>
      <div class="diff-grid">
        <div class="diff-cell diff-actual">
          <span class="io-label">actual</span><code>${escapeHtml(verdict.actual ?? "—")}</code>
        </div>
        <div class="diff-cell diff-expected">
          <span class="io-label">expected</span><code>${escapeHtml(verdict.expected)}</code>
        </div>
      </div>
    `;
    item.append(diff);
  }

  const note = document.createElement("p");
  note.className = "result-note";
  note.textContent = verdict.detail;
  item.append(note);

  return item;
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
