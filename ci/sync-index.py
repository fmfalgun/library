#!/usr/bin/env python3
"""File purpose: keep library.json (the page index) and the README page table
in step with the files in pages/.

Direction of data: pages/*.html -> library.json -> README.md. The README is
only ever an output; this script never reads it for page data and a hand edit
inside its markers is overwritten on the next run.

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
TABLE_START = "<!-- pages:start (generated from library.json by ci/sync-index.py; do not edit) -->"
TABLE_END = "<!-- pages:end -->"


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


def write_readme_table(index):
    """Replace the text between the table markers in README.md with a fresh
    table. Returns False (and writes nothing) when a marker is missing."""
    text = README_FILE.read_text(encoding="utf-8")
    pattern = re.compile(re.escape(TABLE_START) + r".*?" + re.escape(TABLE_END), re.S)
    if not pattern.search(text):
        print("sync-index: README.md has no pages:start / pages:end markers", file=sys.stderr)
        return False
    block = TABLE_START + "\n" + build_table(index) + "\n" + TABLE_END
    README_FILE.write_text(pattern.sub(lambda _: block, text), encoding="utf-8")
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
    return 0 if write_readme_table(index) else 1


if __name__ == "__main__":
    sys.exit(main())
