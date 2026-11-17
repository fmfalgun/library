#!/usr/bin/env python3
"""File purpose: enforce docs/PAGE_RULES.md (rules R1-R10) on every HTML page
and its supporting files, so all pages use only the shared CSS and JS.

Run from the repo root: python3 ci/check-pages.py
Exit codes: 0 all rules pass, 1 at least one violation (each is printed as
"<file>:<line>: [R<n>] message").
"""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

PAGES = Path("pages")
SHARED_CSS = ["css/tokens.css", "css/base.css", "css/components.css"]
ROOT_HTML = {"index.html", "404.html"}
NAME_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*\.html$")
VOID_TAGS = {"meta", "link", "br", "hr", "img", "input", "source", "base", "area", "col", "embed", "wbr"}
FORBIDDEN_TAGS = {"iframe", "object", "embed", "form", "base"}
URL_ATTRS = {"link": "href", "script": "src", "img": "src", "source": "src", "video": "src", "audio": "src"}


class PageScanner(HTMLParser):
    """Records every element of one HTML page (tag, attributes, line and the
    ancestor classes) plus the doctype and the title text, so the rule checks
    can work on plain data instead of parsing again."""

    def __init__(self):
        """Start with empty records and an empty ancestor stack."""
        super().__init__()
        self.elements = []
        self.doctype = ""
        self.title = ""
        self._stack = []
        self._in_title = False

    def handle_decl(self, decl):
        """Remember the doctype declaration text."""
        self.doctype = decl.strip().lower()

    def handle_starttag(self, tag, attrs):
        """Record the element with its attributes and ancestor classes."""
        attr_map = dict(attrs)
        ancestors = [c for _, classes in self._stack for c in classes]
        self.elements.append({"tag": tag, "attrs": attr_map, "line": self.getpos()[0], "ancestors": ancestors})
        self._in_title = tag == "title"
        if tag not in VOID_TAGS:
            self._stack.append((tag, (attr_map.get("class") or "").split()))

    def handle_endtag(self, tag):
        """Pop the ancestor stack back to the element being closed."""
        self._in_title = False
        for index in range(len(self._stack) - 1, -1, -1):
            if self._stack[index][0] == tag:
                del self._stack[index:]
                return

    def handle_data(self, data):
        """Collect the text of the <title> element."""
        if self._in_title:
            self.title += data


def error(path, line, rule, message):
    """Return one formatted violation line."""
    return "%s:%s: [%s] %s" % (path, line, rule, message)


def find(scan, tag, **attrs):
    """Return the recorded elements with this tag whose attributes include attrs."""
    return [e for e in scan.elements if e["tag"] == tag and all(e["attrs"].get(k) == v for k, v in attrs.items())]


def css_classes():
    """Return the set of class names defined in the shared stylesheets
    (comments, strings and url() values are ignored so they add no names)."""
    names = set()
    for sheet in (PAGES / "css").glob("*.css"):
        text = re.sub(r"/\*.*?\*/|\"[^\"]*\"|'[^']*'|url\([^)]*\)", "", sheet.read_text(encoding="utf-8"), flags=re.S)
        names.update(re.findall(r"\.([A-Za-z_][\w-]*)", text))
    return names


def check_location(page):
    """R1: the page file name is lowercase-with-dashes."""
    if NAME_PATTERN.match(page.name):
        return []
    return [error(page, 1, "R1", "file name must be lowercase-with-dashes ending in .html")]


def check_head(page, scan):
    """R2: doctype, lang, charset, viewport, title suffix and description."""
    errors = []
    checks = [
        (scan.doctype == "doctype html", "missing <!DOCTYPE html>"),
        (any(e["attrs"].get("lang") for e in find(scan, "html")), "<html> needs a lang attribute"),
        (any((e["attrs"].get("charset") or "").lower() == "utf-8" for e in find(scan, "meta")), 'missing <meta charset="UTF-8">'),
        (bool(find(scan, "meta", name="viewport")), 'missing <meta name="viewport">'),
        (scan.title.strip().endswith(" | Library"), "<title> must be 'Page Name | Library'"),
        (any(e["attrs"].get("content", "").strip() for e in find(scan, "meta", name="description")), 'missing non-empty <meta name="description">'),
    ]
    for passed, message in checks:
        if not passed:
            errors.append(error(page, 1, "R2", message))
    return errors


def check_styles(page, scan):
    """R3: only the three shared stylesheets; no <style>, no style=""."""
    errors = []
    links = [e for e in scan.elements if e["tag"] == "link"]
    if [e["attrs"].get("href") for e in links] != SHARED_CSS:
        errors.append(error(page, 1, "R3", "link exactly %s, in that order, and no other <link>" % ", ".join(SHARED_CSS)))
    for element in scan.elements:
        if element["tag"] == "style" or "style" in element["attrs"]:
            errors.append(error(page, element["line"], "R3", "inline CSS (<style> or style=\"\") is not allowed"))
    return errors


def check_scripts(page, scan):
    """R4: exactly one script (js/core.js, deferred); no inline handlers."""
    errors = []
    scripts = [e for e in scan.elements if e["tag"] == "script"]
    if len(scripts) != 1 or scripts[0]["attrs"].get("src") != "js/core.js" or "defer" not in scripts[0]["attrs"]:
        errors.append(error(page, scripts[0]["line"] if scripts else 1, "R4", 'the only script must be <script src="js/core.js" defer>'))
    for element in scan.elements:
        handlers = [a for a in element["attrs"] if a.startswith("on")]
        if handlers or str(element["attrs"].get("href", "")).lower().startswith("javascript:"):
            errors.append(error(page, element["line"], "R4", "inline event handlers and javascript: links are not allowed"))
    return errors


