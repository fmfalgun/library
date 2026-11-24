# Library page rules

Every HTML page in this repo must follow these rules, so all pages look and behave the same. Rules R1-R10 are checked by `ci/check-pages.py` on every commit (pre-commit hook); a page that breaks one cannot be committed. The README's rule list is generated from the `R<n>` lines below by `ci/sync-index.py`; edit the rules here, never in the README.

## Rules (checked automatically)

- **R1 Location and name.** Pages live directly in `pages/`, named lowercase-with-dashes (`my-page.html`; the name is the page's URL). The only other HTML files in the repo are the shell's `index.html` and `404.html`.
- **R2 Head.** `<!DOCTYPE html>`, `<html lang>`, UTF-8 charset, viewport meta, `<title>Page Name | Library</title>`, and a one-sentence `<meta name="description">` (the index entry is created from it).
- **R3 Shared CSS only.** The page links `css/tokens.css`, `css/base.css` and `css/components.css`, in that order, and no other `<link>`. No `<style>` tag, no `style=""` attribute.
- **R4 Shared JS only.** The page has exactly one script, `<script src="js/core.js" defer>`. No inline code, no inline handlers (`onclick=` and the like), no `javascript:` links.
- **R5 Page wiring.** `<body data-page="<file name without .html>">`. `js/pages/<name>.js` must exist; `data-has-data` is set if and only if `js/data/<name>.js` exists. `core.js` loads those files.
- **R6 Same skeleton.** `<header class="page-header">` with an `<h1>` holding one `<span>` accent word and a `<p class="sub">`; then `<div class="layout">` containing a `<main>` (and optionally a sidebar `<div class="navwrap">`); then `<footer class="page-footer">`.
- **R7 Nothing external.** No `http(s)://` or `//` in any `src`, `href` (except plain `<a>` links) or `action`. No `<iframe>`, `<object>`, `<embed>`, `<form>` or `<base>`. Fonts are loaded once, from `tokens.css`.
- **R8 Only existing classes.** Every `class` used in the HTML is defined in `pages/css/`; `data-c` is 1 to 7. A new look is a new component in `components.css`, added first.
- **R9 No extra files.** `pages/css/` holds only the three shared stylesheets. `pages/js/` holds only `core.js`, `pages/<name>.js` and `data/<name>.js`, each belonging to an existing page.
- **R10 Documented code.** Every JS file starts with a header comment naming its single purpose (`/*` or `/**` on the first line).

## Design guidance (not machine-checked)

- Dark is the default theme; light follows the visitor's system setting. Test a new page in both.
- Must work at phone width (layout collapses under 820px) with no horizontal page scroll.
- Look follows the portfolio: near-black olive surfaces, cream text, amber accent (`--accent`), Rajdhani headings, Inter body text, Share Tech Mono for labels; flat, square, outlined components in muted earth tones, and a khaki `[// LIBRARY]` label above each title. Colors, fonts, radii and widths come from `tokens.css`; never write a hex color outside that file.
- Page scripts may fetch JSON from `https://fmfalgun.github.io/` (for example tool and people records from the `library-data` repo) and nothing else; show the page without that data if the fetch fails. One exception: `gate.html` loads the pinned KaTeX 0.16.11 stylesheet and script from cdn.jsdelivr.net (with integrity hashes) to render math, and fetches topic Markdown from `fmfalgun.github.io/gate-library/`; if KaTeX fails to load the TeX is shown as plain code.
- Every JS function has a comment (what, why, params, returns).

## New page checklist

1. Copy the smallest existing page (`pages/dns-mindmap.html`) and change the title, description, header and content.
2. Reuse existing components (`.card`, `.grid`, `.list`, `.chip`, `.notebox`, `.codeblock`, `data-c` colored sections). If one is missing, add it to `pages/css/components.css` first.
3. Add `pages/js/pages/<name>.js` (and `pages/js/data/<name>.js` if the page has data).
4. Run `python3 ci/check-pages.py`.
5. Commit. The pre-commit hook runs the check, then `ci/sync-index.py`, which appends the page to `library.json` and regenerates the README tables. Never edit those README blocks by hand; edit `library.json` (tags, wording) instead.
6. Optional: add a redirect stub to the `fmfalgun.github.io` repo for a short URL like `fmfalgun.github.io/<name>.html`.
