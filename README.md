# library

A small collection of standalone, single-file HTML reference pages on security and Linux topics. Each page is self-contained (inline CSS and JavaScript, no build step) and is published with GitHub Pages.

## Pages

| Page | Topic |
|------|-------|
| `dns-mindmap.html` | Mind map of DNS concepts |
| `linux-directory-guide.html` | Guide to what lives where in the Linux directory tree |
| `vapt-toolkit.html` | VAPT toolkit: tools for every phase of a vulnerability assessment and penetration test |

Live at `https://fmfalgun.github.io/<page-name>` (for example `https://fmfalgun.github.io/dns-mindmap.html`), served through the portfolio site, which redirects to this repo's Pages site at `https://fmfalgun.github.io/library/<page-name>`.

## Directory structure

```
library/
├── README.md                    repo details and structure
├── .gitignore                   keeps keys, env files and local tool dirs out of git
├── dns-mindmap.html             DNS mind map page
├── linux-directory-guide.html   Linux directory guide page
├── vapt-toolkit.html            VAPT toolkit page
└── ci/
    └── hooks/
        └── pre-commit           blocks commits that stage keys or secrets
                                 (enable: git config core.hooksPath ci/hooks)
```
