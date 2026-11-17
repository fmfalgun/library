/**
 * legacy-redirect.js
 * Used by 404.html. Before the pages moved into pages/, they lived at
 * /library/<name>.html. This sends such an old link to the shell
 * (/library/?page=<name>). Any other missing path just shows the 404 message.
 */

const OLD_PAGE_PATH = /^\/library\/([a-z0-9-]+)\.html$/;

/**
 * Return the page name from an old-style path, or null if the path is not one.
 */
function legacyName(path) {
  const match = OLD_PAGE_PATH.exec(path);
  return match ? match[1] : null;
}

const name = legacyName(location.pathname);
if (name) location.replace(`/library/?page=${name}`);
