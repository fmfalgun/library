# library

A small collection of standalone, single-file HTML reference pages on security and Linux topics. Each page is self-contained (inline CSS and JavaScript, no build step) and is published with GitHub Pages.

## Pages

| Page | Topic |
|------|-------|
| `dns-mindmap.html` | Mind map of DNS concepts |
| `linux-directory-guide.html` | Guide to what lives where in the Linux directory tree |
| `vapt-toolkit.html` | VAPT toolkit: tools for every phase of a vulnerability assessment and penetration test |

Listed in the Library section of the portfolio at `https://fmfalgun.github.io/library.html`, and live at `https://fmfalgun.github.io/<page-name>` (for example `https://fmfalgun.github.io/dns-mindmap.html`), served through the portfolio site, which redirects to this repo's Pages site at `https://fmfalgun.github.io/library/<page-name>`.

## Directory structure

```
library/
├── README.md                    repo details and structure
├── library.json                 page list read by the portfolio's Library section
├── .gitignore                   keeps keys, env files and local tool dirs out of git
├── dns-mindmap.html             DNS mind map page (markup only)
├── linux-directory-guide.html   Linux directory guide page (markup only)
├── vapt-toolkit.html            VAPT toolkit page (markup only)
├── css/
│   ├── tokens.css               colors, fonts, sizes, dark/light themes
│   ├── base.css                 page shell: header, layout, sidebar, footer
│   └── components.css           cards, chips, lists, tables, mind-map branches
├── js/
│   ├── core.js                  shared helpers; loads each page's data and script
│   ├── data/                    one data file per page that needs data
│   │   ├── linux-directory-guide.js
│   │   └── vapt-toolkit.js
│   └── pages/                   one behaviour script per page
│       ├── dns-mindmap.js
│       ├── linux-directory-guide.js
│       └── vapt-toolkit.js
├── docs/
│   └── STYLE_GUIDE.md           rules every page follows
└── ci/
    └── hooks/
        └── pre-commit           blocks commits that stage keys or secrets
                                 (enable: git config core.hooksPath ci/hooks)
```
