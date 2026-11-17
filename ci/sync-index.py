#!/usr/bin/env python3
"""File purpose: keep library.json (the page index) and the generated README
blocks (page table, page rules) in step with their sources.

Direction of data: pages/*.html -> library.json -> README.md, and
docs/PAGE_RULES.md -> README.md. The README is only ever an output; this
script never reads it for data and a hand edit inside its markers is
overwritten on the next run.

Run from the repo root: python3 ci/sync-index.py
Exit codes: 0 ok (files may have been rewritten), 1 the index lists a page
whose file is missing (remove that entry by hand).
"""
import html
import json
import re
import sys
from pathlib import Path

PAGES_DIR = Path("pages")
INDEX_FILE = Path("library.json")
README_FILE = Path("README.md")
RULES_FILE = Path("docs/PAGE_RULES.md")
TABLE_START = "<!-- pages:start (generated from library.json by ci/sync-index.py; do not edit) -->"
TABLE_END = "<!-- pages:end -->"
RULES_START = "<!-- rules:start (generated from docs/PAGE_RULES.md by ci/sync-index.py; do not edit) -->"
RULES_END = "<!-- rules:end -->"


def read_page_meta(path):
    """Return {"title", "description"} read from a page's <title> and
    <meta name="description">. The " | Library" title suffix is dropped
    because the index shows plain page names. Missing values become ""."""
    text = path.read_text(encoding="utf-8")
    title = re.search(r"<title>(.*?)</title>", text, re.S | re.I)
    desc = re.search(r'<meta\s+name="description"\s+content="(.*?)"', text, re.S | re.I)
    clean_title = html.unescape(title.group(1)).replace(" | Library", "").strip() if title else path.stem
    return {"title": clean_title, "description": html.unescape(desc.group(1)).strip() if desc else ""}


def load_index():
    """Return the parsed library.json, or an empty index if the file is absent."""
    if not INDEX_FILE.exists():
        return {"pages": []}
    return json.loads(INDEX_FILE.read_text(encoding="utf-8"))


def append_new_pages(index):
    """Append an entry for every pages/*.html that the index does not list yet.
    Existing entries are never changed (tags and wording are hand-tuned).
    Returns the list of file names that were added, in the order added."""
    known = {entry["file"] for entry in index["pages"]}
    added = []
    for path in sorted(PAGES_DIR.glob("*.html")):
        if path.name in known:
            continue
        meta = read_page_meta(path)
        index["pages"].append({"file": path.name, "title": meta["title"], "description": meta["description"], "tags": []})
        added.append(path.name)
    return added


def find_missing_pages(index):
    """Return the file names listed in the index that do not exist in pages/."""
    return [entry["file"] for entry in index["pages"] if not (PAGES_DIR / entry["file"]).exists()]


def build_table(index):
    """Return the README page table (Markdown) for the index entries."""
    lines = ["| Page | Topic |", "|------|-------|"]
    for entry in index["pages"]:
        lines.append("| [`%s`](pages/%s) | %s |" % (entry["file"], entry["file"], entry["description"]))
    return "\n".join(lines)


def build_rules_list():
    """Return the R<n> rule lines of docs/PAGE_RULES.md, ready for the README."""
    lines = RULES_FILE.read_text(encoding="utf-8").splitlines()
    return "\n".join(line for line in lines if re.match(r"^- \*\*R\d+ ", line))


def replace_block(text, start, end, body):
    """Return text with everything between the start and end markers replaced
    by body, or None when a marker is missing."""
    pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    if not pattern.search(text):
        return None
    return pattern.sub(lambda _: start + "\n" + body + "\n" + end, text)


def write_readme(index):
    """Regenerate the page table and the rules list in README.md.
    Returns False (and writes nothing) when a marker is missing."""
    text = README_FILE.read_text(encoding="utf-8")
    text = replace_block(text, TABLE_START, TABLE_END, build_table(index))
    text = replace_block(text, RULES_START, RULES_END, build_rules_list()) if text else None
    if text is None:
        print("sync-index: README.md is missing a pages:/rules: start or end marker", file=sys.stderr)
        return False
    README_FILE.write_text(text, encoding="utf-8")
    return True


def main():
    """Sync the index and the README table. Returns the process exit code."""
    index = load_index()
    missing = find_missing_pages(index)
    if missing:
        print("sync-index: library.json lists missing page(s): " + ", ".join(missing), file=sys.stderr)
        return 1
    added = append_new_pages(index)
    INDEX_FILE.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if added:
        print("sync-index: added to library.json: " + ", ".join(added))
    return 0 if write_readme(index) else 1


if __name__ == "__main__":
    sys.exit(main())
