import { LANDMINES, CORPUS_VERSION } from "../corpus";
import type { Landmine } from "../corpus";
import type { Verdict, VerdictKind } from "../eval/types";
import { evaluateLandmine } from "../eval/engine";
import type { LandmineResult } from "../eval/engine";
import { JsSandboxRunner } from "../sandbox/runner";
import { PySandboxRunner } from "../sandbox/pySandboxRunner";
import { sandboxProbeRunner } from "../sandbox/probeRunner";
import type { SandboxRunner } from "../sandbox/types";
import { buildExport } from "../export/exportResults";

type Language = "javascript" | "python";

const JS_SAMPLE_SOURCE = `function normalize(iso, timeZone) {
  // Naive: trusts new Date and ignores the target zone.
  const d = new Date(iso);
  return d.toISOString();
}`;

const PY_SAMPLE_SOURCE = `def normalize(iso, time_zone):
    # Naive: trusts fromisoformat and ignores the target zone.
    from datetime import datetime
    return datetime.fromisoformat(iso).isoformat()`;

const LANGUAGE_META: Record<Language, { labelHtml: string; sample: string }> = {
  javascript: {
    labelHtml: "JavaScript function under test — <code>fn(isoInput, timeZone)</code>",
    sample: JS_SAMPLE_SOURCE,
  },
  python: {
    labelHtml: "Python function under test — <code>def normalize(iso, time_zone):</code>",
    sample: PY_SAMPLE_SOURCE,
  },
};

const VERDICT_LABEL: Record<VerdictKind, string> = {
  pass: "PASS",
  fail: "FAIL",
  ambiguous: "AMBIGUOUS",
};

export interface MountAppOptions {
  /** Overrides the sandbox runner for a language — tests inject a fake runner
   * that resolves without spawning a real Worker; the app itself never passes
   * this, so production always gets the real Js/PySandboxRunner. */
  runners?: Partial<Record<Language, SandboxRunner>>;
  /** Overrides how the Export button delivers a file — tests inject a spy
   * instead of driving a real Blob download through happy-dom. */
  downloadFile?: (filename: string, content: string) => void;
}

function defaultDownloadFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function mountApp(root: HTMLElement, options: MountAppOptions = {}): void {
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
    <div class="language-toggle" role="group" aria-label="Language">
      <button type="button" class="lang-button is-active" data-lang="javascript" aria-pressed="true">JavaScript</button>
      <button type="button" class="lang-button" data-lang="python" aria-pressed="false">Python</button>
    </div>
    <label id="source-label" for="source-input">${LANGUAGE_META.javascript.labelHtml}</label>
    <textarea id="source-input" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
    <button id="run-button" type="button">Run against the battery</button>
  `;

  const resultsPane = document.createElement("section");
  resultsPane.className = "pane results-pane";
  resultsPane.innerHTML = `
    <div class="results-header">
      <div class="results-title">
        <h2>Results</h2>
        <button id="export-button" type="button" class="export-button" disabled>
          Export JSON
        </button>
      </div>
      <p id="results-summary" class="results-summary" role="status" aria-live="polite">
        ${LANDMINES.length} landmines armed. Hit run.
      </p>
    </div>
    <ol id="results-list" class="results-list" aria-live="polite"></ol>
  `;

  workbench.append(editorPane, resultsPane);
  root.append(header, workbench);

  const langButtons = [...editorPane.querySelectorAll<HTMLButtonElement>(".lang-button")];
  const sourceLabel = editorPane.querySelector<HTMLLabelElement>("#source-label");
  const textarea = editorPane.querySelector<HTMLTextAreaElement>("#source-input");
  const runButton = editorPane.querySelector<HTMLButtonElement>("#run-button");
  const resultsList = resultsPane.querySelector<HTMLOListElement>("#results-list");
  const summary = resultsPane.querySelector<HTMLParagraphElement>("#results-summary");
  const exportButton = resultsPane.querySelector<HTMLButtonElement>("#export-button");
  if (
    !textarea ||
    !runButton ||
    !resultsList ||
    !summary ||
    !sourceLabel ||
    !exportButton ||
    langButtons.length === 0
  ) {
    throw new Error("Workbench failed to render its required controls.");
  }

  const downloadFile = options.downloadFile ?? defaultDownloadFile;
  let lastResults: LandmineResult[] | null = null;

  const sources: Record<Language, string> = {
    javascript: LANGUAGE_META.javascript.sample,
    python: LANGUAGE_META.python.sample,
  };
  let currentLanguage: Language = "javascript";
  textarea.value = sources[currentLanguage];

  const pyRunner = options.runners?.python ?? new PySandboxRunner();
  const runners: Record<Language, SandboxRunner> = {
    javascript: options.runners?.javascript ?? new JsSandboxRunner(),
    python: pyRunner,
  };

  // Bumped on every new run and on every language switch; runBattery checks
  // it after each await and stops touching the DOM the moment it goes stale,
  // so a stale in-flight run (e.g. a pending Pyodide call from before a
  // language switch) can never overwrite results from a newer one.
  let runGeneration = 0;

  const resetResultsPanel = (): void => {
    resultsList.innerHTML = "";
    summary.textContent = `${LANDMINES.length} landmines armed. Hit run.`;
    lastResults = null;
    exportButton.disabled = true;
  };

  textarea.addEventListener("input", () => {
    sources[currentLanguage] = textarea.value;
  });

  const setLanguage = (language: Language): void => {
    if (language === currentLanguage) return;
    runGeneration += 1;
    if (currentLanguage === "python") {
      pyRunner.terminate?.();
    }
    currentLanguage = language;
    textarea.value = sources[language];
    sourceLabel.innerHTML = LANGUAGE_META[language].labelHtml;
    for (const button of langButtons) {
      const isActive = button.dataset.lang === language;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }
    runButton.disabled = false;
    runButton.textContent = "Run against the battery";
    resetResultsPanel();
  };

  for (const button of langButtons) {
    button.addEventListener("click", () => {
      const language = button.dataset.lang;
      if (language === "javascript" || language === "python") {
        setLanguage(language);
      }
    });
  }

  runButton.addEventListener("click", () => {
    runGeneration += 1;
    const generation = runGeneration;
    exportButton.disabled = true;
    void runBattery(
      textarea.value,
      runButton,
      resultsList,
      summary,
      runners[currentLanguage],
      () => generation === runGeneration,
      (results) => {
        lastResults = results;
        exportButton.disabled = false;
      },
    );
  });

  exportButton.addEventListener("click", () => {
    if (!lastResults) return;
    const exported = buildExport(lastResults, CORPUS_VERSION, new Date().toISOString());
    downloadFile(`chronofuzz-results-${CORPUS_VERSION}.json`, JSON.stringify(exported, null, 2));
  });
}

async function runBattery(
  source: string,
  runButton: HTMLButtonElement,
  resultsList: HTMLOListElement,
  summary: HTMLParagraphElement,
  runner: SandboxRunner,
  isCurrentRun: () => boolean,
  onComplete: (results: LandmineResult[]) => void,
): Promise<void> {
  runButton.disabled = true;
  runButton.textContent = "Running…";
  resultsList.innerHTML = "";
  summary.textContent = `Running ${LANDMINES.length} landmines…`;

  const runProbe = sandboxProbeRunner(runner, source);
  const tally: Record<VerdictKind, number> = { pass: 0, fail: 0, ambiguous: 0 };
  const results: LandmineResult[] = [];

  for (const landmine of LANDMINES) {
    const verdict = await evaluateLandmine(landmine, runProbe);
    if (!isCurrentRun()) return;
    tally[verdict.kind] += 1;
    results.push({ landmine, verdict });
    resultsList.append(renderVerdictRow(landmine, verdict));
  }

  if (!isCurrentRun()) return;
  summary.textContent =
    `${tally.fail} broke · ${tally.ambiguous} ambiguous · ${tally.pass} handled ` +
    `(${LANDMINES.length} total)`;
  runButton.disabled = false;
  runButton.textContent = "Run against the battery";
  onComplete(results);
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
