# Library style guide

Every page in this repo looks and behaves the same because it is built only from the shared `css/` and `js/` folders. A page is its HTML markup, nothing more.

## Rules

1. **No inline CSS or JS in a page.** No `<style>`, no `style="..."`, no `<script>` with code, no inline `onclick`. A page links the three stylesheets and `js/core.js`, and nothing else.
2. **New look = new component in `css/components.css`.** Colors, fonts, radii and widths come from `css/tokens.css`; never write a hex color outside that file.
3. **Page logic goes in `js/pages/<page-name>.js`, page data in `js/data/<page-name>.js`.** Shared helpers go in `js/core.js`. `core.js` loads both files from `<body data-page="<page-name>">`; add `data-has-data` when the page has a data file.
4. **Same shell on every page:** `<header class="page-header">` (h1 with one `<span>` accent word, then `<p class="sub">`), `<div class="layout">` with an optional `<div class="navwrap">` sidebar and a `<main>`, then `<footer class="page-footer">`.
5. **Title format:** `<title>Page Name | Library</title>`.
6. **Dark is the default theme;** light follows the visitor's system setting. Test a new page in both.
7. **Must work at phone width** (layout collapses under 820px) with no horizontal page scroll.
8. **File names are lowercase-with-dashes** (`my-page.html`); the file name is the page's URL.
9. **No external fonts, scripts or trackers.** Links to other sites are fine.
10. **Code rules:** every JS function has a comment (what, why, params, returns); every file starts with a header comment naming its single purpose.

## New page checklist

1. Copy the shell from the smallest existing page (`dns-mindmap.html`) and change the title, header and content.
2. Reuse existing components (`.card`, `.grid`, `.list`, `.chip`, `.notebox`, `.codeblock`, `.branch`).
3. If a component is missing, add it to `css/components.css` first.
4. Add `js/pages/<page-name>.js` (and `js/data/<page-name>.js`) only if the page needs behaviour.
5. Add the page to the table in `README.md`, and add a redirect stub to the `fmfalgun.github.io` repo.
