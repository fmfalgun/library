# library

A small collection of standalone, single-file HTML reference pages on security and Linux topics. Each page is self-contained (shared CSS and JavaScript, no build step). `index.html` is a shell that frames any page with the portfolio's header, nav bar and footer; GitHub Pages serves it. Tool details shown on the VAPT page are fetched from the [library-data](https://github.com/fmfalgun/library-data) repo.

## Pages

<!-- pages:start (generated from library.json by ci/sync-index.py; do not edit) -->
| Page | Topic |
|------|-------|
| [`dns-mindmap.html`](pages/dns-mindmap.html) | Eight branches covering how DNS works, who plays which role, and how to test any server's claims. |
| [`linux-directory-guide.html`](pages/linux-directory-guide.html) | What lives where in a Linux filesystem, section by section, with search. |
| [`vapt-toolkit.html`](pages/vapt-toolkit.html) | Tools for every phase of a vulnerability assessment and penetration test, with filters and comparison views. |
<!-- pages:end -->

The list above is generated from `library.json`, the index of pages.

Open a page at `https://fmfalgun.github.io/library/?page=<page-name>` (page name = file name without `.html`). The portfolio lists them at `https://fmfalgun.github.io/library.html`.

## Page rules

Every page must follow these rules; `ci/check-pages.py` checks them on every commit, so a page that breaks one cannot be committed. Full text and the new-page checklist: [`docs/PAGE_RULES.md`](docs/PAGE_RULES.md).

<!-- rules:start (generated from docs/PAGE_RULES.md by ci/sync-index.py; do not edit) -->
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
<!-- rules:end -->

## Directory structure

```
library/
├── README.md        repo details and structure
├── index.html       shell: portfolio header, nav and footer around the chosen page
├── 404.html         not-found page; sends old /library/<name>.html links to the shell
├── library.json     index of pages (read by the shell and the portfolio)
├── .gitignore       keeps keys, env files and local tool dirs out of git
├── pages/           the HTML pages, with the css/ and js/ they share
│   ├── css/         tokens, page shell and components
│   └── js/          core.js, plus per-page scripts (pages/) and data (data/)
├── shell/           styles and scripts for index.html and 404.html
├── docs/            PAGE_RULES.md, the rules every page must follow
└── ci/              check-pages.py (enforces the rules), sync-index.py, pre-commit hook
    └── hooks/       pre-commit (blocks secrets and rule breaks, refreshes the index)
```
