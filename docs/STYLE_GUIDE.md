# Library style guide

Every page in this repo looks and behaves the same because it is built only from the shared `pages/css/` and `pages/js/` folders. A page is its HTML markup, nothing more. Pages live in `pages/` and are shown inside the portfolio-styled shell (`index.html`).

## Rules

1. **No inline CSS or JS in a page.** No `<style>`, no `style="..."`, no `<script>` with code, no inline `onclick`. A page links the three stylesheets and `pages/js/core.js`, and nothing else.
2. **New look = new component in `pages/css/components.css`.** Colors, fonts, radii and widths come from `pages/css/tokens.css`; never write a hex color outside that file.
3. **Page logic goes in `pages/js/pages/<page-name>.js`, page data in `pages/js/data/<page-name>.js`.** Shared helpers go in `pages/js/core.js`. `core.js` loads both files from `<body data-page="<page-name>">`; add `data-has-data` when the page has a data file.
4. **Same shell on every page:** `<header class="page-header">` (h1 with one `<span>` accent word, then `<p class="sub">`), `<div class="layout">` with an optional `<div class="navwrap">` sidebar and a `<main>`, then `<footer class="page-footer">`.
5. **Title format:** `<title>Page Name | Library</title>`.
6. **Dark is the default theme;** light follows the visitor's system setting. Test a new page in both.
7. **Must work at phone width** (layout collapses under 820px) with no horizontal page scroll.
8. **File names are lowercase-with-dashes** (`my-page.html`); the file name is the page's URL.
9. **Look follows the portfolio:** near-black olive surfaces, cream text, amber accent (`--accent`), Rajdhani headings, Inter body text, Share Tech Mono for labels; flat, square, outlined components (chips, pills) in muted earth tones, and a khaki `[// LIBRARY]` label above each title. These fonts are loaded once, from `tokens.css`. No other external fonts, scripts or trackers; links to other sites are fine.
10. **Every page has a `<meta name="description">`** (one sentence); the index entry is created from it.
11. **Code rules:** every JS function has a comment (what, why, params, returns); every file starts with a header comment naming its single purpose.

## New page checklist

1. Copy the smallest existing page (`pages/dns-mindmap.html`) and change the title, header and content.
2. Reuse existing components (`.card`, `.grid`, `.list`, `.chip`, `.notebox`, `.codeblock`, `data-c` colored sections).
3. If a component is missing, add it to `pages/css/components.css` first.
4. Add `pages/js/pages/<page-name>.js` (and `pages/js/data/<page-name>.js`) only if the page needs behaviour.
5. Commit. The pre-commit hook runs `ci/sync-index.py`, which appends the new page to `library.json` and regenerates the README page table. Never edit the README table by hand; edit `library.json` (tags, wording) instead.
6. Add a redirect stub for the new page to the `fmfalgun.github.io` repo if you want a short URL like `fmfalgun.github.io/<page-name>.html`.