def check_wiring(page, scan):
    """R5: data-page equals the file stem; page script exists; data-has-data
    matches whether a data file exists."""
    errors = []
    stem = page.stem
    body = find(scan, "body")
    attrs = body[0]["attrs"] if body else {}
    if attrs.get("data-page") != stem:
        errors.append(error(page, 1, "R5", '<body> needs data-page="%s"' % stem))
    if not (PAGES / "js" / "pages" / (stem + ".js")).exists():
        errors.append(error(page, 1, "R5", "missing pages/js/pages/%s.js" % stem))
    if ("data-has-data" in attrs) != (PAGES / "js" / "data" / (stem + ".js")).exists():
        errors.append(error(page, 1, "R5", "data-has-data must be set if and only if pages/js/data/%s.js exists" % stem))
    return errors


def check_skeleton(page, scan):
    """R6: header.page-header (h1 with one span, p.sub), div.layout > main, footer.page-footer."""
    errors = []
    h1s = [e for e in scan.elements if e["tag"] == "h1" and "page-header" in e["ancestors"]]
    spans = [e for e in scan.elements if e["tag"] == "span" and "page-header" in e["ancestors"] and e["line"] == (h1s[0]["line"] if h1s else -1)]
    checks = [
        (len(find(scan, "header", **{"class": "page-header"})) == 1, 'need one <header class="page-header">'),
        (len(h1s) == 1 and len(spans) == 1, "page-header needs one <h1> containing one <span> accent word"),
        (any("page-header" in e["ancestors"] for e in find(scan, "p", **{"class": "sub"})), 'page-header needs <p class="sub">'),
        (any("layout" in e["ancestors"] for e in find(scan, "main")), '<main> must be inside <div class="layout">'),
        (len(find(scan, "footer", **{"class": "page-footer"})) == 1, 'need one <footer class="page-footer">'),
    ]
    for passed, message in checks:
        if not passed:
            errors.append(error(page, 1, "R6", message))
    return errors


def check_external(page, scan):
    """R7: no external resources and no embedding tags."""
    errors = []
    for element in scan.elements:
        tag, attrs = element["tag"], element["attrs"]
        if tag in FORBIDDEN_TAGS:
            errors.append(error(page, element["line"], "R7", "<%s> is not allowed" % tag))
        value = str(attrs.get(URL_ATTRS.get(tag, ""), ""))
        if re.match(r"^(https?:)?//", value.strip().lower()):
            errors.append(error(page, element["line"], "R7", "external resource %s is not allowed" % value))
    return errors


def check_classes(page, scan, known):
    """R8: every class is defined in pages/css/, and data-c is 1 to 7."""
    errors = []
    for element in scan.elements:
        for name in (element["attrs"].get("class") or "").split():
            if name not in known:
                errors.append(error(page, element["line"], "R8", "class '%s' is not defined in pages/css/" % name))
        color = element["attrs"].get("data-c")
        if color is not None and color not in {"1", "2", "3", "4", "5", "6", "7"}:
            errors.append(error(page, element["line"], "R8", "data-c must be 1 to 7"))
    return errors


def check_page(page, known):
    """Run rules R1-R8 on one page and return all violations."""
    scan = PageScanner()
    scan.feed(page.read_text(encoding="utf-8"))
    return (check_location(page) + check_head(page, scan) + check_styles(page, scan) + check_scripts(page, scan)
            + check_wiring(page, scan) + check_skeleton(page, scan) + check_external(page, scan) + check_classes(page, scan, known))


def check_support_files(stems):
    """R9 and R10: only the shared CSS/JS files exist, every JS file belongs to
    an existing page, and every JS file starts with a header comment."""
    errors = []
    css_files = {p.name for p in (PAGES / "css").glob("*")}
    if css_files != {"tokens.css", "base.css", "components.css"}:
        errors.append(error("pages/css", 1, "R9", "must hold exactly tokens.css, base.css and components.css"))
    if {p.name for p in (PAGES / "js").glob("*") if p.is_file()} != {"core.js"}:
        errors.append(error("pages/js", 1, "R9", "must hold only core.js (page scripts go in pages/ and data/)"))
    for folder in ("pages", "data"):
        for script in sorted((PAGES / "js" / folder).glob("*")):
            if script.suffix != ".js" or script.stem not in stems:
                errors.append(error(script, 1, "R9", "must be <page-name>.js of an existing page"))
    for script in sorted((PAGES / "js").rglob("*.js")):
        if not script.read_text(encoding="utf-8").lstrip().startswith("/*"):
            errors.append(error(script, 1, "R10", "must start with a header comment"))
    return errors


def check_stray_html():
    """R1: no HTML files outside pages/ except the shell's index.html and 404.html."""
    errors = []
    for path in sorted(Path(".").rglob("*.html")):
        top = path.parts[0]
        if top in (".git", "pages"):
            continue
        if not (len(path.parts) == 1 and path.name in ROOT_HTML):
            errors.append(error(path, 1, "R1", "HTML pages belong in pages/"))
    for path in sorted(PAGES.rglob("*.html")):
        if path.parent != PAGES:
            errors.append(error(path, 1, "R1", "pages must sit directly in pages/, not in a subfolder"))
    return errors


def main():
    """Check every page and the support files. Returns the process exit code."""
    known = css_classes()
    pages = sorted(PAGES.glob("*.html"))
    errors = check_stray_html() + check_support_files({p.stem for p in pages})
    for page in pages:
        errors += check_page(page, known)
    for line in errors:
        print(line, file=sys.stderr)
    if errors:
        print("check-pages: %d violation(s); see docs/PAGE_RULES.md" % len(errors), file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
