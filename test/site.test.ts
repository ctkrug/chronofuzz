import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import axe from "axe-core";

const html = readFileSync(resolve(__dirname, "../site/index.html"), "utf8");
const appHtml = readFileSync(resolve(__dirname, "../index.html"), "utf8");

/**
 * Parses only the body into a detached document. Using DOMParser here would
 * make happy-dom eagerly try to fetch the linked stylesheets (they don't
 * resolve outside a real page load), which is both noisy and irrelevant —
 * the head-level asset references are checked directly against the raw HTML
 * string instead, further down.
 */
function bodyDoc(): Document {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? "";
  const doc = document.implementation.createHTMLDocument("");
  doc.body.innerHTML = body;
  return doc;
}

describe("landing page (story 3.4)", () => {
  it("states the wow moment above the fold with a mocked failing result row", () => {
    const doc = bodyDoc();
    const hero = doc.querySelector(".hero");
    expect(hero).not.toBeNull();
    const demo = hero?.querySelector(".result-item.result-fail");
    expect(demo).not.toBeNull();
    expect(demo?.querySelector(".verdict-badge")?.textContent).toBe("FAIL");
    expect(demo?.textContent).toContain("never existed");
  });

  it("its CTA links directly into the workbench", () => {
    const doc = bodyDoc();
    const ctas = [...doc.querySelectorAll<HTMLAnchorElement>("a.cta-button")];
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) {
      expect(cta.getAttribute("href")).toBe("../index.html");
    }
  });

  it("shares the app's tokens and fonts by importing the same stylesheet", () => {
    expect(html).toContain('href="../src/style.css"');
  });

  it("uses the same favicon as the app", () => {
    expect(html).toContain('href="/favicon.svg"');
    expect(appHtml).toContain('href="./favicon.svg"');
  });

  it("links to the project's real GitHub repo", () => {
    const doc = bodyDoc();
    const ghLink = doc.querySelector<HTMLAnchorElement>(".site-footer a");
    expect(ghLink?.getAttribute("href")).toBe("https://github.com/ctkrug/chronofuzz");
  });

  it("has zero axe violations", async () => {
    const doc = bodyDoc();
    const results = await axe.run(doc.body);
    expect(results.violations).toEqual([]);
  }, 30000);
});
