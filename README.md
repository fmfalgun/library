# library

A small collection of standalone, single-file HTML reference pages on security and Linux topics. Each page is self-contained (shared CSS and JavaScript, no build step). `index.html` is a shell that frames any page with the portfolio's header, nav bar and footer; GitHub Pages serves it.

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
├── docs/            STYLE_GUIDE.md, the rules every page follows
└── ci/              sync-index.py and the pre-commit hook
    └── hooks/       pre-commit (blocks secrets, refreshes the index)
```
