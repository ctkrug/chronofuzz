# Chronofuzz — Design direction

## 1. Aesthetic direction

**Blueprint/technical.** Chronofuzz is an instrument for X-raying a function against precise
calendar failure points — the page should feel like a technical schematic or an oscilloscope
panel, not a marketing site. Deep navy blueprint background, fine cyan gridlines, monospace
headings, and a red strike mark that reads like an engineer's red pen on a printed diagram.

## 2. Tokens

| Token              | Value                                                                                                                      | Use                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `--bg`             | `#0a0f1a`                                                                                                                  | page background                                 |
| `--surface-1`      | `#0f1826`                                                                                                                  | panel background                                |
| `--surface-2`      | `#152034`                                                                                                                  | raised panel / card                             |
| `--text`           | `#e8edf5`                                                                                                                  | primary text                                    |
| `--text-muted`     | `#8896ab`                                                                                                                  | secondary text, labels                          |
| `--accent`         | `#38bdf8`                                                                                                                  | primary accent — grid lines, links, focus rings |
| `--accent-support` | `#f59e0b`                                                                                                                  | secondary accent — landmine markers, warnings   |
| `--success`        | `#34d399`                                                                                                                  | passing landmine                                |
| `--danger`         | `#ef4444`                                                                                                                  | failing landmine strike                         |
| type display       | `IBM Plex Mono`                                                                                                            | wordmark, headings — technical/precise          |
| type UI            | `IBM Plex Sans`                                                                                                            | body copy, editor labels, buttons               |
| spacing unit       | 8px scale (4, 8, 16, 24, 32, 48, 64)                                                                                       |                                                 |
| corner radius      | 6px (10px for large panels)                                                                                                | sharp, technical — not soft/toy                 |
| shadow/glow        | soft outer cyan glow (`0 0 0 1px rgba(56,189,248,.15), 0 8px 24px rgba(0,0,0,.4)`) on raised panels; no heavy drop shadows |                                                 |
| motion             | UI transitions 150ms ease-out; a landmine strike draws on with a 120ms stroke animation (like a pen mark), not a fade      |                                                 |

Both fonts load from Google Fonts with system-monospace/system-sans fallbacks.

## 3. Layout intent

**The hero is the workbench: the code editor and the landmine results panel, side by side.**

- **Desktop (1440×900):** a thin header bar (wordmark + language toggle) up top (~64px), then a
  two-column workbench filling the rest of the viewport — paste editor on the left (~45%),
  scrollable landmine result list on the right (~55%), each result row expandable to show the
  landmine's real-world context and the actual vs. expected value. Workbench occupies ~85% of
  vertical space; no empty margins around it.
- **Phone (390×844):** header collapses to wordmark + a compact run button; editor and results
  stack vertically, editor first, collapsed to ~40vh with results scrolling below it. Results
  list is the primary scroll surface.
- The "Run" action is a single, unmissable button anchored at the top of the workbench, not
  buried in a toolbar.

## 4. Signature detail

The wordmark's "o" in "Chrono" is a live clock face with a sweeping second hand (CSS animation,
pure SVG/CSS — no image asset). The page background carries a very faint cyan blueprint grid
(large-pitch, low-opacity) that gives the schematic read without competing with content.

## 5. Juice plan

Not applicable — Chronofuzz is a dev tool, not a game. Feedback still matters:

- Running the battery animates each result row in with a quick 120ms stroke — a red strike
  drawn across the broken line for failures, a green check-tick for passes — rather than a
  flat instant swap.
- The Run button gets a brief pulse (cyan glow, 150ms) on click, and a disabled/spinner state
  while the sandbox executes.
- No sound (this is a code tool used at a desk, often with headphones on already) — motion and
  color carry all the feedback.
