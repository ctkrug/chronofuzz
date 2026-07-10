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

/**
 * The app itself is the deployed live URL, so its own page (index.html) has to
 * carry the link-preview metadata, the search-intent copy, and the portfolio
 * cross-link, not just the marketing landing page.
 */
describe("workbench page (index.html)", () => {
  function appBodyDoc(): Document {
    // Strip the module <script> before parsing: it's irrelevant to the markup
    // assertions here and makes happy-dom noisily try to resolve its src.
    const body = (appHtml.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? "").replace(
      /<script[\s\S]*?<\/script>/g,
      "",
    );
    const doc = document.implementation.createHTMLDocument("");
    doc.body.innerHTML = body;
    return doc;
  }

  it("carries Open Graph tags for link previews", () => {
    expect(appHtml).toContain('property="og:title"');
    expect(appHtml).toContain('property="og:description"');
  });

  it("answers the common date-testing questions below the fold", () => {
    const faqs = [...appBodyDoc().querySelectorAll(".faq .faq-item h3")];
    expect(faqs.length).toBeGreaterThanOrEqual(3);
    expect(faqs.some((h) => /DST|timezone/i.test(h.textContent ?? ""))).toBe(true);
  });

  it("footer links the source first, then the wider portfolio", () => {
    const links = [...appBodyDoc().querySelectorAll<HTMLAnchorElement>(".app-footer a")];
    expect(links[0]?.getAttribute("href")).toBe("https://github.com/ctkrug/chronofuzz");
    expect(links.some((a) => a.getAttribute("href") === "https://apps.charliekrug.com")).toBe(true);
  });
});
